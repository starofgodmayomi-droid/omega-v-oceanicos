# Applications

User-facing applications and services for the Ω∞v Oceanicos verification ecosystem.

## Overview

Applications expose the core verification loop to end users through different interfaces:

```
Web Console     REST API     CLI (future)    Mobile (future)
     ↓             ↓              ↓                ↓
  React UI     Express.js    Command-line     iOS/Android
     └──────────────┬───────────────┬──────────────┘
                    ↓
              THE CURRENT
   Observe → Verify → Attest → Act → Learn → Recompile → Return
```

## Structure

```
apps/
├── api/       # Express REST API server
└── web/       # React dashboard (Vite)
```

## Applications

### api

Express REST server exposing the verification loop via HTTP.

**Features:**

- Complete verification loop as REST endpoints
- Real-time observation capture
- Rule verification with evidence generation
- Cryptographic attestation signing
- Health check endpoint
- Error handling with proper HTTP status codes

**Endpoints:**

- `GET /health` — API status check
- `POST /observe` — Capture a claim
- `POST /verify` — Verify an observation
- `POST /attest` — Sign a verification result
- `POST /complete-loop` — Full cycle in one request
- `POST /attest/verify` — Verify an attestation signature
- `POST /act` — Authorize an attested action
- `GET /actions` — List authorized actions
- `POST /learn` — Record action feedback
- `GET /learning` — List learning records
- `POST /recompile` — Propose a change from learning
- `GET /recompilations` — List recompile proposals
- `GET /state` — Current runtime state and service health
- `GET /events` — Recent lifecycle events
- `GET /events/stream` — Server-sent lifecycle event stream
- `GET /runs` — Completed verification runs
- `GET /rules` — List registered rules

**Quick Start:**

```bash
npm run dev       # Start on http://localhost:3000
npm run build     # Build for production
npm run test      # Run tests
```

**Configuration:**

- `API_PORT` — Server port (default: 3000)
- `OMEGA_RUNTIME_STORE_PATH` — Local runtime snapshot path (default: `/tmp/omega-v-oceanicos/runtime.json`)

**See also:** [api/README.md](api/README.md)

### web

React dashboard for visualizing the verification loop in real-time.

**Features:**

- Interactive claim submission
- Real-time verification execution
- Stage visualization across observe → verify → attest → act → learn → recompile
- Trust basis, live events, and evidence ledger projections of The Current
- Evidence path display with reasoning
- Signature preview
- Responsive design

**Quick Start:**

```bash
npm run dev       # Start on http://localhost:3001
npm run build     # Build for production
npm run preview   # Preview production build
npm run test      # Run tests
```

**Configuration:**

- `VITE_API_URL` — API server URL (default: http://localhost:3000)
- Proxy configured in `vite.config.ts`

**See also:** [web/README.md](web/README.md)

## Getting Started

### Option 1: Start All Apps (from root)

```bash
# Install dependencies for all apps and packages
pnpm install

# Start all apps in parallel (hot reload enabled)
pnpm dev

# In separate terminals or after Ctrl+C:
pnpm build       # Build all apps
pnpm test        # Test all apps
```

### Option 2: Start Individual App

```bash
# API only
cd apps/api
pnpm --filter @omega-v/api dev       # Runs on http://localhost:3000

# Web only (requires API running)
cd apps/web
pnpm --filter @omega-v/web dev       # Runs on http://localhost:3001
```

## Architecture

### API Layer

```
Client Request
     ↓
Express Router
     ↓
Service Layer (Observer, Verification, Attestation)
     ↓
Shared Types (@omega-v/types)
     ↓
JSON Response
```

### Web Layer

```
Operator Input (React console)
     ↓
API: complete-loop / state / events / act / learn / recompile
     ↓
The Current (context bus + event stream)
     ↓
Render trust, stages, evidence, and ledger
```

## Testing

### Run Tests for All Apps

```bash
pnpm test
```

### Run Tests for One App

```bash
pnpm exec jest apps/api/
pnpm exec jest apps/web/
```

### Watch Mode

```bash
pnpm test:watch
```

## Building

### Build All Apps

```bash
pnpm build
```

Produces:

- `apps/api/dist/` — Compiled JavaScript
- `apps/web/dist/` — Optimized React bundle

### Build One App

```bash
pnpm --filter @omega-v/api build
pnpm --filter @omega-v/web build
```

## Development

### File Structure

Each app is self-contained:

```
apps/api/
├── src/
│   ├── index.ts          # Express server entry
│   ├── routes/           # API routes (future)
│   └── __tests__/        # Tests
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md

apps/web/
├── src/
│   ├── App.tsx           # Main React component
│   ├── App.css           # Styling
│   ├── main.tsx          # Vite entry
│   └── __tests__/        # Tests
├── index.html            # HTML template
├── vite.config.ts        # Build config
├── package.json
├── tsconfig.json
└── README.md
```

### Adding a New Endpoint

1. Create route handler in `apps/api/src/`
2. Register in Express app
3. Add tests to `__tests__/`
4. Document in README.md

### Adding a New Dashboard Feature

1. Add component to `apps/web/src/`
2. Update `App.tsx` to use it
3. Add CSS styling
4. Add tests to `__tests__/`

## Environment Variables

### API

Create `.env` in `apps/api/`:

```
API_PORT=3000
NODE_ENV=development
```

### Web

Create `.env.local` in `apps/web/`:

```
VITE_API_URL=http://localhost:3000
VITE_ENV=development
```

## Deployment

### API Deployment

```bash
npm run build
npm run start
```

The compiled app is ready for:

- Docker deployment
- Kubernetes
- Serverless (with adapters)
- Traditional VM hosting

### Web Deployment

```bash
npm run build
```

The `dist/` folder contains:

- Static HTML/CSS/JS
- Ready for CDN
- Traditional web server
- Serverless functions

## Performance

### API

- No database overhead (stateless, for now)
- Single-threaded but async I/O
- Memory efficient

### Web

- Lazy-loaded React components
- Optimized bundle (< 200KB gzipped)
- Hot module reloading in dev
- Vite fast build times

## Security

### API

- Input validation on all endpoints
- Error messages don't expose internals
- HTTPS ready (reverse proxy recommended)
- CORS configuration available

### Web

- XSS protection via React's JSX
- No sensitive data in localStorage (yet)
- API calls through proxy

## Troubleshooting

### API won't start

```bash
# Check if port 3000 is in use
lsof -i :3000

# Use different port
API_PORT=3001 npm run dev
```

### Web dashboard shows errors

```bash
# Ensure API is running
curl http://localhost:3000/health

# Check proxy in vite.config.ts
# Verify VITE_API_URL environment variable
```

### Build failures

```bash
# Clear cache
npm run clean

# Reinstall dependencies
npm install

# Try build again
npm run build
```

## Contributing

Each app follows these standards:

- TypeScript strict mode
- ESLint + Prettier formatting
- Jest unit tests
- 70%+ code coverage
- Clear naming and comments

---

**Status:** Stable (v0.1.0)  
**Part of:** Ω∞v Oceanicos Formless Intelligence OS  
**Last Updated:** 2026-08-14

See [../../CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution guidelines.
