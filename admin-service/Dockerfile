# Multi-stage build for admin-service (Monorepo)
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files for shared dependencies
COPY package*.json ./
COPY tsconfig.base.json ./

# Copy shared code first (needed for compilation)
COPY shared ./shared

# Copy service package files and source
COPY admin-service ./admin-service

# Install root dependencies
RUN npm ci --include=dev --ignore-scripts

# Install service-specific dependencies
WORKDIR /app/admin-service
RUN npm ci --include=dev --ignore-scripts 2>/dev/null || npm install --include=dev --ignore-scripts

# Build TypeScript
WORKDIR /app/admin-service
RUN echo "=== TypeScript Build ===" && \
    echo "Files to compile:" && \
    find src -name "*.ts" | head -20 && \
    echo "Running tsc..." && \
    npx tsc --listEmittedFiles 2>&1 | head -50 && \
    echo "=== Build complete ===" && \
    ls -la ../dist/admin-service/ 2>/dev/null || echo "Checking alternate paths..." && \
    ls -la ../dist/ 2>/dev/null || true

# Verify build output exists
RUN if [ ! -f /app/dist/admin-service/admin-service/src/index.js ]; then \
      if [ ! -f /app/dist/admin-service/src/index.js ]; then \
        echo "=== BUILD VERIFICATION ===" && \
        echo "Looking for index.js..." && \
        find /app/dist -name "index.js" 2>/dev/null || echo "No index.js found" && \
        echo "Dist structure:" && \
        find /app/dist -type f 2>/dev/null | head -30 || echo "No dist folder" && \
        exit 1; \
      fi; \
    fi && \
    echo "Build verified successfully"

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy service package files
COPY admin-service/package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev --ignore-scripts 2>/dev/null || npm install --omit=dev --ignore-scripts

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Set environment
ENV NODE_ENV=production
ENV PORT=3002
ENV SERVICE_NAME=admin-service

EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start service - try both possible paths
CMD ["sh", "-c", "node dist/admin-service/admin-service/src/index.js 2>/dev/null || node dist/admin-service/src/index.js"]
