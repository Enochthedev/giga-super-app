# Simple Dockerfile for delivery-service using tsx
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.base.json ./

# Copy shared code and service code
COPY shared ./shared
COPY delivery-service ./delivery-service

# Install all dependencies (including tsx)
WORKDIR /app/delivery-service
RUN npm ci

# Set environment
ENV NODE_ENV=production
ENV PORT=3005
ENV SERVICE_NAME=delivery-service

EXPOSE 3005

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3005/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run TypeScript directly with tsx
CMD ["npx", "tsx", "src/index.ts"]
