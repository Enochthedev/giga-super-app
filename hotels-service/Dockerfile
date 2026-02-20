# Multi-stage build for Hotels Service
# This Dockerfile is designed to be built from the repo root with:
# docker build -f hotels-service/Dockerfile .
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files from hotels-service
COPY hotels-service/package*.json ./
COPY hotels-service/tsconfig.json ./

# Install dependencies (skip prepare scripts like husky)
RUN npm ci --ignore-scripts

# Copy source code from hotels-service
COPY hotels-service/src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files and install production dependencies
COPY hotels-service/package*.json ./
RUN npm ci --only=production --ignore-scripts

# Copy built files
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3008

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3008/health || exit 1

# Start the service
CMD ["node", "dist/index.js"]
