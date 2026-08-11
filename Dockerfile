FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ 

# Copy root configurations
COPY package.json package-lock.json tsconfig.base.json ./
COPY turbo.json ./

# Copy all packages and apps
COPY packages ./packages
COPY apps ./apps

# Install all dependencies (workspaces)
RUN npm ci

# Build the entire monorepo using Turbo
RUN npx turbo run build

# --- API Production Image ---
FROM node:20-alpine AS api
WORKDIR /app

# Copy built artifacts from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api ./apps/api

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Start API
CMD ["npm", "run", "start", "--workspace", "apps/api"]

# --- Web Production Image ---
FROM node:20-alpine AS web
WORKDIR /app

# Install serve for static hosting
RUN npm install -g serve

# Copy built artifacts from builder
COPY --from=builder /app/apps/web/dist ./dist

ENV PORT=80

EXPOSE 80

# Start Web server
CMD ["serve", "-s", "dist", "-l", "80"]
