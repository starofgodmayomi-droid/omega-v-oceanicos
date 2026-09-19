# Development Setup

Get Ω∞v Oceanicos running locally in 10 minutes.

---

## Prerequisites

### Required

- **Git** 2.30+
- **Node.js** 18.x or 20.x (LTS recommended)
- **pnpm** 8+ (the lockfile in this repository is pnpm's)

### Recommended

- **VS Code** with recommended extensions (will prompt on open)
- **Docker** (for running services in containers)

### Optional

- **Make** (for running common commands)

---

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/starofgodmayomi-droid/omega-v-oceanicos.git
cd omega-v-oceanicos
```

### 2. Install Dependencies

```bash
pnpm install
```

`pnpm-lock.yaml` is the only lockfile in this repository, and CI installs with
`pnpm install --frozen-lockfile`. `npm install` does resolve this workspace, but
it resolves fresh instead of from a lockfile, so it can give you versions CI has
never run. Use pnpm if you want to reproduce CI.

### 3. Run Verification

The full verification suite checks that everything is working:

```bash
pnpm verify
```

This runs:

- ✓ Linting (code style)
- ✓ Type checking (TypeScript)
- ✓ Unit tests
- ✓ Build verification

If all checks pass, your environment is ready!

### 4. (Optional) Start the Development Server

Once the monorepo structure is built, run:

```bash
pnpm dev
```

This starts:

- API server on `http://localhost:3000`
- Web dashboard on `http://localhost:3001`
- File watchers for hot reload

---

## Project Structure

```
omega-v-oceanicos/
├── apps/                    # User-facing applications
│   ├── api/                 # Backend API server
│   ├── web/                 # Web dashboard
│   └── mobile/              # Mobile app (planned)
│
├── packages/                # Shared libraries
│   ├── observer/            # Event observation
│   ├── verification/        # Rule engine
│   ├── attestation/         # Crypto signing
│   ├── compiler/            # Rule compiler
│   ├── ir/                  # Bytecode representation
│   ├── sdk/                 # Client SDK
│   └── cli/                 # Command-line tool
│
├── docs/                    # Documentation
├── infra/                   # Infrastructure & deployment
├── tests/                   # Integration tests
│
├── package.json             # Root workspace config
├── tsconfig.json            # TypeScript configuration
├── .eslintrc.json           # Linting rules
└── jest.config.js           # Test configuration
```

---

## Common Commands

### Development

```bash
# Start all servers in watch mode
pnpm dev

# Watch for changes (without running servers)
pnpm --parallel --filter @omega-v/api --filter @omega-v/web dev

# Build all packages
pnpm build

# Clean build artifacts
pnpm clean
```

### Testing & Verification

```bash
# Run all verification (lint, type, test, build)
pnpm verify

# Run just the verification suite
pnpm verify:fast         # Skip slow tasks
pnpm verify:full         # Include integration tests

# Run tests in watch mode
pnpm test:watch

# Generate coverage report
pnpm test:coverage
```

### Code Quality

```bash
# Lint all code
pnpm lint

# Fix linting issues automatically
pnpm lint:fix

# Type-check without building
pnpm type-check

# Format code
pnpm format:check
pnpm format:fix
```

### Documentation

```bash
# Build documentation site
pnpm docs:build

# Test documentation examples
pnpm docs:test

# Watch documentation for changes
pnpm docs:watch
```

---

## Workspace Scripts

Each workspace (app or package) also has its own scripts. See the `scripts` section in its `package.json`.

### Run from workspace

```bash
# Run a script in a specific workspace
pnpm --filter @omega-v/verification test

# Shorter syntax with pnpm
pnpm -F @omega-v/verification test

# Run the same script in all workspaces
pnpm -r test
```

---

## Setting Up Your Editor

### VS Code

The repository includes workspace recommendations. When you open it in VS Code:

1. You'll be prompted to install recommended extensions
2. Click "Install All"
3. Reload VS Code

Recommended extensions:

- **ESLint** — Real-time linting
- **TypeScript Vue Plugin** — Type checking
- **Prettier** — Code formatting
- **Test Explorer** — Run tests from sidebar
- **Thunder Client** or **REST Client** — API testing

### Keyboard Shortcuts

In VS Code, you can configure shortcuts for common tasks:

```json
[
  {
    "key": "ctrl+shift+v",
    "command": "workbench.action.tasks.runTask",
    "args": "npm: verify"
  }
]
```

---

## Environment Variables

### `.env.local` (Development)

Create a `.env.local` file in the root for local development:

```bash
# The port the API listens on
API_PORT=3000
```

`API_PORT` is the only variable in this file that the code reads. Everything
else the API accepts is an `OMEGA_*` variable covering auth, attestation,
persistence and the local job ledger, and `apps/api/README.md` is the single
place that documents them — this guide deliberately keeps no second copy.

Never commit `.env.local` (it's in `.gitignore`).

---

## Persistence

There is no database. The API holds state in memory, and when persistence is
enabled it writes an encrypted snapshot to a file:

```bash
# Off under NODE_ENV=test, on elsewhere; set it to override explicitly
OMEGA_PERSISTENCE=on

# 32-byte hex secret for the AES-256-GCM snapshot and event log
OMEGA_PERSISTENCE_KEY=$(openssl rand -hex 32)
```

Nothing here needs Postgres, SQLite, migrations or seed data, and no
`db:migrate` or `db:seed` script exists. `apps/api/README.md` documents the key
handling, rotation and recovery declarations, and is explicit about what that
evidence does not establish.

---

## Running Tests

### Unit Tests

```bash
# Run all tests
pnpm test

# Run tests in a specific package
pnpm --filter @omega-v/verification test

# Run in watch mode
pnpm test:watch

# Run a specific test file
pnpm test -- observer.test.ts
```

### Integration Tests

```bash
# Run integration tests
pnpm test:integration
```

These exercise the full Observe → Verify → Remember loop in process. They write
to a temporary directory and need no database and no running server.

### Coverage

```bash
# Generate coverage report
pnpm test:coverage

# View HTML coverage report
open coverage/index.html
```

---

## Debugging

### VS Code Debugger

Add this to your `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "program": "${workspaceFolder}/node_modules/jest/bin/jest.js",
      "args": ["--runInBand", "--no-coverage"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

Then press **F5** to start debugging.

### Console Logging

Use the `debug` module for structured logging:

```typescript
import debug from 'debug';

const log = debug('omega:observer');

log('Observation received:', observation);
```

Enable logs:

```bash
DEBUG=omega:* pnpm dev
```

---

## Troubleshooting

### "peer dep missing"

Install the missing peer dependency:

```bash
pnpm add -D <package-name>
```

### "TypeScript error after git pull"

The dependencies might have changed:

```bash
pnpm install
pnpm type-check
```

### Tests fail locally but pass in CI

This usually means:

1. **Missing dependencies**: Run `pnpm install --frozen-lockfile` again
2. **Stale build**: Run `pnpm clean && pnpm build`
3. **Node version**: Verify `node --version` satisfies the `engines` range in
   `package.json`

### Port already in use

Change the port:

```bash
# For the API, which reads API_PORT
API_PORT=3001 pnpm dev

# For the web dashboard, whose port is a Vite setting rather than an
# environment variable
pnpm --filter @omega-v/web dev -- --port 3002
```

Or kill the existing process:

```bash
# Find what's using port 3000
lsof -i :3000

# Kill it
kill -9 <PID>
```

---

## Next Steps

1. **Read the Contributing Guide**: [CONTRIBUTING.md](../CONTRIBUTING.md)
2. **Pick a good first issue**: Look for `good first issue` labels
3. **Create a feature branch**: `git checkout -b verify/your-feature`
4. **Write code and tests**: Follow the verification-first approach
5. **Run verification**: `pnpm verify` before committing
6. **Submit a PR**: Include evidence of your work

---

## Getting Help

- **Setup issues**: Comment on the issue or discussion
- **Code questions**: DM a maintainer or open an issue
- **Design questions**: Start a GitHub discussion
- **General questions**: See [CHARTER.md](../CHARTER.md)

---

**Last Updated**: 2026-08-07  
**Status**: Evolves as the project grows
