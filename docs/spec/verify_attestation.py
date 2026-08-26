#!/usr/bin/env python3
"""Reference verifier for the Ω∞v attestation envelope, version 1.

Deliberately imports nothing from this repository. If this script and the
TypeScript signer disagree, the specification is wrong or one of them is,
and that is exactly what an independent implementation is for.

Requires: pip install cryptography

    python verify_attestation.py attestation.json public_key.pem
"""

import json
import sys

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.serialization import load_pem_public_key

# Order matters. The signer uses JavaScript's JSON.stringify, which emits
# keys in insertion order. Sorting them here would produce different bytes
# and reject every valid attestation.
SIGNED_FIELDS = (
    "verificationId",
    "observationId",
    "verified",
    "confidence",
    "ruleVersions",
    "attestedAt",
    "attestedBy",
    "keyVersion",
)


def signed_bytes(attestation):
    """Rebuild the exact bytes the signer covered."""
    payload = {field: attestation[field] for field in SIGNED_FIELDS}
    # separators removes the whitespace json.dumps adds by default;
    # sort_keys stays off on purpose.
    #
    # ensure_ascii=False is not cosmetic. Python escapes non-ASCII to
    # \uXXXX by default; JavaScript's JSON.stringify emits the character
    # and the signer encodes the result as UTF-8. With the default, an
    # attestedBy of "Ω∞v-attestation-service" produced 219 bytes here
    # against the signer's 212, and this verifier rejected a genuine
    # attestation with "signature does not match this public key" — the
    # same words it uses for a forgery.
    return json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def verify(attestation, public_key_pem, expected_algorithm="Ed25519"):
    """Return (ok, reason). Never raises on a malformed attestation."""
    if attestation.get("status") != "signed":
        return False, f"status is {attestation.get('status')!r}, expected 'signed'"

    # The algorithm comes from the caller, never from the attestation.
    if attestation.get("signingAlgorithm") != expected_algorithm:
        return False, (
            f"algorithm is {attestation.get('signingAlgorithm')!r}, "
            f"this verifier is configured for {expected_algorithm!r}"
        )

    for field in ("signature", "verificationId", "observationId"):
        if not attestation.get(field):
            return False, f"{field} is empty"

    missing = [field for field in SIGNED_FIELDS if field not in attestation]
    if missing:
        return False, f"missing signed fields: {', '.join(missing)}"

    raw = attestation["signature"]
    if raw.startswith("0x"):
        raw = raw[2:]
    try:
        signature = bytes.fromhex(raw)
    except ValueError:
        return False, "signature is not valid hex"

    try:
        key = load_pem_public_key(public_key_pem)
    except Exception as error:  # noqa: BLE001 - report, do not crash
        return False, f"public key could not be read: {error}"

    try:
        key.verify(signature, signed_bytes(attestation))
    except InvalidSignature:
        return False, "signature does not match this public key"
    except Exception as error:  # noqa: BLE001
        return False, f"verification failed: {error}"

    return True, "signature is valid for this public key"


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        return 2

    with open(sys.argv[1], "rb") as handle:
        attestation = json.load(handle)
    with open(sys.argv[2], "rb") as handle:
        public_key_pem = handle.read()

    ok, reason = verify(attestation, public_key_pem)
    print(f"{'VALID' if ok else 'INVALID'}: {reason}")

    if ok:
        # A valid signature is not a valid decision. Say so.
        print(
            "NOTE: this proves origin and integrity only. It does not prove "
            "the verification was correct, and it cannot tell you whether the "
            "attestation was revoked or expired after signing."
        )
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
