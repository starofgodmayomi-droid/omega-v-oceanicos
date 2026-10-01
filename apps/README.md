# Applications

User-facing applications and services for the Ω∞v Oceanicos verification ecosystem.

## Overview

Applications expose the core verification loop to end users through different interfaces:

```
Web Dashboard    REST API      CLI           SDK        Mobile (future)
      ↓             ↓            ↓             ↓              ↓
   React UI    Express.js    omega(1)    TypeScript     iOS/Android
      └─────────────┴──────┬──────┴──────────────┘
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

The full list, with request and response shapes, lives in
[api/README.md](api/README.md). It is not repeated here on purpose: a second
copy drifts from the first, and this one already had — it listed 17 endpoints
while the server registered 29.

**Quick Start:**

```bash
# Start API (port 5000) and Web (port 3001) simultaneously with colored streams
pnpm dev

# In separate terminals or after Ctrl+C:
pnpm build       # Build all apps
pnpm test        # Test all apps
```

**Configuration:**

- `API_PORT` — Server port (default: 5000)
- `OMEGA_RUNTIME_STORE_PATH` — Local runtime snapshot path (default: `/tmp/omega-v-oceanicos/runtime.json`)
- `OMEGA_SIGNING_KEY` — Required. The service refuses to start without it.
- Further variables are documented in [api/README.md](api/README.md) rather
  than duplicated here.

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

- `VITE_API_URL` — API server URL (default: http://localhost:5000)
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
pnpm --filter @omega-v/api dev       # Runs on http://localhost:5000

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

[...rest of file unchanged...]
