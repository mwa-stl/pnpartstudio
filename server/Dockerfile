FROM node:18.20.4-alpine3.19

WORKDIR /app

# Copy dependency files first (better layer caching)
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy app source
COPY . .

# Set ownership
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 4000

# Use node directly (not npm start) for proper signal handling
CMD ["node", "server.js"]