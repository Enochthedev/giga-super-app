# Fast Dockerfile for hotels-service - single stage with pre-compilation
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
COPY hotels-service ./hotels-service

# Install service dependencies and build
WORKDIR /app/hotels-service
RUN npm ci && npm run build && npm prune --production

# Set environment
ENV NODE_ENV=production
ENV PORT=3008
ENV SERVICE_NAME=hotels-service

EXPOSE 3008

# Health check
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3008/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run pre-compiled JavaScript - instant startup
CMD ["node", "dist/index.js"]
