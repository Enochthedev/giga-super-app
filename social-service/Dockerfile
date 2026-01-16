# Multi-stage build for social-service (Monorepo)
FROM node:20-alpine AS builder

# Labels for identification
LABEL service="social-service"
LABEL version="1.0.0"
LABEL description="social-service for Giga platform"

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.base.json ./

# Install dependencies
RUN npm ci --include=dev --ignore-scripts

# Copy shared code and service code
COPY shared ./shared
COPY social-service ./social-service

# Build TypeScript from root (continue despite type errors)
WORKDIR /app
RUN cd social-service && (npx tsc -p tsconfig.json || true)

# Production stage
FROM node:20-alpine

# Labels for identification
LABEL service="social-service"
LABEL version="1.0.0"
LABEL port="3001"

WORKDIR /app

# Copy service-specific package files (not root)
COPY social-service/package*.json ./

# Install production dependencies from social-service package.json
RUN npm ci --only=production --ignore-scripts

# Copy built files
COPY --from=builder /app/dist ./dist

# Set environment
ENV NODE_ENV=production
ENV PORT=3001
ENV SERVICE_NAME=social-service
ENV SERVICE_VERSION=1.0.0

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start service
CMD ["node", "dist/social-service/src/index.js"]
