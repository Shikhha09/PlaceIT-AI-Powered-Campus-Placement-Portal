"""Security helpers for the AI service.

1. verify_internal_key  - only our Express backend may call this service.
2. assert_allowed_file_url - stops /parse-resume being used as an SSRF proxy.
3. clean_untrusted_text / detect_injection - hygiene for resume and job text
   before it goes anywhere near an LLM prompt.
"""
import hmac
import os
import re
import unicodedata
from typing import List, Optional
from urllib.parse import urlparse

from fastapi import Header, HTTPException


def is_production() -> bool:
    return os.getenv("APP_ENV", "development").lower() == "production"


# ── 1. Service-to-service auth ────────────────────────────────────────────────
def verify_internal_key(x_internal_key: Optional[str] = Header(default=None)) -> None:
    expected = os.getenv("AI_SERVICE_API_KEY", "")
    if not expected:
        if is_production():
            # Fail closed: a production deploy without a key must not run open.
            raise HTTPException(status_code=503, detail="AI service is not configured.")
        return  # local development convenience
    if not x_internal_key or not hmac.compare_digest(x_internal_key.encode(), expected.encode()):
        raise HTTPException(status_code=401, detail="Invalid or missing service key.")


# ── 2. SSRF guard for resume downloads ────────────────────────────────────────
DEFAULT_ALLOWED_HOSTS = ["res.cloudinary.com", "*.supabase.co"]
LOCAL_HOSTS = {"localhost", "127.0.0.1"}


def _allowed_hosts() -> List[str]:
    extra = [h.strip().lower() for h in os.getenv("ALLOWED_FILE_HOSTS", "").split(",") if h.strip()]
    return DEFAULT_ALLOWED_HOSTS + extra


def _host_matches(host: str, pattern: str) -> bool:
    if pattern.startswith("*."):
        return host.endswith(pattern[1:])  # "*.supabase.co" -> ".supabase.co"
    return host == pattern


def assert_allowed_file_url(url: str) -> None:
    parsed = urlparse(url or "")
    host = (parsed.hostname or "").lower()
    if parsed.scheme not in ("http", "https") or not host:
        raise HTTPException(status_code=400, detail="Invalid file URL.")
    # Local uploads (dev only): the backend serves resumes from localhost.
    if not is_production() and host in LOCAL_HOSTS:
        return
    if parsed.scheme != "https":
        raise HTTPException(status_code=400, detail="File URL must use https.")
    if not any(_host_matches(host, p) for p in _allowed_hosts()):
        raise HTTPException(status_code=400, detail="File host is not allowed.")


# ── 3. Untrusted-text hygiene ─────────────────────────────────────────────────
_INVISIBLE = dict.fromkeys(map(ord, "\u200b\u200c\u200d\u2060\ufeff\u00ad"), None)
# Tags we use to fence untrusted data. If the data contains them, strip them so
# the data cannot "close" its own block and start writing instructions.
_FENCE_TAGS = re.compile(r"<\s*/?\s*(resume|resume_excerpt|job|student|vocabulary|data|platform_data|conversation_so_far|student_message)\b[^>]*>", re.I)

INJECTION_PATTERNS = [
    r"ignore\s+(all\s+|any\s+|the\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?)",
    r"disregard\s+(all\s+|the\s+)?(previous|prior|system|above)",
    r"forget\s+(all\s+|your\s+)?(previous|prior)?\s*instructions?",
    r"(reveal|print|show|repeat)\s+(your\s+|the\s+)?(system\s+)?(prompt|instructions|api\s*key)",
    r"rank\s+(me|this\s+candidate)\s+(as\s+)?(#?1|first|highest|top)",
    r"(^|\n)\s*(system|assistant)\s*:",
    r"you\s+are\s+now\s+(a|an|the)\b",
]
_INJECTION_RE = [re.compile(p, re.I) for p in INJECTION_PATTERNS]


def clean_untrusted_text(text: str, max_chars: int) -> str:
    text = unicodedata.normalize("NFKC", text or "")
    text = text.translate(_INVISIBLE)
    # drop control characters but keep newlines/tabs
    text = "".join(ch for ch in text if ch in "\n\t" or unicodedata.category(ch)[0] != "C")
    text = _FENCE_TAGS.sub(" ", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()[:max_chars]


def detect_injection(text: str) -> List[str]:
    """Heuristic flag only - we never rely on this to be safe, it's for logging."""
    return ["possible_prompt_injection"] if any(r.search(text or "") for r in _INJECTION_RE) else []


_URL_RE = re.compile(r"https?://\S+|www\.\S+", re.I)


def strip_urls(text: str) -> str:
    """Model output should never carry links (an injected prompt could plant phishing URLs)."""
    return _URL_RE.sub("[link removed]", text or "")
