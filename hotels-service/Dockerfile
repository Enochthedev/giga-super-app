# Fast Dockerfile for hotels-service - single stage with pre-compilation
FROM node:20-alpine
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy root package files for workspace
COPY package*.json ./
COPY tsconfig.base.json ./

# Copy shared code first (changes less frequently)
COPY shared ./shared

# Install shared dependencies
WORKDIR /app/shared
RUN pnpm install --frozen-lockfile --prod

# Copy service code
WORKDIR /app
COPY hotels-service ./hotels-service

# Install service dependencies and build
WORKDIR /app/hotels-service
RUN pnpm install --frozen-lockfile && pnpm run build && pnpm prune --prod

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
