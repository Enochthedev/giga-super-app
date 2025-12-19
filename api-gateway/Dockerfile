# Use official Node.js runtime as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY src/ ./src/

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S gateway -u 1001

# Change ownership of app directory
RUN chown -R gateway:nodejs /app
USER gateway

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node src/health-check.js

# Start the application
CMD ["npm", "start"]