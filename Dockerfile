# Multi-stage build for Ω∞v Oceanicos API
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8

# Copy workspace files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

# Copy all packages and apps
COPY packages ./packages
COPY apps ./apps

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build all packages and apps
RUN pnpm build

# Stage 2: Runtime
FROM node:20-alpine AS runtime

WORKDIR /app

# Install pnpm runtime
RUN npm install -g pnpm@8

# Copy workspace files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

# Copy package.json files from all packages
COPY packages ./packages
COPY apps/api ./apps/api

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/packages ./packages-dist

# Set environment variables
ENV NODE_ENV=production
ENV API_PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => { if (r.statusCode !== 200) throw new Error(r.statusCode); })" || exit 1

# Expose port
EXPOSE 3000

# Start API server
CMD ["node", "dist/apps/api/src/index.js"]
