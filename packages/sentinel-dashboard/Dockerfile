# Build stage
FROM node:18-alpine AS builder

# Set working directory to the root of the monorepo
WORKDIR /app

# Copy root package files
COPY package*.json ./

# Install all dependencies from the root
# Use npm ci for reproducible builds (requires package-lock.json)
# Fall back to npm install if package-lock.json doesn't exist
RUN npm install --legacy-peer-deps --no-audit --no-fund


# Copy the entire project context
# This includes all workspaces needed for the build
COPY . .

# Set the working directory to the dashboard package
WORKDIR /app/packages/sentinel-dashboard

# Build the application from within its own directory
# This command now has access to the fully installed node_modules from the root
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built application from the correct location in the builder stage
COPY --from=builder /app/packages/sentinel-dashboard/build /usr/share/nginx/html

# Copy nginx configuration from the dashboard's package directory
COPY --from=builder /app/packages/sentinel-dashboard/nginx.conf /etc/nginx/conf.d/default.conf

# Create non-root user
RUN addgroup -g 1001 -S nginx && \
    adduser -S -D -H -u 1001 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx

# Create logs directory and set permissions
RUN mkdir -p /var/log/nginx && \
    mkdir -p /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /usr/share/nginx/html

# Switch to non-root user
USER nginx

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80 || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
