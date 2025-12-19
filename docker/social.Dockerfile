# Social Service Dockerfile for Railway deployment simulation
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY services/social ./src
COPY src/shared ./shared
COPY tsconfig.json ./

# Install TypeScript for development
RUN npm install -g typescript ts-node

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start the application
CMD ["ts-node", "src/index.ts"]