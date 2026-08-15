# syntax=docker/dockerfile:1

# Ω∞v Oceanicos API
#
# The repository had no packaging of any kind: every green pipeline proved
# the code passes its own tests, never that it runs. This produces the
# artifact, and CI proves it starts, serves, and refuses to start unsafely.

FROM node:20-alpine AS builder

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@8.8.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY packages ./packages
COPY apps/api ./apps/api

RUN pnpm install --frozen-lockfile

# Build only what the API needs. apps/web is a separate artifact.
RUN pnpm --filter @omega-v/types build \
 && pnpm --filter @omega-v/observer build \
 && pnpm --filter @omega-v/verification build \
 && pnpm --filter @omega-v/attestation build \
 && pnpm --filter @omega-v/api build

FROM node:20-alpine AS runtime

ENV NODE_ENV=production
ENV API_PORT=3000

# The API writes its runtime store and append-only log under this path.
ENV OMEGA_RUNTIME_STORE_PATH=/var/lib/omega-v/runtime.json

WORKDIR /app

COPY --from=builder /app /app

RUN addgroup -S omega && adduser -S omega -G omega \
 && mkdir -p /var/lib/omega-v \
 && chown -R omega:omega /var/lib/omega-v /app

USER omega

EXPOSE 3000

# No default signing key is baked in, and none should be. The service
# throws MissingSigningKeyError at startup unless OMEGA_SIGNING_KEY is
# supplied, because a key shipped in an image is a key everyone has.
CMD ["node", "apps/api/dist/index.js"]
