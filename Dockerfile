# syntax=docker/dockerfile:1
# Multi-stage production container for Ω∞v Oceanicos Zero-Entropy OS

FROM node:22-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

# Stage 1: Build all packages and web assets
FROM base AS builder
COPY . .
RUN pnpm install --no-frozen-lockfile
RUN pnpm run build

# Stage 2: Production API service
FROM base AS api
ENV NODE_ENV=production \
    PORT=5000 \
    HOST=0.0.0.0 \
    OMEGA_LEDGER_PATH=/app/data/oceanicos.jsonl
COPY --from=builder /app /app
RUN mkdir -p /app/data
EXPOSE 5000
CMD ["pnpm", "--filter", "@oceanicos/api", "start"]

# Stage 3: Production Web Cockpit service
FROM base AS web
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0
COPY --from=builder /app /app
EXPOSE 3000
CMD ["pnpm", "--filter", "@oceanicos/web", "preview"]
