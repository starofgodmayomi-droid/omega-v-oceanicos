# Development Setup

Get Ω∞v Oceanicos running locally in 10 minutes.

---

## Prerequisites

### Required

- **Git** 2.30+
- **Node.js** 18.x or 20.x (LTS recommended)
- **npm** 9+ or **pnpm** 8+

### Recommended

- **VS Code** with recommended extensions (will prompt on open)
- **Docker** (for running services in containers)

### Optional

- **Make** (for running common commands)
- **PostgreSQL** 14+ (for production testing)

---

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/starofgodmayomi-droid/omega-v-oceanicos.git
cd omega-v-oceanicos
```

### 2. Install Dependencies

```bash
npm install
```

Or with pnpm:

````bash

The full verification suite checks that everything is working:

```bash
pnpm verify
````

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
npm run dev

# Watch for changes (without running servers)
npm run watch

# Build all packages
npm run build

# Clean build artifacts
npm run clean
```

### Testing & Verification

```bash
# Run all verification (lint, type, test, build)
npm run verify

# Run just the verification suite
npm run verify:fast         # Skip slow tasks
npm run verify:full         # Include integration tests

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Code Quality

```bash
# Lint all code
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Type-check without building
npm run type-check

# Format code
npm run format:check
npm run format:fix
```

### Documentation

```bash
# Build documentation site
npm run docs:build

# Test documentation examples
npm run docs:test

# Watch documentation for changes
npm run docs:watch
```

---

## Workspace Scripts

Each workspace (app or package) also has its own scripts. See the `scripts` section in its `package.json`.

### Run from workspace

```bash
# Run a script in a specific workspace
npm run --workspace=packages/verification test

# Shorter syntax with pnpm
pnpm -F @omega-v/verification test

# Run the same script in all workspaces
npm run test --workspaces
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
# API
API_PORT=3000
API_LOG_LEVEL=debug

# Web
WEB_PORT=3001
WEB_API_URL=http://localhost:3000

# Database (when available)
DATABASE_URL=postgresql://localhost/omega_dev
```

Never commit `.env.local` (it's in `.gitignore`).

### `.env.example`

Use `.env.example` as a template:

```bash
cp .env.example .env.local
```

---

## Database Setup

### PostgreSQL (when available)

```bash
# Start Postgres in Docker
docker run --name omega-postgres \
  -e POSTGRES_DB=omega_dev \
  -e POSTGRES_PASSWORD=devpass \
  -p 5432:5432 \
  -d postgres:14

# Run migrations (when available)
npm run db:migrate

# Seed test data
npm run db:seed
```

### SQLite (for quick testing)

SQLite is the default for development. No additional setup needed!

---

## Running Tests

### Unit Tests

```bash
# Run all tests
npm run test

# Run tests in a specific package
npm run --workspace=packages/verification test

# Run in watch mode
npm run test:watch

# Run a specific test file
npm run test -- observer.test.ts
```

### Integration Tests

```bash
# Run integration tests
npm run test:integration

# These test the full verification loop
# They require the database and API to be available
```

### Coverage

```bash
# Generate coverage report
npm run test:coverage

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
DEBUG=omega:* npm run dev
```

---

## Troubleshooting

### "npm ERR! peer dep missing"

Install the missing peer dependency:

```bash
npm install --save-dev <package-name>
```

### "TypeScript error after git pull"

The dependencies might have changed:

```bash
npm install
npm run type-check
```

### Tests fail locally but pass in CI

This usually means:

1. **Missing dependencies**: Run `npm install` again
2. **Stale build**: Run `npm run clean && npm run build`
3. **Environment variables**: Check `.env.local` against `.env.example`
4. **Node version**: Verify `node --version` matches CI environment

### Port already in use

Change the port:

```bash
# For API
API_PORT=3001 npm run dev

# For Web
WEB_PORT=3002 npm run dev
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
5. **Run verification**: `npm run verify` before committing
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
