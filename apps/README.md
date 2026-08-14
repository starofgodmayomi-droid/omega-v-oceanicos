# Applications

User-facing applications and services for the Ω∞v Oceanicos verification ecosystem.

## Overview

Applications expose the core verification loop to end users through different interfaces:

```
Web Dashboard    REST API    CLI (future)    Mobile (future)
      ↓           ↓             ↓                ↓
   React UI   Express.js   Command-line    iOS/Android
      └─────────────┬──────────────┐──────────────┘
                    ↓
        Shared Verification Loop
        (Observer → Verify → Attest)
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
- Step-by-step result visualization (Observation → Verification → Attestation)
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
npm install

# Start all apps in parallel (hot reload enabled)
npm run dev

# In separate terminals or after Ctrl+C:
npm run build    # Build all apps
npm run test     # Test all apps
```

### Option 2: Start Individual App

```bash
# API only
cd apps/api
npm install
npm run dev       # Runs on http://localhost:3000

# Web only (requires API running)
cd apps/web
npm install
npm run dev       # Runs on http://localhost:3001
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
User Input (React Form)
     ↓
Fetch to /api/complete-loop
     ↓
Receive Observation + Verification + Attestation
     ↓
Render Results (JSX Components)
     ↓
Display on Dashboard
```

## Testing

### Run Tests for All Apps

```bash
npm test
```

### Run Tests for One App

```bash
npm test -- apps/api/
npm test -- apps/web/
```

### Watch Mode

```bash
npm run test:watch
```

## Building

### Build All Apps

```bash
npm run build
```

Produces:

- `apps/api/dist/` — Compiled JavaScript
- `apps/web/dist/` — Optimized React bundle

### Build One App

```bash
npm run -w @omega-v/api build
npm run -w @omega-v/web build
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
**Part of:** Ω∞v Oceanicos verification system  
**Last Updated:** 2026-08-07

```

Runs on `http://localhost:3001`

---

See [../../CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution guidelines.
```
