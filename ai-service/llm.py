"""Thin LLM provider adapter.

The rest of the service only knows about two things:
    client.generate_text(system, user, ...) -> LLMResult
    generate_structured(client, system, user, Schema) -> (validated_object, meta)

Only Gemini is implemented (REST via httpx, no SDK to keep deployment light), but
swapping providers means writing one new class with the same generate_text method.
"""
import json
import logging
import os
import re
import time
from dataclasses import dataclass
from typing import Callable, Optional, Tuple, Type, TypeVar

import httpx
from pydantic import BaseModel, ValidationError

log = logging.getLogger("placeit.llm")
T = TypeVar("T", bound=BaseModel)


def _is_gemini3(model: str) -> bool:
    """Gemini 3 and newer behave alike (no temperature setting, thinking on by default).
    The '-latest' aliases (gemini-flash-latest ...) point at the newest model, so treat them the same."""
    m = model or ""
    return m.startswith("gemini-3") or m.endswith("-latest")


def _thinking_config(model: str):
    """Thinking models spend hidden 'thinking' tokens before answering. For our simple
    extract/format tasks we keep that small so answers aren't cut off and cost stays low.
      - Gemini 2.5 Flash: thinkingBudget 0 (off)
      - Gemini 3.x:       thinkingLevel "low" ("minimal" is not accepted by 3.8)
    Override with LLM_THINKING = auto (model default) | low | medium | high | <token budget>."""
    raw = os.getenv("LLM_THINKING", "").strip().lower()
    if raw == "auto":
        return None
    if raw.lstrip("-").isdigit():
        return {"thinkingBudget": int(raw)}
    if raw in ("low", "medium", "high"):
        return {"thinkingLevel": raw}
    m = model or ""
    if "gemini-2.5-flash" in m:
        return {"thinkingBudget": 0}
    if _is_gemini3(m):
        return {"thinkingLevel": "low"}
    return None


def _safe_detail(resp, api_key: str) -> str:
    """Provider's own error message (e.g. 'model not found'), key scrubbed, for OUR logs only."""
    try:
        msg = resp.json().get("error", {}).get("message", "") or resp.text
    except Exception:
        msg = resp.text
    return (msg or "")[:300].replace(api_key, "***")


class LLMError(Exception):
    """Raised for any provider problem. `status` is the HTTP status we return upstream."""

    def __init__(self, public_message: str, status: int = 503, fallback_ok: bool = False):
        super().__init__(public_message)
        self.public_message = public_message
        self.status = status
        # True when trying a DIFFERENT model might work (overload, rate limit, retired model).
        # False for problems another model can't fix (bad key, bad request).
        self.fallback_ok = fallback_ok


@dataclass
class LLMResult:
    text: str
    prompt_tokens: Optional[int] = None
    output_tokens: Optional[int] = None


class GeminiClient:
    BASE = "https://generativelanguage.googleapis.com/v1beta"

    def __init__(self, api_key: str, model: str, timeout: float = 30.0, fallbacks=None):
        self.api_key = api_key
        self.model = model                      # primary model
        self.models = [model] + [m for m in (fallbacks or []) if m and m != model]
        self.last_model_used = model            # which model actually answered (for logs/eval)
        self.timeout = timeout

    async def _post(self, url: str, body: dict) -> httpx.Response:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as http:
                # key goes in a header, never in the URL (URLs end up in logs)
                return await http.post(url, json=body, headers={"x-goog-api-key": self.api_key})
        except httpx.TimeoutException:
            raise LLMError("The AI provider timed out.", 504, fallback_ok=True)
        except httpx.HTTPError:
            raise LLMError("Could not reach the AI provider.", 503, fallback_ok=True)

    async def generate_text(
        self,
        system: str,
        user: str,
        *,
        temperature: float = 0.2,
        max_output_tokens: int = 2000,
        json_mode: bool = True,
    ) -> LLMResult:
        """Try the primary model, then each fallback, when the failure is the kind another
        model can fix (overloaded 503, rate limit 429, timeout, retired model 404)."""
        last_error = None
        for model in self.models:
            try:
                result = await self._generate_with(model, system, user, temperature, max_output_tokens, json_mode)
                self.last_model_used = model
                return result
            except LLMError as e:
                last_error = e
                if not e.fallback_ok:
                    raise  # bad key / bad request: another model won't help, don't hide it
                log.warning("Model %s failed (status %s); trying next model if any", model, e.status)
        raise last_error

    async def _generate_with(self, model: str, system: str, user: str,
                             temperature: float, max_output_tokens: int,
                             json_mode: bool = True) -> LLMResult:
        url = f"{self.BASE}/models/{model}:generateContent"
        config = {"maxOutputTokens": max_output_tokens}
        if json_mode:  # structured tasks need JSON; free-text chat does not
            config["responseMimeType"] = "application/json"
        if _is_gemini3(model):
            # Gemini 3 deprecates the temperature setting, and thinking tokens count
            # toward the output limit, so leave room for them.
            config["maxOutputTokens"] = max_output_tokens + 4096
        else:
            config["temperature"] = temperature
        thinking = _thinking_config(model)
        if thinking is not None:
            config["thinkingConfig"] = thinking
        body = {
            "system_instruction": {"parts": [{"text": system}]},
            "contents": [{"role": "user", "parts": [{"text": user}]}],
            "generationConfig": config,
        }

        resp = await self._post(url, body)
        if resp.status_code == 400:
            # A model that refuses one of the optional settings: drop it and retry once.
            detail = resp.text.lower()
            dropped = False
            if "thinking" in detail and config.pop("thinkingConfig", None) is not None:
                dropped = True
            if "temperature" in detail and config.pop("temperature", None) is not None:
                dropped = True
            if dropped:
                resp = await self._post(url, body)

        if resp.status_code == 429:
            raise LLMError("The AI provider is rate-limiting requests.", 429, fallback_ok=True)
        if resp.status_code >= 500:
            raise LLMError("The AI provider is temporarily unavailable.", 503, fallback_ok=True)
        if resp.status_code >= 400:
            # 400/401/403/404 = our config (bad key, wrong model). The user sees a generic
            # message; the real reason goes to the server log only.
            log.error("LLM provider rejected request: status=%s model=%s detail=%s",
                      resp.status_code, model, _safe_detail(resp, self.api_key))
            raise LLMError("The AI provider rejected the request.", 502, fallback_ok=(resp.status_code == 404))

        data = resp.json()
        try:
            parts = data["candidates"][0]["content"]["parts"]
            text = "".join(p.get("text", "") for p in parts)
        except (KeyError, IndexError, TypeError):
            raise LLMError("The AI provider returned no answer.", 502)  # e.g. safety block
        finish = data["candidates"][0].get("finishReason")
        if finish not in (None, "STOP"):
            log.warning("LLM finished early: finishReason=%s model=%s", finish, model)
        usage = data.get("usageMetadata", {})
        return LLMResult(text, usage.get("promptTokenCount"), usage.get("candidatesTokenCount"))


def get_llm_client() -> GeminiClient:
    """FastAPI dependency. Tests override this with a fake client."""
    provider = os.getenv("LLM_PROVIDER", "gemini").lower()
    api_key = os.getenv("LLM_API_KEY", "")
    if provider != "gemini":
        raise LLMError(f"Unsupported LLM_PROVIDER '{provider}'.", 503)
    if not api_key:
        raise LLMError("The AI assistant is not configured.", 503)
    fallbacks = [m.strip() for m in os.getenv("LLM_FALLBACK_MODELS", "").split(",") if m.strip()]
    return GeminiClient(api_key, os.getenv("LLM_MODEL", "gemini-3.8-flash"),
                        float(os.getenv("LLM_TIMEOUT_SECONDS", "30")), fallbacks)


_FENCE = re.compile(r"^```(?:json)?\s*|\s*```$", re.I)


async def generate_structured(
    client,
    system: str,
    user: str,
    schema: Type[T],
    *,
    post_validate: Optional[Callable[[T], None]] = None,
    max_attempts: int = 2,
    temperature: float = 0.2,
    max_output_tokens: int = 2000,
) -> Tuple[T, dict]:
    """Call the model and insist on JSON matching `schema`.

    Never trust model output: parse it, validate it against the Pydantic schema,
    run any extra business checks (post_validate raises ValueError), and retry
    once with the error message if it fails.
    """
    started = time.perf_counter()
    prompt_tokens = output_tokens = 0
    prompt = user
    last_error = "unknown"

    for _ in range(max_attempts):
        result = await client.generate_text(
            system, prompt, temperature=temperature, max_output_tokens=max_output_tokens
        )
        prompt_tokens += result.prompt_tokens or 0
        output_tokens += result.output_tokens or 0
        try:
            raw = _FENCE.sub("", result.text.strip())
            obj = schema.model_validate(json.loads(raw))
            if post_validate:
                post_validate(obj)
            meta = {
                "latencyMs": int((time.perf_counter() - started) * 1000),
                "model": getattr(client, "last_model_used", getattr(client, "model", "unknown")),
                "promptTokens": prompt_tokens,
                "outputTokens": output_tokens,
            }
            return obj, meta
        except (json.JSONDecodeError, ValidationError, ValueError) as e:
            last_error = str(e)[:300]
            prompt = (
                f"{user}\n\nYour previous reply was rejected: {last_error}\n"
                "Reply again with ONLY valid JSON in the required shape."
            )

    log.warning("LLM output failed validation after %d attempts: %s", max_attempts, last_error)
    raise LLMError("The AI returned an invalid answer. Please try again.", 502)
