FROM node:18-alpine AS builder

# Install dumb-init and openssl for Prisma
RUN apk add --no-cache dumb-init openssl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy Prisma schema for client generation
COPY prisma ./prisma

# Install dependencies (production only) and generate Prisma client
RUN npm install --omit=dev \
  && npx prisma generate \
  && npm cache clean --force

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S sentinel -u 1001

FROM node:18-alpine AS runtime

# Install dumb-init, curl, and openssl for Prisma
RUN apk add --no-cache dumb-init curl openssl

# Set working directory
WORKDIR /app

# Copy system files
COPY --from=builder /etc/passwd /etc/passwd
COPY --from=builder /etc/group /etc/group

# Copy installed dependencies
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p logs && chown -R sentinel:nodejs logs

# Create prisma directory for generated client
RUN mkdir -p node_modules/.prisma

# Change ownership of app directory
RUN chown -R sentinel:nodejs /app

# Switch to non-root user
USER sentinel

# Expose ports
EXPOSE 3001 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start the application
CMD ["npm", "start"]
