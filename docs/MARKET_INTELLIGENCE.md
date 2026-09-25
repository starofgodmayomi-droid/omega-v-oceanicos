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

The operator watchlist is managed through `GET /v1/market/watchlist`, `POST /v1/market/watchlist`, and `DELETE /v1/market/watchlist/:symbol`. A watch item contains a symbol and an absolute percentage threshold. `GET /v1/market/alerts` evaluates those thresholds against the latest observation and returns `watch` or `critical` crossings. The current store is process-local and is intentionally scoped to the single running operator surface; durable per-user storage should be added alongside authentication before multi-tenant deployment.

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
