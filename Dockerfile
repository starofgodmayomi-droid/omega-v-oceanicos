FROM node:20-alpine AS base
RUN npm i -g pnpm@8
WORKDIR /app

FROM base AS builder
COPY pnpm-workspace.yaml package.json ./
COPY shared/ ./shared/
COPY packages/ ./packages/
COPY apps/ ./apps/
RUN pnpm install && pnpm --recursive run build

FROM base AS runner
COPY --from=builder /app /app
EXPOSE 4102 3000
