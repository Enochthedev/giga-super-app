# Simple Dockerfile for payment-queue-service using tsx
FROM node:20-alpine
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.base.json ./

# Copy shared code and service code
COPY shared ./shared
COPY payment-queue-service ./payment-queue-service

# Install shared dependencies first
WORKDIR /app/shared
RUN pnpm install --frozen-lockfile --prod

# Install service dependencies
WORKDIR /app/payment-queue-service
RUN pnpm install --frozen-lockfile

# Set environment
ENV NODE_ENV=production
ENV PORT=3003
ENV SERVICE_NAME=payment-queue-service

EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3003/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run TypeScript directly with tsx
CMD ["npx", "tsx", "src/index.ts"]
