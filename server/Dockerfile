
# Debian slim with Node.js 24
FROM node:24-slim

ENV NODE_ENV=production

WORKDIR /app

# Copy dependency files first
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy application source
COPY . .

# Run as a non-root user
RUN addgroup --system appgroup \
 && adduser --system --ingroup appgroup appuser \
 && chown -R appuser:appgroup /app

USER appuser

# Cloud Run uses PORT (typically 8080)
EXPOSE 8080

# Start the application
CMD ["node", "server.js"]
