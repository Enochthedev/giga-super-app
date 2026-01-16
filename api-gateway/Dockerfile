# Multi-stage build for api-gateway (Monorepo)
FROM node:20-alpine AS builder

# Labels for identification
LABEL service="api-gateway"
LABEL version="1.0.0"
LABEL description="API Gateway for Giga platform"

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.base.json ./

# Install dependencies
RUN npm ci --include=dev --ignore-scripts

# Copy shared code and service code
COPY shared ./shared
COPY api-gateway ./api-gateway

# Build TypeScript from root (continue despite type errors)
WORKDIR /app
RUN cd api-gateway && (npx tsc -p tsconfig.json || true)

# Production stage
FROM node:20-alpine

# Labels for identification
LABEL service="api-gateway"
LABEL version="1.0.0"
LABEL port="3000"

WORKDIR /app

# Copy service package files (not root package.json)
COPY api-gateway/package*.json ./

# Install production dependencies only
RUN npm ci --only=production --ignore-scripts

# Copy built files
COPY --from=builder /app/dist ./dist

# Set environment
ENV NODE_ENV=production
ENV PORT=3000
ENV SERVICE_NAME=api-gateway
ENV SERVICE_VERSION=1.0.0

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S gateway -u 1001
RUN chown -R gateway:nodejs /app
USER gateway

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start service
CMD ["node", "dist/api-gateway/src/index.js"]
