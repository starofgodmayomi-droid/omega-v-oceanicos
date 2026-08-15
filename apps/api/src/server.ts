import { attestationService, app } from './index.js';

/** Public, non-secret attestation verification metadata. */
app.get('/attest/public-key', (_req, res) => {
  const info = attestationService.getKeyInfo();

  if (info.algorithm !== 'Ed25519' || !info.publicKey) {
    res.status(503).json({
      code: 'ED25519_TRUST_UNAVAILABLE',
      message:
        'Ed25519 public-key discovery is unavailable while the configured algorithm is not Ed25519',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  res.json({
    data: {
      algorithm: info.algorithm,
      keyId: info.fingerprint,
      fingerprint: info.fingerprint,
      keyVersion: info.version,
      publicKey: info.publicKey,
    },
    timestamp: new Date().toISOString(),
  });
});

export { app };
export default app;
