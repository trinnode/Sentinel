# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files from dashboard
COPY packages/sentinel-dashboard/package*.json packages/sentinel-dashboard/
COPY packages/sentinel-dashboard/tsconfig.json packages/sentinel-dashboard/

# Install dependencies
WORKDIR /app/packages/sentinel-dashboard
RUN npm install --legacy-peer-deps

# Copy dashboard source
COPY packages/sentinel-dashboard/src ./src
COPY packages/sentinel-dashboard/public ./public
COPY packages/sentinel-dashboard/tailwind.config.js ./
COPY packages/sentinel-dashboard/postcss.config.js ./

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built application
COPY --from=builder /app/packages/sentinel-dashboard/build /usr/share/nginx/html

# Copy nginx configuration
COPY packages/sentinel-dashboard/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
