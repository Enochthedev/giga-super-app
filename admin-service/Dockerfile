FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src ./src
RUN npm run build

FROM node:18-alpine AS production
RUN apk add --no-cache dumb-init
RUN addgroup -g 1001 -S nodejs && adduser -S admin -u 1001
WORKDIR /app
COPY --from=builder --chown=admin:nodejs /app/dist ./dist
COPY --from=builder --chown=admin:nodejs /app/package*.json ./
RUN npm ci --only=production && npm cache clean --force
USER admin
EXPOSE 3006
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3006/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
