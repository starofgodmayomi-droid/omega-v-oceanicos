# @omega-v/web

Web dashboard for Ω∞v Oceanicos.

Visualizes the verification loop in real-time with an interactive interface.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Dashboard runs on http://localhost:3001
```

## Features

### Real-Time Verification

Execute the complete Observe → Verify → Attest cycle from the browser.

### Runtime Inspection

- Read current API state and service health
- Follow lifecycle events over server-sent events
- Inspect event IDs, correlation IDs, and payloads
- Recover the latest completed evidence chain after refresh
- Verify attestation signatures from the Evidence Center
- Authorize a local action only from a verified attestation

### Interactive Input

- Submit custom claims
- Watch them flow through the verification pipeline
- See results instantly

### Verification Visualization

View each step of the verification loop:

1. **Observation** — The claim captured with metadata
   - Unique ID
   - Claim statement
   - Confidence level
   - Source system

2. **Verification** — Rules applied and evidence generated
   - Pass/fail status
   - Rules applied and results
   - Evidence path showing step-by-step reasoning
   - Confidence score

3. **Attestation** — Cryptographic signature proving verification
   - Attestation ID
   - Verification status
   - Signed timestamp
   - Signature preview

### Current Console

- Ω∞v current visualization with progressive stages
- Runtime-aware navigation and explicit unavailable boundaries
- Command palette with `⌘ K` / `Ctrl + K`
- Operator-controlled response-time and status-code evidence
- Responsive desktop and mobile layouts

## Usage

### Basic Workflow

1. Open http://localhost:3001
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

The dashboard communicates with the API server:

```text
POST /api/complete-loop
GET /api/state
GET /api/events
GET /api/events/stream
GET /api/runs
POST /api/attest/verify
POST /api/act
GET /api/actions
```

**Request:**

```json
{
  "claim": "Service X is healthy",
  "category": "health-check",
  "source": { ... },
  "observedBy": "user",
  "metadata": { ... },
  "confidence": 0.95,
  "confidenceReason": "Manual verification from dashboard"
}
```

## Configuration

### Environment Variables

- `VITE_API_URL` — API server URL (default: http://localhost:3000)

### Proxy Setup

In `vite.config.ts`:

```typescript
proxy: {
  '/api': {
    target: 'http://localhost:3000',
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
  └── __tests__/        # Tests (coming soon)
index.html             # HTML template
vite.config.ts         # Vite configuration
```

### Building

```bash
# Build for production
npm run build

# Preview production build
npm run preview
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

```bash
npm run test
npm run test:watch
```

## Performance

- Lazy loading with React.StrictMode
- Optimized CSS-in-JS
- Minimal external dependencies
- Hot module reloading in development

## Security

- Input validation on form submission
- CORS handled by proxy
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

1. Ensure API server is running on http://localhost:3000
2. Check that proxy is configured in vite.config.ts
3. Verify CORS headers from API

### Port Already in Use

**Problem:** `EADDRINUSE: address already in use :::3001`

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
npm run clean
npm run dev
```

---

**Package Status:** Beta (v0.1.0)  
**Part of:** Ω∞v Oceanicos verification system  
**Next:** Dashboard persistence, historical queries, metrics  
**Last Updated:** 2026-08-07
