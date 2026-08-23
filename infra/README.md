# Infrastructure

Deployment and infrastructure configuration for Ω∞v Oceanicos.

## Structure

- **docker/** — Docker configurations
  - `docker-compose.yml` — Local development stack
  - `Dockerfile.api` — API server image
  - `Dockerfile.web` — Web dashboard image
- **kubernetes/** — Kubernetes manifests (coming soon)
- **scripts/** — Deployment and automation scripts
- **terraform/** — Infrastructure as Code (coming soon)

## Quick Start

### Local Development Stack

```bash
cd infra/docker
docker-compose up -d
```

Services:

- **api**: http://localhost:3000
- **web**: http://localhost:3001
- **postgres**: localhost:5432
- **redis**: localhost:6379

### Environment Setup

```bash
cp .env.example .env.local
docker-compose up -d
```

## Production Deployment

### Prerequisites

- Docker & Docker Compose 2.0+
- Kubernetes 1.25+ (optional)
- PostgreSQL 14+ (managed or self-hosted)

### Deploy to Production

```bash
./scripts/deploy.sh --environment production
```

See [./deploy.md](./deploy.md) for detailed deployment guide (coming soon).

---

See [../../CONTRIBUTING.md](../../CONTRIBUTING.md) for infrastructure contribution guidelines.
