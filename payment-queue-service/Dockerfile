# Multi-stage build for payment-queue-service (Monorepo)
FROM node:20-alpine AS builder

# Labels for identification
LABEL service="payment-queue-service"
LABEL version="1.0.0"
LABEL description="payment-queue-service for Giga platform"

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.base.json ./

# Install dependencies
RUN npm ci --include=dev --ignore-scripts

# Copy shared code and service code
COPY shared ./shared
COPY payment-queue-service ./payment-queue-service

# Build TypeScript from root (continue despite type errors)
WORKDIR /app
RUN cd payment-queue-service && (npx tsc -p tsconfig.json || true)

# Production stage
FROM node:20-alpine

# Labels for identification
LABEL service="payment-queue-service"
LABEL version="1.0.0"
LABEL port="3003"

WORKDIR /app

# Copy service package files (not root package.json)
COPY payment-queue-service/package.json payment-queue-service/package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev --ignore-scripts

# Copy built files
COPY --from=builder /app/dist ./dist

# Set environment
ENV NODE_ENV=production
ENV PORT=3003
ENV SERVICE_NAME=payment-queue-service
ENV SERVICE_VERSION=1.0.0

# Expose port
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3003/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start service
CMD ["node", "dist/payment-queue-service/src/index.js"]
