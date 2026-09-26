const baseUrl = (process.env.OMEGA_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
const token = process.env.OMEGA_MARKET_SCAN_TOKEN || process.env.OMEGA_ADMIN_TOKEN || '';

const response = await fetch(`${baseUrl}/v1/market/scan`, {
  method: 'POST',
  headers: token ? { authorization: `Bearer ${token}` } : undefined,
});
const text = await response.text();
let payload;
try {
  payload = text ? JSON.parse(text) : null;
} catch {
  throw new Error(`market scan returned invalid JSON (${response.status})`);
}
if (!response.ok || !payload?.success) {
  throw new Error(payload?.error || payload?.message || `market scan failed (${response.status})`);
}
console.log(JSON.stringify({
  scanId: payload.scanId,
  recordedAlerts: payload.recordedAlerts?.length ?? 0,
  activeAlerts: payload.activeAlerts?.length ?? 0,
  suppressedCount: payload.suppressedCount ?? 0,
  observedAt: payload.observedAt,
  evidence: payload.evidence,
}));
