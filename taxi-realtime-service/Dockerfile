# Multi-stage build for taxi-realtime-service (Monorepo)
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files for shared dependencies
COPY package*.json ./
COPY tsconfig.base.json ./

# Copy shared code first (needed for compilation)
COPY shared ./shared

# Copy service package files and source
COPY taxi-realtime-service ./taxi-realtime-service

# Install root dependencies
RUN npm ci --include=dev --ignore-scripts

# Install service-specific dependencies
WORKDIR /app/taxi-realtime-service
RUN npm ci --include=dev --ignore-scripts 2>/dev/null || npm install --include=dev --ignore-scripts

# Build TypeScript
WORKDIR /app/taxi-realtime-service
RUN echo "=== TypeScript Build ===" && \
    npx tsc --listEmittedFiles 2>&1 | head -30 && \
    echo "=== Build complete ===" && \
    ls -la ../dist/taxi-realtime-service/ 2>/dev/null || true

# Verify build output exists
RUN if [ ! -f /app/dist/taxi-realtime-service/taxi-realtime-service/src/index.js ]; then \
      if [ ! -f /app/dist/taxi-realtime-service/src/index.js ]; then \
        echo "=== BUILD VERIFICATION ===" && \
        find /app/dist -name "index.js" 2>/dev/null || echo "No index.js found" && \
        exit 1; \
      fi; \
    fi && \
    echo "Build verified successfully"

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy service package files
COPY taxi-realtime-service/package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev --ignore-scripts 2>/dev/null || npm install --omit=dev --ignore-scripts

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Set environment
ENV NODE_ENV=production
ENV PORT=3006
ENV SERVICE_NAME=taxi-realtime-service

EXPOSE 3006

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3006/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start service - try both possible paths
CMD ["sh", "-c", "node dist/taxi-realtime-service/taxi-realtime-service/src/index.js 2>/dev/null || node dist/taxi-realtime-service/src/index.js"]
