FROM node:22-bookworm-slim
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --no-frozen-lockfile
ENV NODE_ENV=production PORT=5000 HOST=0.0.0.0 LEDGER_PATH=/app/data/oceanicos.jsonl
RUN mkdir -p /app/data
EXPOSE 5000
CMD ["pnpm", "--filter", "@oceanicos/api", "dev"]
