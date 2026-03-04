FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create downloads directory
RUN mkdir -p downloads

# Set user to non-root for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S arattix -u 1001
RUN chown -R arattix:nodejs /app
USER arattix

# Expose port (if needed for web interface)
EXPOSE 3000

# Default command
CMD ["node", "Example/docker-bot.js"]