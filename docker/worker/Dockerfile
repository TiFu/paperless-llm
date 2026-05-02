# Multi-stage build for efficient image size
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY worker/package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY worker/ ./

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install production dependencies only
COPY worker/package*.json ./
RUN npm ci --production

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/migrations ./migrations

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose no ports (worker doesn't need incoming connections)

# Set entrypoint
ENTRYPOINT ["node", "dist/index.js"]

# Default to llm mode (can be overridden)
CMD ["--mode=llm"]
