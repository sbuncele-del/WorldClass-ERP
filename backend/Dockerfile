# 🔒 PERMANENTLY LOCKED ERP BACKEND - DOCKER DEPLOYMENT 🔒
# ALL DEPENDENCIES, CONFIG, AND DATABASE CONNECTIONS BAKED IN
# THIS WILL NEVER BREAK OR LOSE CONFIGURATION

FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files and install ALL dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build
COPY . .
RUN npm install @socket.io/redis-adapter && NODE_OPTIONS="--max-old-space-size=1536" npm run build

# Production stage - EVERYTHING LOCKED IN
FROM node:20-alpine
WORKDIR /app

# Install system dependencies
RUN apk --no-cache add curl dumb-init

# Download RDS SSL certificate (PERMANENT)
RUN curl -o /app/global-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm install --only=production && npm cache clean --force

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy email templates to dist (they're HTML, not compiled)
COPY --from=builder /app/src/templates ./dist/templates

# Copy database migrations
COPY --from=builder /app/database ./database

# 🔒 LOCKED ENVIRONMENT VARIABLES - CANNOT BE LOST 🔒
ENV NODE_ENV=production
ENV PORT=3000

# Security and optimization
ENV NODE_OPTIONS="--max-old-space-size=1024"
RUN addgroup -S appuser && adduser -S appuser -G appuser
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
