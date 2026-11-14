# ── Stage 1: Install & Build ──────────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN apk add --no-cache python3 make g++ git && npm install -g pnpm@10.34.5

WORKDIR /app

# 1. Copy workspace manifests first for layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/types/package.json         packages/types/package.json
COPY packages/observer/package.json      packages/observer/package.json
COPY packages/verification/package.json  packages/verification/package.json
COPY packages/remember/package.json      packages/remember/package.json
COPY packages/mini/package.json          packages/mini/package.json
COPY packages/attestation/package.json   packages/attestation/package.json
COPY packages/kernel/package.json        packages/kernel/package.json
COPY apps/api/package.json               apps/api/package.json
COPY apps/web/package.json               apps/web/package.json

# 2. Install dependencies (layer cached until any manifest changes)
RUN pnpm install --frozen-lockfile

# 3. Copy source and build
COPY packages/ packages/
COPY apps/ apps/
COPY tsconfig.json ./
COPY bin/ bin/

ARG VITE_API_URL=
ARG VITE_AUTH0_DOMAIN=
ARG VITE_AUTH0_CLIENT_ID=
ARG VITE_AUTH0_AUDIENCE=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_AUTH0_DOMAIN=$VITE_AUTH0_DOMAIN
ENV VITE_AUTH0_CLIENT_ID=$VITE_AUTH0_CLIENT_ID
ENV VITE_AUTH0_AUDIENCE=$VITE_AUTH0_AUDIENCE

RUN pnpm run build

# ── Stage 2: Production API Runtime ──────────────────────────────────────────
FROM node:22-alpine AS api

RUN npm install -g pnpm@10.34.5
WORKDIR /app

COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/apps/web/dist ./apps/web/dist
COPY --from=builder /app/bin ./bin

ENV NODE_ENV=production
ENV OMEGA_WEB_DIST=/app/apps/web/dist
EXPOSE 5000
CMD ["node", "apps/api/dist/index.js"]

# ── Stage 3: Production Web Static Serve ─────────────────────────────────────
FROM node:22-alpine AS web

RUN npm install -g pnpm@10.34.5 serve
WORKDIR /app

COPY --from=builder /app/apps/web/dist ./dist

EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
