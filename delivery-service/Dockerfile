# Multi-stage build for delivery-service (Monorepo)
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files for shared dependencies
COPY package*.json ./
COPY tsconfig.base.json ./

# Copy shared code first (needed for compilation)
COPY shared ./shared

# Copy service package files and source
COPY delivery-service ./delivery-service

# Install root dependencies
RUN npm ci --include=dev --ignore-scripts

# Install service-specific dependencies
WORKDIR /app/delivery-service
RUN npm ci --include=dev --ignore-scripts 2>/dev/null || npm install --include=dev --ignore-scripts

# Build TypeScript
WORKDIR /app/delivery-service
RUN npx tsc && \
    echo "Build complete" && \
    ls -la ../dist/delivery-service/delivery-service/src/ 2>/dev/null || true

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy service package files
COPY delivery-service/package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev --ignore-scripts 2>/dev/null || npm install --omit=dev --ignore-scripts

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Set environment
ENV NODE_ENV=production
ENV PORT=3005
ENV SERVICE_NAME=delivery-service

EXPOSE 3005

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3005/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start service - correct path with rootDir=".."
CMD ["node", "dist/delivery-service/delivery-service/src/index.js"]
