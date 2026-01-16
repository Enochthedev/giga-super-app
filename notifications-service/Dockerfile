# Multi-stage build for notifications-service (Monorepo)
FROM node:20-alpine AS builder

# Labels for identification
LABEL service="notifications-service"
LABEL version="1.0.0"
LABEL description="notifications-service for Giga platform"

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.base.json ./

# Install dependencies
RUN npm ci --include=dev --ignore-scripts

# Copy shared code and service code
COPY shared ./shared
COPY notifications-service ./notifications-service

# Build TypeScript - show errors but continue to verification step
WORKDIR /app/notifications-service
RUN npx tsc -p tsconfig.json 2>&1 || true

# Verify build output exists - fail with clear message if compilation failed
RUN if [ ! -f /app/dist/notifications-service/src/index.js ]; then \
      echo "=== BUILD FAILED ===" && \
      echo "TypeScript compilation did not produce output." && \
      echo "Re-running tsc to show errors:" && \
      npx tsc -p tsconfig.json 2>&1 || true && \
      exit 1; \
    fi && \
    echo "Build successful - index.js found" && \
    ls -la /app/dist/notifications-service/src/

# Production stage
FROM node:20-alpine

# Labels for identification
LABEL service="notifications-service"
LABEL version="1.0.0"
LABEL port="3007"

WORKDIR /app

# Copy service package files (not root package.json)
COPY notifications-service/package.json notifications-service/package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev --ignore-scripts

# Copy built files
COPY --from=builder /app/dist ./dist

# Set environment
ENV NODE_ENV=production
ENV PORT=3007
ENV SERVICE_NAME=notifications-service
ENV SERVICE_VERSION=1.0.0

# Expose port
EXPOSE 3007

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3007/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start service
CMD ["node", "dist/notifications-service/src/index.js"]
