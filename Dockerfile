# ── Stage 1: Install & Build ──────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++ git && npm install -g pnpm@8

WORKDIR /app

# 1. Copy workspace manifests first for layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/types/package.json         packages/types/package.json
COPY packages/observer/package.json      packages/observer/package.json
COPY packages/verification/package.json  packages/verification/package.json
COPY packages/remember/package.json      packages/remember/package.json
COPY packages/mini/package.json          packages/mini/package.json
COPY apps/api/package.json               apps/api/package.json
COPY apps/web/package.json               apps/web/package.json

# 2. Install dependencies (layer cached until any manifest changes)
RUN pnpm install --frozen-lockfile

# 3. Copy source and build
COPY packages/ packages/
COPY apps/ apps/
COPY tsconfig.json ./
COPY bin/ bin/

RUN pnpm run build

# ── Stage 2: Production API Runtime ──────────────────────────────────────────
FROM node:20-alpine AS api

RUN npm install -g pnpm@8
WORKDIR /app

COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/bin ./bin

ENV NODE_ENV=production
EXPOSE 5000
CMD ["node", "apps/api/dist/index.js"]

# ── Stage 3: Production Web Static Serve ─────────────────────────────────────
FROM node:20-alpine AS web

RUN npm install -g pnpm@8 serve
WORKDIR /app

COPY --from=builder /app/apps/web/dist ./dist

EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
