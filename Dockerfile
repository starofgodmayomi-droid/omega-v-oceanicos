# ── Stage 1: Install & Build ──────────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN apk add --no-cache python3 make g++ git && npm install -g pnpm@10.34.5

WORKDIR /app

# 1. Copy the complete workspace before install.
# The root build is recursive, so every workspace manifest must be visible to pnpm.
# A partial manifest list can produce an apparently successful install followed by
# missing dev/type dependencies when a previously omitted package is built.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/ packages/
COPY apps/ apps/

# 2. Install the complete workspace dependency graph.
RUN pnpm install --frozen-lockfile

# 3. Copy root build inputs and build.
COPY tsconfig.json ./
COPY bin/ bin/

ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm run build

# ── Stage 2: Production API Runtime ──────────────────────────────────────────
FROM node:22-alpine AS api

RUN npm install -g pnpm@10.34.5
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
FROM node:22-alpine AS web

WORKDIR /app

COPY --from=builder /app/apps/web/dist ./dist
COPY --from=builder /app/apps/web/server.mjs ./server.mjs

ENV NODE_ENV=production
ENV WEB_PORT=3000
EXPOSE 3000
CMD ["node", "server.mjs"]
