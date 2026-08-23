# Debian (slim), not Alpine, and Node 22 on purpose:
#   - @google-cloud/storage@8 requires Node >=22, sharp@0.35 requires >=20.9,
#     so the previous node:18 base could not run this app at all.
#   - sharp and ffmpeg-static/ffprobe-static ship prebuilt glibc binaries.
#     On Alpine's musl they need extra shims, so slim avoids a whole class
#     of "works locally, dies in the container" failures.
FROM node:22-slim

ENV NODE_ENV=production

WORKDIR /app

# Copy dependency files first (better layer caching)
COPY package*.json ./

# Install production dependencies only. Every package server.js actually
# imports at runtime lives in "dependencies" — nothing the app needs may sit
# in devDependencies, or this install silently drops it and the container
# crashes on first import.
RUN npm ci --omit=dev

# Copy app source (see .dockerignore — node_modules and .env never come in)
COPY . .

# Run as a non-root user
RUN addgroup --system appgroup \
 && adduser --system --ingroup appgroup appuser \
 && chown -R appuser:appgroup /app
USER appuser

# Cloud Run injects PORT (8080) and server.js honours it; this is documentation.
EXPOSE 8080

# node directly, not npm start, for proper signal handling
CMD ["node", "server.js"]
