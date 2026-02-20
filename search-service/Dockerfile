# Fast Dockerfile for search-service - single stage with pre-compilation
FROM node:20-alpine

WORKDIR /app

# Copy root package files for workspace
COPY package*.json ./
COPY tsconfig.base.json ./

# Copy shared code first (changes less frequently)
COPY shared ./shared

# Install shared dependencies
WORKDIR /app/shared
RUN npm ci --omit=dev

# Copy service code
WORKDIR /app
COPY search-service ./search-service

# Install service dependencies and build
WORKDIR /app/search-service
RUN npm ci && npm run build && npm prune --production

# Set environment
ENV NODE_ENV=production
ENV PORT=8080
ENV SERVICE_NAME=search-service

EXPOSE 8080

# Health check
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run pre-compiled JavaScript - instant startup
CMD ["node", "dist/index.js"]
