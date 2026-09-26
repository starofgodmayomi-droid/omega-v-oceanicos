# Market Intelligence Command Center

The Omega web surface now includes a verification-aware market intelligence panel. It observes equity and crypto prices through server-side provider adapters, normalizes them into a shared snapshot, reports whether the observation is live or fallback, and exposes a compact momentum radar.

## API

`GET /v1/market/snapshot` returns:

- `assets`: normalized equity and crypto observations
- `evidence.live`: whether provider data met the minimum live-observation quorum
- `evidence.providerCount`: number of distinct providers represented
- `evidence.assetCount`: number of normalized assets
- `signal`: a deterministic relative-momentum summary
- `observedAt`: UTC observation timestamp

The route keeps provider credentials server-side. Configure `FINNHUB_API_KEY` for equities. CoinGecko is used for crypto and gracefully degrades to a deterministic fallback snapshot when providers fail or return insufficient data.

The operator watchlist is managed through `GET /v1/market/watchlist`, `POST /v1/market/watchlist`, and `DELETE /v1/market/watchlist/:symbol`. A watch item contains a symbol and an absolute percentage threshold. `GET /v1/market/alerts` is a side-effect-free read of active crossings. `POST /v1/market/scan` performs an explicit observation and records eligible `watch` or `critical` crossings; repeated same-direction/severity events are suppressed for 15 minutes. Every scan run—including zero-alert runs—is stored in SQLite alongside watch items and alert events. `GET /v1/market/scans/history` replays run telemetry, while `GET /v1/market/alerts/history` replays recorded crossings. The current surface is intentionally scoped to the single running operator; per-user ownership should be added alongside authentication before multi-tenant deployment.

## Verification boundary

Market data is treated as an observation, not an assertion. The API includes evidence metadata so the UI can distinguish a live verified feed from a fallback observation. This preserves the Oceanicos invariant: evidence before trust.

## Development

Build and typecheck the full workspace with:

```bash
pnpm build
pnpm typecheck
```

Run the API locally and inspect the route:

```bash
OMEGA_AUTH_MODE=local pnpm --filter api dev
curl http://127.0.0.1:5000/v1/market/snapshot
```

For an external cron or heartbeat runner, use the one-shot command after the API is available:

```bash
OMEGA_API_URL=http://127.0.0.1:5000 OMEGA_MARKET_SCAN_TOKEN="$OMEGA_ADMIN_TOKEN" pnpm market:scan
```

The web client routes through `VITE_API_URL` so the dashboard can run in a separate web container from the API. Optional `VITE_API_READ_TOKEN` and `VITE_API_ADMIN_TOKEN` values add bearer credentials for browser requests; do not embed an admin token in a publicly distributed web bundle. In required-auth deployments, prefer a trusted same-origin gateway or server-side session exchange for mutations rather than shipping privileged credentials to the browser.
