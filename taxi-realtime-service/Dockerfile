# Simple Dockerfile for taxi-realtime-service using tsx
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.base.json ./

# Copy shared code and service code
COPY shared ./shared
COPY taxi-realtime-service ./taxi-realtime-service

# Install all dependencies (including tsx)
WORKDIR /app/taxi-realtime-service
RUN npm ci

# Set environment
ENV NODE_ENV=production
ENV PORT=3006
ENV SERVICE_NAME=taxi-realtime-service

EXPOSE 3006

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3006/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run TypeScript directly with tsx
CMD ["npx", "tsx", "src/index.ts"]
