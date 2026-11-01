"""Tests the real GeminiClient against a mocked HTTP transport (no network)."""
import asyncio
import json

import httpx
import pytest

import llm
from llm import GeminiClient, LLMError

REAL_CLIENT = httpx.AsyncClient


def install(monkeypatch, handler):
    transport = httpx.MockTransport(handler)
    monkeypatch.setattr(llm.httpx, "AsyncClient",
                        lambda **kw: REAL_CLIENT(transport=transport, **kw))


def call(client=None):
    client = client or GeminiClient("KEY123", "test-model")
    return asyncio.run(client.generate_text("sys prompt", "user prompt"))


def test_request_shape_and_response_parsing(monkeypatch):
    seen = {}

    def handler(request: httpx.Request):
        seen["url"] = str(request.url)
        seen["key_header"] = request.headers.get("x-goog-api-key")
        seen["body"] = json.loads(request.content)
        return httpx.Response(200, json={
            "candidates": [{"content": {"parts": [{"text": '{"a":'}, {"text": "1}"}]}}],
            "usageMetadata": {"promptTokenCount": 11, "candidatesTokenCount": 7},
        })

    install(monkeypatch, handler)
    res = call()
    assert res.text == '{"a":1}' and res.prompt_tokens == 11 and res.output_tokens == 7
    assert seen["url"].endswith("/models/test-model:generateContent")
    assert "KEY123" not in seen["url"] and seen["key_header"] == "KEY123"   # key only in header
    assert seen["body"]["system_instruction"]["parts"][0]["text"] == "sys prompt"
    assert seen["body"]["generationConfig"]["responseMimeType"] == "application/json"


@pytest.mark.parametrize("status,expected", [(429, 429), (500, 503), (503, 503), (400, 502), (403, 502)])
def test_http_errors_map_to_clean_statuses(monkeypatch, status, expected):
    install(monkeypatch, lambda r: httpx.Response(status, text="provider detail with KEY123"))
    with pytest.raises(LLMError) as e:
        call()
    assert e.value.status == expected
    assert "KEY123" not in e.value.public_message and "provider detail" not in e.value.public_message


def test_blocked_or_empty_response_is_502(monkeypatch):
    install(monkeypatch, lambda r: httpx.Response(200, json={"promptFeedback": {"blockReason": "SAFETY"}}))
    with pytest.raises(LLMError) as e:
        call()
    assert e.value.status == 502


def test_timeout_is_504(monkeypatch):
    def handler(request):
        raise httpx.ReadTimeout("slow", request=request)

    install(monkeypatch, handler)
    with pytest.raises(LLMError) as e:
        call()
    assert e.value.status == 504


def test_get_llm_client_config(monkeypatch):
    monkeypatch.delenv("LLM_API_KEY", raising=False)
    with pytest.raises(LLMError):
        llm.get_llm_client()
    monkeypatch.setenv("LLM_API_KEY", "k")
    monkeypatch.setenv("LLM_MODEL", "m1")
    assert llm.get_llm_client().model == "m1"
    monkeypatch.setenv("LLM_PROVIDER", "other")
    with pytest.raises(LLMError):
        llm.get_llm_client()


def _ok(request):
    return httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": "{}"}]}}]})


def test_gemini25_flash_thinking_off_and_retry_without_if_rejected(monkeypatch):
    bodies = []

    def handler(request):
        body = json.loads(request.content)
        bodies.append(body)
        if "thinkingConfig" in body["generationConfig"]:
            return httpx.Response(400, json={"error": {"message": "thinking config not supported"}})
        return _ok(request)

    install(monkeypatch, handler)
    monkeypatch.delenv("LLM_THINKING", raising=False)
    assert call(GeminiClient("K", "gemini-2.5-flash")).text == "{}"
    assert bodies[0]["generationConfig"]["thinkingConfig"] == {"thinkingBudget": 0}
    assert "thinkingConfig" not in bodies[1]["generationConfig"]


def test_gemini3_request_has_no_temperature_low_thinking_and_token_headroom(monkeypatch):
    seen = {}

    def handler(request):
        seen.update(json.loads(request.content)["generationConfig"])
        return _ok(request)

    install(monkeypatch, handler)
    monkeypatch.delenv("LLM_THINKING", raising=False)
    asyncio.run(GeminiClient("K", "gemini-3.8-flash").generate_text("s", "u", max_output_tokens=1500))
    assert "temperature" not in seen
    assert seen["thinkingConfig"] == {"thinkingLevel": "low"}
    assert seen["maxOutputTokens"] == 1500 + 4096


def test_rejected_temperature_is_dropped_and_retried(monkeypatch):
    calls = []

    def handler(request):
        cfg = json.loads(request.content)["generationConfig"]
        calls.append(dict(cfg))
        if "temperature" in cfg:
            return httpx.Response(400, json={"error": {"message": "temperature is not supported"}})
        return _ok(request)

    install(monkeypatch, handler)
    assert call(GeminiClient("K", "some-older-model")).text == "{}"
    assert len(calls) == 2 and "temperature" not in calls[1]


def test_thinking_env_override(monkeypatch):
    monkeypatch.setenv("LLM_THINKING", "auto")
    assert llm._thinking_config("gemini-3.8-flash") is None
    monkeypatch.setenv("LLM_THINKING", "medium")
    assert llm._thinking_config("gemini-3.8-flash") == {"thinkingLevel": "medium"}
    monkeypatch.setenv("LLM_THINKING", "256")
    assert llm._thinking_config("anything") == {"thinkingBudget": 256}
    monkeypatch.delenv("LLM_THINKING")
    assert llm._thinking_config("gemini-2.5-pro") is None


def test_provider_reason_is_logged_without_the_key(monkeypatch, caplog):
    install(monkeypatch, lambda r: httpx.Response(404, json={"error": {"message": "models/x not found. key=KEY123"}}))
    with caplog.at_level("ERROR", logger="placeit.llm"):
        with pytest.raises(LLMError):
            call()
    assert "not found" in caplog.text and "KEY123" not in caplog.text


# ── fallback models ───────────────────────────────────────────────────────────
def _by_model(monkeypatch, responses):
    """responses: {model_name: status or 'ok'}. Records which models were called."""
    called = []

    def handler(request):
        model = str(request.url).split("/models/")[1].split(":")[0]
        called.append(model)
        r = responses[model]
        if r == "ok":
            return _ok(request)
        return httpx.Response(r, json={"error": {"message": "x"}})

    install(monkeypatch, handler)
    return called


@pytest.mark.parametrize("bad", [503, 429, 404])
def test_falls_back_to_next_model_when_primary_is_unavailable(monkeypatch, bad):
    called = _by_model(monkeypatch, {"primary": bad, "backup": "ok"})
    client = GeminiClient("K", "primary", fallbacks=["backup"])
    assert call(client).text == "{}"
    assert called == ["primary", "backup"] and client.last_model_used == "backup"


@pytest.mark.parametrize("bad", [400, 401, 403])
def test_no_fallback_for_key_or_request_problems(monkeypatch, bad):
    called = _by_model(monkeypatch, {"primary": bad, "backup": "ok"})
    with pytest.raises(LLMError) as e:
        call(GeminiClient("K", "primary", fallbacks=["backup"]))
    assert called == ["primary"] and e.value.status == 502      # didn't mask a bad key


def test_all_models_failing_raises_last_error(monkeypatch):
    called = _by_model(monkeypatch, {"a": 503, "b": 429})
    with pytest.raises(LLMError) as e:
        call(GeminiClient("K", "a", fallbacks=["b"]))
    assert called == ["a", "b"] and e.value.status == 429


def test_fallbacks_come_from_env_and_dedupe(monkeypatch):
    monkeypatch.setenv("LLM_API_KEY", "k")
    monkeypatch.setenv("LLM_MODEL", "m1")
    monkeypatch.setenv("LLM_FALLBACK_MODELS", " m2, m1 ,m3,")
    assert llm.get_llm_client().models == ["m1", "m2", "m3"]


def test_latest_aliases_are_treated_like_gemini3(monkeypatch):
    seen = {}

    def handler(request):
        seen.update(json.loads(request.content)["generationConfig"])
        return _ok(request)

    install(monkeypatch, handler)
    monkeypatch.delenv("LLM_THINKING", raising=False)
    asyncio.run(GeminiClient("K", "gemini-flash-latest").generate_text("s", "u", max_output_tokens=1000))
    assert "temperature" not in seen and seen["thinkingConfig"] == {"thinkingLevel": "low"}
    assert seen["maxOutputTokens"] == 1000 + 4096


def test_plain_text_mode_does_not_force_json(monkeypatch):
    seen = {}

    def handler(request):
        seen.update(json.loads(request.content)["generationConfig"])
        return _ok(request)

    install(monkeypatch, handler)
    asyncio.run(GeminiClient("K", "gemini-3.8-flash").generate_text("s", "u", json_mode=False))
    assert "responseMimeType" not in seen
    asyncio.run(GeminiClient("K", "gemini-3.8-flash").generate_text("s", "u"))
    assert seen["responseMimeType"] == "application/json"    # structured features unchanged
