FROM node:20-alpine
RUN apk add --no-cache python3 make g++ git && npm install -g pnpm
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY packages/ ./packages/
COPY apps/ ./apps/
RUN pnpm install && pnpm run build
EXPOSE 5000 3000
