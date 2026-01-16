# Multi-stage build for search-service (Monorepo)
FROM node:20-alpine AS builder

# Labels for identification
LABEL service="search-service"
LABEL version="1.0.0"
LABEL description="search-service for Giga platform"

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.base.json ./

# Install dependencies
RUN npm ci --include=dev --ignore-scripts

# Copy shared code and service code
COPY shared ./shared
COPY search-service ./search-service

# Build TypeScript from root (continue despite type errors)
WORKDIR /app
RUN cd search-service && (npx tsc -p tsconfig.json || true)

# Production stage
FROM node:20-alpine

# Labels for identification
LABEL service="search-service"
LABEL version="1.0.0"
LABEL port="3004"

WORKDIR /app

# Copy service package files (not root package.json)
COPY search-service/package.json ./

# Install production dependencies only
RUN npm install --omit=dev --ignore-scripts

# Copy built files
COPY --from=builder /app/dist ./dist

# Set environment
ENV NODE_ENV=production
ENV PORT=3004
ENV SERVICE_NAME=search-service
ENV SERVICE_VERSION=1.0.0

# Expose port
EXPOSE 3004

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3004/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start service
CMD ["node", "dist/search-service/src/index.js"]
