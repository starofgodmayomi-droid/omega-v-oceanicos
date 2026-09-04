# Ω∞v Oceanicos Deployment Guide

## Overview

This guide covers deploying Ω∞v Oceanicos in production environments using Docker and Docker Compose.

## Quick Start with Docker Compose

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- 2GB+ available memory
- 500MB+ disk space

### Local Development

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Check service health
curl http://localhost:3000/health

# Stop services
docker-compose down
```

### Accessing Services

- **API**: http://localhost:3000
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001
  - Default credentials: admin/admin

## Production Deployment

### Building Docker Image

```bash
# Build the image
docker build -t omega-v-oceanicos:latest .

# With custom tags
docker build -t omega-v-oceanicos:0.1.0 -t omega-v-oceanicos:latest .

# Push to registry
docker tag omega-v-oceanicos:latest your-registry.com/omega-v-oceanicos:latest
docker push your-registry.com/omega-v-oceanicos:latest
```

### Environment Variables

Configure the API server using environment variables:

```bash
# Server Configuration
API_PORT=3000                          # API listening port (default: 3000)
NODE_ENV=production                    # Node environment (default: production)

# Persistence
PERSISTENCE_ENABLED=true               # Enable persistent storage (default: false)
DB_PATH=/app/data/events.db            # Path to SQLite database file

# Security
RATE_LIMIT_MAX_REQUESTS=200            # Max requests per time window
RATE_LIMIT_WINDOW_MS=60000             # Rate limit window in milliseconds
```

### Docker Run

```bash
docker run -d \
  --name omega-v-api \
  -p 3000:3000 \
  -e API_PORT=3000 \
  -e NODE_ENV=production \
  -e PERSISTENCE_ENABLED=true \
  -v omega-v-data:/app/data \
  omega-v-oceanicos:latest
```

### Docker Compose Production Stack

For production, consider using this enhanced compose file:

```yaml
version: '3.9'

services:
  api:
    image: omega-v-oceanicos:0.1.0
    container_name: omega-v-api-prod
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - API_PORT=3000
      - PERSISTENCE_ENABLED=true
      - DB_PATH=/app/data/events.db
    volumes:
      - omega-v-data:/app/data
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 5
    networks:
      - omega-v-network

  prometheus:
    image: prom/prometheus:latest
    restart: always
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    networks:
      - omega-v-network

volumes:
  omega-v-data:
  prometheus-data:

networks:
  omega-v-network:
    driver: bridge
```

## Monitoring

### Prometheus Metrics

Metrics are available at `http://localhost:3000/metrics` in Prometheus format.

**Key metrics:**

- `verification_observations_total` - Total observations processed
- `verification_results_total` - Total verification results
- `verification_duration_ms` - Verification execution duration
- `attestation_duration_ms` - Attestation creation duration
- `verification_success_rate` - Success rate of verifications
- `system_confidence` - Average system confidence score

### Health Checks

```bash
# Basic health check
curl http://localhost:3000/health

# Response:
# {
#   "data": {
#     "status": "ok"
#   },
#   "timestamp": "2026-09-03T10:00:00.000Z"
# }
```

### Logs

With Docker Compose:

```bash
# View API logs
docker-compose logs api

# Follow logs in real-time
docker-compose logs -f api

# View logs for all services
docker-compose logs -f
```

## Scaling

### Horizontal Scaling

For load balancing multiple API instances:

```yaml
services:
  api-1:
    image: omega-v-oceanicos:latest
    ports:
      - "3001:3000"
    # ... other config

  api-2:
    image: omega-v-oceanicos:latest
    ports:
      - "3002:3000"
    # ... other config

  nginx:
    image: nginx:latest
    ports:
      - "3000:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - api-1
      - api-2
```

### Resource Limits

Set appropriate resource limits:

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

## Persistence

### SQLite Database

The API supports persistent storage using SQLite:

```bash
# Create data directory
mkdir -p data

# Run with persistence
docker-compose up -d
```

Data is stored in `./data/events.db` and persists across container restarts.

### Backup

```bash
# Backup database
docker-compose exec api cp /app/data/events.db /app/data/events.db.backup

# Or from host
cp data/events.db data/events.db.$(date +%Y%m%d).backup
```

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs api

# Check resource availability
docker stats

# Verify build
docker build -t test . --no-cache
```

### Health check failing

```bash
# Test health endpoint directly
docker exec omega-v-api wget -O- http://localhost:3000/health

# Check if port is accessible
docker exec omega-v-api netstat -tlnp | grep 3000
```

### High memory usage

- Reduce `maxHistorySize` in WebSocket broadcaster
- Implement event cleanup policies
- Use external persistence instead of in-memory event log

## Security

- Run containers with read-only root filesystem where possible
- Set appropriate user permissions
- Use secret management for sensitive data
- Enable HTTPS/TLS in production
- Implement rate limiting (enabled by default)
- Use network policies to restrict access

## Performance Tuning

- Set appropriate Node.js heap size: `NODE_OPTIONS="--max-old-space-size=1024"`
- Enable compression for API responses
- Configure appropriate keep-alive settings
- Monitor and adjust rate limiting thresholds
- Use connection pooling for external services

## References

- [Docker Official Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
