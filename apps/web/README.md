# @omega-v/web

Web dashboard for Ω∞v Oceanicos.

Visualizes the verification loop in real-time with an interactive interface.

## Quick Start

Run these commands from the repository root:

```bash
pnpm install --frozen-lockfile
pnpm dev
```

The root development command builds the workspace, then starts the API at
`http://localhost:5000` and the Vite dashboard at `http://localhost:3000`.
Relative `/api/*` requests are proxied to the local API. Set
`VITE_API_PROXY_TARGET` to override the proxy target; it defaults to
`http://localhost:5000`.

To run only the dashboard while the API is already running, use
`pnpm --filter web dev` from the repository root.

## Features

### Real-Time Verification

Execute the complete Observe → Verify → Attest cycle from the browser.

### Runtime Inspection

- Read current API state and service health
- Follow lifecycle events over server-sent events
- Inspect event IDs, correlation IDs, and payloads
- Recover the latest completed evidence chain after refresh
- Verify attestation signatures from the Evidence Center
- Follow the [independent browser-verifier walkthrough](../../docs/BROWSER-VERIFIER.md) with a real temporary Ed25519 key pair
- Authorize a local action only from a verified attestation
- Record explicit success, failure, or uncertainty feedback against that action
- Propose a versioned recompile from recorded learning without claiming automatic code changes

### Interactive Input

- Submit custom claims
- Watch them flow through the verification pipeline
- See results instantly

### Verification Visualization

View each step of the MINI kernel and its earned expansions:

**MINI Kernel (Observe → Verify → Remember):**

1. **Observation** — The claim captured with metadata (Step 1)
   - Unique ID
   - Claim statement
   - Confidence level
   - Source system

2. **Verification / Evidence** — Rules applied and evidence generated (Step 2)
   - Pass/fail status
   - Rules applied and results
   - Evidence path showing step-by-step reasoning
   - Confidence score

3. **Memory / Kernel Record** — Stored in append-only hash chain (Step 3)
   - Memory ID
   - Link to observation and verification
   - Immutable record of the complete cycle

**Earned Expansions:**

4. **Attestation** — Cryptographic signature proving verification (+ ATTEST)
   - Attestation ID
   - Verification status
   - Signed timestamp
   - Signature verification button

### Current Console

- Ω∞v current visualization with progressive stages
- Runtime-aware navigation and explicit unavailable boundaries
- Command palette with `⌘ K` / `Ctrl + K`
- Operator-controlled response-time and status-code evidence
- Responsive desktop and mobile layouts

## Usage

### Basic Workflow

1. Open http://localhost:3000
2. Enter a claim (default: "Service X is healthy")
3. Click "Run Verification"
4. Watch the verification loop execute
5. See observation, verification, and attestation results

### Example Claims

- "Database connection is healthy"
- "API response time is under 100ms"
- "All tests passed"
- "Deployment successful"

## API Integration

The browser uses relative `/api/*` paths by default. In development, Vite
forwards those requests to `VITE_API_PROXY_TARGET` and removes the `/api`
prefix. For a separately hosted API, set `VITE_API_URL` to its origin; see the
[API reference](../api/README.md) for current server routes and request
contracts.

## Configuration

### Environment Variables

- `VITE_API_URL` — optional API origin for a separately hosted API; unset by
  default so browser-relative requests use the Vite proxy.
- `VITE_API_PROXY_TARGET` — development proxy target (default:
  `http://localhost:5000`).

### Proxy Setup

In `vite.config.ts`:

```typescript
proxy: {
  '/api': {
    target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:5000',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, ''),
  },
}
```

## Development

### File Structure

```
src/
  ├── App.tsx           # Main React component
  ├── App.css           # Styling
  ├── main.tsx          # Entry point
  └── __tests__/        # Frontend contract and component test sources
index.html             # HTML template
vite.config.ts         # Vite configuration
```

### Building

```bash
# Build the web workspace package from the repository root
pnpm --filter web build

# Preview the built bundle
pnpm --filter web start
```

The built files are in the `dist/` directory.

## Styling

The dashboard uses pure CSS with:

- Gradient background (purple to indigo)
- Card-based layout
- Hover effects and transitions
- Mobile-responsive design

Key colors:

- Primary: `#667eea` (indigo)
- Secondary: `#764ba2` (purple)
- Success: `#16a34a` (green)
- Info: `#0284c7` (blue)
- Warning: `#d97706` (amber)

## Testing

Run the repository checks from the root:

```bash
pnpm test        # enumerated repository integration suite
pnpm verify:full # build, type-check, integration suite, and API smoke
```

The integration suite includes a regression test for the Vite `/api` proxy.
These commands provide local verification evidence only; they do not establish
deployment or production health.

## Performance

- Lazy loading with React.StrictMode
- Optimized CSS-in-JS
- Minimal external dependencies
- Hot module reloading in development

## Security

- Input validation on form submission
- The development proxy does not provide authentication or production CORS policy
- No sensitive data stored locally
- API calls use HTTPS in production

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Troubleshooting

### API Connection Failed

**Problem:** Dashboard shows "Error" when running verification

**Solution:**

1. Ensure the API server is running on http://localhost:5000
2. Check that proxy is configured in vite.config.ts
3. Verify CORS headers from API

### Port Already in Use

**Problem:** `EADDRINUSE: address already in use :::3000`

**Solution:**

```bash
# Change port in vite.config.ts
server: {
  port: 3002,  // Use different port
}
```

### Styles Not Loading

**Problem:** Dashboard shows without styling

**Solution:**

```bash
# Clear cache and rebuild
pnpm --filter web build
pnpm --filter web dev
```

---

**Package version:** 1.0.0
**Part of:** Ω∞v Oceanicos verification system  
**Last Updated:** 2026-09-28
