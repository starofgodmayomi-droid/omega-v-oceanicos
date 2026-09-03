# Verify an Attestation in the Browser

This walkthrough demonstrates the independent verifier in the dashboard. It uses a real Ed25519 key pair and a real attestation produced by the local API, then checks the attestation in the browser without sending the verification request back to the API.

> A valid browser result proves origin and integrity of the signed fields for the supplied public key. It does **not** prove that the underlying observation was true, that the verification rules were appropriate, or that the attestation has not subsequently expired or been revoked.

The browser verifier implements the published [attestation envelope specification](./spec/ATTESTATION-ENVELOPE.md). It is deliberately independent of the API and attestation packages: the browser receives only an attestation and a public key, reconstructs the eight signed fields in their specified order, and asks WebCrypto to verify the Ed25519 signature.

## 1. Generate a temporary Ed25519 key pair

Use a temporary directory for this demonstration. Do not place a production private key in a repository, browser field, screenshot, issue, or chat message.

```bash
DEMO_DIR="$(mktemp -d)"
openssl genpkey -algorithm Ed25519 -out "$DEMO_DIR/private.pem"
openssl pkey -in "$DEMO_DIR/private.pem" -pubout -out "$DEMO_DIR/public.pem"
```

The API accepts the private PEM through `OMEGA_ED25519_KEY`. Because a shell environment variable must contain the complete PEM value, load it with command substitution and start the API with a temporary runtime directory:

```bash
export OMEGA_ED25519_KEY="$(cat "$DEMO_DIR/private.pem")"
export OMEGA_ED25519_KEY_VERSION="browser-demo-v1"
export OMEGA_RUNTIME_STORE_PATH="$DEMO_DIR/runtime.json"
export OMEGA_EVENT_LOG_PATH="$DEMO_DIR/events.jsonl"
```

Start the API and web dashboard in separate terminals from the repository root:

```bash
pnpm --filter @omega-v/api dev
pnpm --filter @omega-v/web dev
```

The development API listens on `http://localhost:3000`; the dashboard listens on `http://localhost:3001`.

## 2. Create a real attestation

Create a complete verification loop through the API. The response contains an attestation under `data.attestation`:

```bash
curl -sS -X POST http://localhost:3000/complete-loop \
  -H 'content-type: application/json' \
  -d '{
    "claim": "Service X is healthy",
    "category": "health-check",
    "source": {"system": "browser-verifier-demo"},
    "observedBy": "walkthrough",
    "metadata": {"responseTime": 42, "statusCode": 200},
    "confidence": 0.95,
    "confidenceReason": "Controlled local demonstration"
  }' | tee "$DEMO_DIR/loop.json"
```

Extract the attestation and public key for convenient copying into the dashboard. The API response envelope uses `data`; the attestation itself is the `data.attestation` object.

```bash
python3 - "$DEMO_DIR/loop.json" "$DEMO_DIR/attestation.json" <<'PY'
import json
import sys

source, destination = sys.argv[1:]
with open(source, encoding="utf-8") as handle:
    body = json.load(handle)
with open(destination, "w", encoding="utf-8") as handle:
    json.dump(body["data"]["attestation"], handle, indent=2)
    handle.write("\n")
PY

curl -sS http://localhost:3000/attest/public-key | tee "$DEMO_DIR/public-key-response.json"
cat "$DEMO_DIR/attestation.json"
cat "$DEMO_DIR/public.pem"
```

The public key returned by `GET /attest/public-key` is the API’s published trust metadata. For this local demonstration it should correspond to `public.pem`; the API never returns the private key.

## 3. Verify without trusting the page’s API result

Open `http://localhost:3001` and find **INDEPENDENT VERIFICATION — Check a proof without trusting this page**.

Paste the contents of `attestation.json` into **Attestation JSON**. Paste the PEM from `public.pem`, or the `data.publicKey` value from `public-key-response.json`, into **Public key (PEM)**. Select **Verify locally**.

A successful result should display **VALID** and the reason `signature is valid for this public key`. The browser performs the check through `apps/web/src/verify.ts`; no verification request is sent and the private key is never used.

To demonstrate tamper detection, change one signed value such as `confidence` from `0.95` to `0.94` and run the check again. The result should become **INVALID** because the signature no longer matches the reconstructed signed payload. Restoring the original JSON should return **VALID** again.

## 4. Understand a non-verification result correctly

The verifier distinguishes different failure stages rather than collapsing every problem into `INVALID`:

| Stage       | Meaning                                                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `shape`     | The envelope is missing required fields or has the wrong status.                                                                      |
| `algorithm` | The envelope does not claim the expected Ed25519 algorithm. The verifier never chooses a primitive from attacker-controlled metadata. |
| `signature` | The signature is malformed or does not match the signed bytes.                                                                        |
| `key`       | The supplied value is not a PEM SubjectPublicKeyInfo block.                                                                           |
| `crypto`    | The environment cannot perform the requested WebCrypto operation, or the key/curve is unsupported.                                    |

A browser without usable Ed25519 WebCrypto support should report a capability problem, not accuse a valid attestation of being forged. The repository’s module tests cover both real signature verification and graceful degradation when the primitive is unavailable.

## 5. Keep the trust boundary visible

The browser result is independent evidence about signature origin and integrity. It is not a replacement for runtime policy checks. Before authorizing an action, also consider the API’s revocation and expiry evidence:

```bash
curl -sS http://localhost:3000/attest/revocations
curl -sS http://localhost:3000/attest/policy
```

The browser verifier does not know whether the attestation was later revoked, whether a configured TTL has elapsed, whether the observation was correct, or whether the page that supplied the attestation was honest. This separation is intentional: **ATTEST is not ASSERT**, and independent signature checking is only one layer of evidence.

## References

- [Attestation envelope specification](./spec/ATTESTATION-ENVELOPE.md)
- [Python reference verifier](./spec/verify_attestation.py)
- [Web verifier implementation](../apps/web/src/verify.ts)
- [API public attestation key endpoint](../apps/api/README.md#public-attestation-key)
- [Ed25519 attestation configuration](../packages/attestation/README.md)
