import app from './index.js';

/** Public trust metadata is served by the API's configured AttestationService. */
app.get('/attest/public-key', (_req, res) => {
  const service = app.locals.attestationService;
  if (!service) {
    res.status(503).json({
      code: 'ED25519_TRUST_UNAVAILABLE',
      message: 'Attestation service is unavailable',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const info = service.getKeyInfo();
  if (info.algorithm !== 'Ed25519' || !info.publicKey) {
    res.status(503).json({
      code: 'ED25519_TRUST_UNAVAILABLE',
      message: 'Ed25519 public-key discovery is unavailable for the configured algorithm',
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
