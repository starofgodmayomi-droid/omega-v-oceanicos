"""Bounded Google Gemini image generation adapter for the IMAGIN command.

This module uses only the Python standard library. It does not call a provider
until generate_image() is invoked with an explicit API key and valid prompt.
"""

from __future__ import annotations

import base64
import binascii
import hashlib
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Callable
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions"
DEFAULT_IMAGE_MODEL = "gemini-nano-banana-2.1"
SUPPORTED_IMAGE_MODELS = frozenset({
    "gemini-nano-banana-2.1",
    "gemini-3.1-flash-lite-image",
    "gemini-3.1-flash-image",
    "gemini-3-pro-image",
    "gemini-2.5-flash-image",
})
MAX_PROMPT_CHARS = 1500
MAX_IMAGE_BYTES = 8 * 1024 * 1024
MAX_PROVIDER_RESPONSE_BYTES = 12 * 1024 * 1024
REQUEST_TIMEOUT_SECONDS = 60

_IMAGE_SIGNATURES = {
    "image/png": lambda data: data.startswith(b"\x89PNG\r\n\x1a\n"),
    "image/jpeg": lambda data: data.startswith(b"\xff\xd8\xff"),
    "image/webp": lambda data: len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP",
}


class ImageProviderError(RuntimeError):
    """A sanitized provider failure with an explicit epistemic state."""

    def __init__(self, message: str, *, code: str, state: str) -> None:
        super().__init__(message)
        self.code = code
        self.state = state


@dataclass(frozen=True)
class GeneratedImage:
    data: bytes
    mime_type: str
    sha256: str
    model: str
    generated_at_utc: str
    provider_request_id: str | None


Opener = Callable[..., object]


def generate_image(
    prompt: str,
    api_key: str,
    model: str = DEFAULT_IMAGE_MODEL,
    *,
    opener: Opener | None = None,
) -> GeneratedImage:
    """Generate one image and return a validated in-memory artifact receipt.

    The caller supplies the secret explicitly. The key is sent only as the
    provider authentication header and is never included in exceptions/logs.
    """
    if not isinstance(prompt, str) or not prompt.strip():
        raise ImageProviderError("A non-empty image prompt is required.", code="prompt_empty", state="NOT_EXECUTED")
    normalized_prompt = prompt.strip()
    if len(normalized_prompt) > MAX_PROMPT_CHARS:
        raise ImageProviderError(
            f"Image prompts are limited to {MAX_PROMPT_CHARS} characters.",
            code="prompt_too_long",
            state="NOT_EXECUTED",
        )
    if not isinstance(api_key, str) or not api_key.strip():
        raise ImageProviderError("GEMINI_API_KEY is not configured.", code="missing_api_key", state="NOT_EXECUTED")
    if model not in SUPPORTED_IMAGE_MODELS:
        raise ImageProviderError("The configured image model is not allowlisted.", code="model_not_allowed", state="NOT_EXECUTED")

    payload = {
        "model": model,
        "input": [{"type": "text", "text": normalized_prompt}],
    }
    request = Request(
        ENDPOINT,
        data=json.dumps(payload, separators=(",", ":")).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": api_key.strip(),
        },
        method="POST",
    )
    open_request = opener or urlopen
    try:
        with open_request(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            raw = response.read(MAX_PROVIDER_RESPONSE_BYTES + 1)
    except HTTPError as exc:
        state = "NOT_EXECUTED" if exc.code in {400, 401, 403, 404, 429} else "UNKNOWN"
        code = "http_" + str(exc.code)
        if exc.code in {401, 403}:
            message = "The image provider rejected credentials or access."
        elif exc.code == 429:
            message = "The image provider rate limit or quota was reached."
        elif exc.code >= 500:
            message = "The image provider returned a server error; completion is uncertain."
        else:
            message = "The image provider rejected the request."
        raise ImageProviderError(message, code=code, state=state) from None
    except (TimeoutError, URLError, OSError):
        raise ImageProviderError(
            "The image provider connection failed or timed out; request completion is uncertain.",
            code="connection_unknown",
            state="UNKNOWN",
        ) from None

    if len(raw) > MAX_PROVIDER_RESPONSE_BYTES:
        raise ImageProviderError("The provider response exceeded the response-size bound.", code="response_too_large", state="DIVERGENT")
    try:
        response_payload = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        raise ImageProviderError("The provider returned invalid JSON.", code="invalid_json", state="DIVERGENT") from None

    output = response_payload.get("output_image") if isinstance(response_payload, dict) else None
    encoded = output.get("data") if isinstance(output, dict) else None
    mime_type = output.get("mime_type", "image/png") if isinstance(output, dict) else "image/png"
    if not isinstance(encoded, str) or not encoded:
        raise ImageProviderError("The provider response contained no image artifact.", code="image_missing", state="DIVERGENT")
    if mime_type not in _IMAGE_SIGNATURES:
        raise ImageProviderError("The provider returned an unsupported image MIME type.", code="mime_unsupported", state="DIVERGENT")
    if len(encoded) > ((MAX_IMAGE_BYTES + 2) // 3) * 4 + 16:
        raise ImageProviderError("The generated image exceeded the image-size bound.", code="image_too_large", state="DIVERGENT")
    try:
        image_data = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError):
        raise ImageProviderError("The provider returned invalid image encoding.", code="image_invalid_base64", state="DIVERGENT") from None
    if not image_data or len(image_data) > MAX_IMAGE_BYTES:
        raise ImageProviderError("The generated image was empty or exceeded the size bound.", code="image_size_invalid", state="DIVERGENT")
    if not _IMAGE_SIGNATURES[mime_type](image_data):
        raise ImageProviderError("The provider image signature did not match its declared MIME type.", code="image_signature_mismatch", state="DIVERGENT")

    provider_request_id = response_payload.get("id")
    if provider_request_id is not None:
        provider_request_id = str(provider_request_id)[:200]
    else:
        provider_request_id = None

    return GeneratedImage(
        data=image_data,
        mime_type=mime_type,
        sha256=hashlib.sha256(image_data).hexdigest(),
        model=model,
        generated_at_utc=datetime.now(timezone.utc).isoformat(timespec="seconds"),
        provider_request_id=provider_request_id,
    )
