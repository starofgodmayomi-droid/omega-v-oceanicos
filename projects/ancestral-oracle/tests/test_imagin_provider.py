from __future__ import annotations

import base64
import json
import sys
import unittest
from pathlib import Path
from urllib.error import HTTPError, URLError
from unittest.mock import Mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from imagin_provider import (  # noqa: E402
    DEFAULT_IMAGE_MODEL,
    ENDPOINT,
    MAX_PROMPT_CHARS,
    GeneratedImage,
    ImageProviderError,
    generate_image,
)


PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"imagin-test-payload"


class FakeResponse:
    def __init__(self, body: bytes):
        self.body = body

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def read(self, _limit=-1):
        return self.body


def fake_opener_for(payload):
    body = json.dumps(payload).encode("utf-8")
    return lambda request, timeout: FakeResponse(body)


class ImaginProviderTests(unittest.TestCase):
    def test_missing_key_is_not_executed_and_makes_no_request(self):
        opener = Mock()
        with self.assertRaises(ImageProviderError) as caught:
            generate_image("A bright ocean", "", opener=opener)
        self.assertEqual(caught.exception.state, "NOT_EXECUTED")
        self.assertEqual(caught.exception.code, "missing_api_key")
        opener.assert_not_called()

    def test_empty_and_overlong_prompts_are_rejected_before_network(self):
        opener = Mock()
        for prompt in ("  ", "x" * (MAX_PROMPT_CHARS + 1)):
            with self.subTest(length=len(prompt)):
                with self.assertRaises(ImageProviderError) as caught:
                    generate_image(prompt, "fake-key", opener=opener)
                self.assertEqual(caught.exception.state, "NOT_EXECUTED")
        opener.assert_not_called()

    def test_disallowed_model_is_rejected_before_network(self):
        opener = Mock()
        with self.assertRaises(ImageProviderError) as caught:
            generate_image("A river of light", "fake-key", model="unexpected-model", opener=opener)
        self.assertEqual(caught.exception.code, "model_not_allowed")
        opener.assert_not_called()

    def test_valid_image_is_bounded_hashed_and_source_receipted(self):
        payload = {
            "id": "provider-receipt-123",
            "output_image": {"data": base64.b64encode(PNG_BYTES).decode("ascii"), "mime_type": "image/png"},
        }
        opener = Mock(side_effect=fake_opener_for(payload))
        result = generate_image("A river of light", "fake-key", opener=opener)

        self.assertIsInstance(result, GeneratedImage)
        self.assertEqual(result.data, PNG_BYTES)
        self.assertEqual(result.mime_type, "image/png")
        self.assertEqual(result.model, DEFAULT_IMAGE_MODEL)
        self.assertEqual(len(result.sha256), 64)
        self.assertEqual(result.provider_request_id, "provider-receipt-123")
        self.assertTrue(result.generated_at_utc.endswith("+00:00"))

        request = opener.call_args.args[0]
        self.assertEqual(request.full_url, ENDPOINT)
        self.assertNotIn("fake-key", request.full_url)
        self.assertEqual(request.get_header("X-goog-api-key"), "fake-key")
        sent = json.loads(request.data.decode("utf-8"))
        self.assertEqual(sent["model"], DEFAULT_IMAGE_MODEL)
        self.assertEqual(opener.call_args.kwargs["timeout"], 60)

    def test_provider_http_failure_does_not_expose_response_body_or_key(self):
        def fail(_request, timeout):
            raise HTTPError(ENDPOINT, 403, "Forbidden", {}, None)
        with self.assertRaises(ImageProviderError) as caught:
            generate_image("A river of light", "fake-key", opener=fail)
        self.assertEqual(caught.exception.state, "NOT_EXECUTED")
        self.assertNotIn("fake-key", str(caught.exception))

    def test_timeout_is_unknown_not_false_failure_or_verified(self):
        def fail(_request, timeout):
            raise URLError("private connection detail")
        with self.assertRaises(ImageProviderError) as caught:
            generate_image("A river of light", "fake-key", opener=fail)
        self.assertEqual(caught.exception.state, "UNKNOWN")
        self.assertNotIn("private connection detail", str(caught.exception))

    def test_invalid_provider_payload_stays_divergent(self):
        cases = [
            {},
            {"output_image": {"data": "!!!", "mime_type": "image/png"}},
            {"output_image": {"data": base64.b64encode(b"not an image").decode("ascii"), "mime_type": "image/png"}},
            {"output_image": {"data": base64.b64encode(PNG_BYTES).decode("ascii"), "mime_type": "image/gif"}},
        ]
        for payload in cases:
            with self.subTest(payload=payload):
                with self.assertRaises(ImageProviderError) as caught:
                    generate_image("A river of light", "fake-key", opener=fake_opener_for(payload))
                self.assertEqual(caught.exception.state, "DIVERGENT")

    def test_no_provider_request_is_made_for_unconfigured_image_generation(self):
        opener = Mock()
        with self.assertRaises(ImageProviderError):
            generate_image("A river of light", "", opener=opener)
        opener.assert_not_called()


if __name__ == "__main__":
    unittest.main()
