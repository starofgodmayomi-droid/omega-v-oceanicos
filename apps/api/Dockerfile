# syntax=docker/dockerfile:1

# Ω∞v Oceanicos API
#
# The repository had no packaging of any kind: every green pipeline proved
# the code passes its own tests, never that it runs. This produces the
# artifact, and CI proves it starts, serves, and refuses to start unsafely.

FROM node:22-alpine AS builder

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.34.5 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY scripts ./scripts
COPY packages ./packages
COPY apps/api ./apps/api
COPY apps/web ./apps/web

RUN pnpm install --frozen-lockfile

# One origin serves both: the API and the static client it talks to.
RUN pnpm --filter @omega-v/types build \
 && pnpm --filter @omega-v/observer build \
 && pnpm --filter @omega-v/verification build \
 && pnpm --filter @omega-v/attestation build \
 && pnpm --filter @omega-v/dissensus build \
 && pnpm --filter @omega-v/remember build \
 && pnpm --filter @omega-v/mini build \
 && pnpm --filter @omega-v/api build \
 && pnpm --filter @omega-v/web build

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
ENV API_PORT=3000
# Exposed images require caller authentication by default. Local source runs can
# explicitly choose OMEGA_AUTH_MODE=local when they are not network-exposed.
ENV OMEGA_AUTH_MODE=required

# The API writes its runtime store and append-only log under this path.
ENV OMEGA_RUNTIME_STORE_PATH=/var/lib/omega-v/runtime.json

WORKDIR /app

COPY --from=builder /app /app

RUN addgroup -S omega && adduser -S omega -G omega \
 && mkdir -p /var/lib/omega-v \
 && chown -R omega:omega /var/lib/omega-v /app

USER omega

EXPOSE 3000

# Container orchestration may use this local probe, while readiness remains
# governed by the API's explicit /health response and its non-secret evidence.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD node -e "fetch('http://127.0.0.1:' + (process.env.API_PORT || 3000) + '/health').then((response) => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1))"

# No default signing key is baked in, and none should be. The service
# throws MissingSigningKeyError at startup unless OMEGA_SIGNING_KEY is
# supplied, because a key shipped in an image is a key everyone has.
CMD ["node", "apps/api/dist/index.js"]
