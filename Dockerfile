# Multi-stage build for API Gateway
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.build.json ./

# Install ALL dependencies (including devDependencies for build)
# Skip prepare script (husky) in Docker
RUN npm ci --include=dev --ignore-scripts

# Copy source code
COPY api-gateway ./api-gateway
COPY shared ./shared

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
# Skip prepare script (husky) in Docker
RUN npm ci --only=production --ignore-scripts

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared

# Expose port (Railway will set PORT env var)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3000}/health || exit 1

# Start the application
CMD ["node", "dist/api-gateway/src/index.js"]
