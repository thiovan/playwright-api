# ── Stage 1: Build Frontend SPA (Vite + Shadcn UI) ───────────────────────────
FROM node:20-alpine AS web-builder
WORKDIR /web

# Layer cache for frontend dependencies
COPY web/package.json web/package-lock.json* ./
RUN npm ci --no-audit --no-fund 2>/dev/null || npm install --no-audit --no-fund

# Copy frontend source files and compile static bundle to /web/dist
COPY web/ ./
RUN npm run build

# ── Stage 2: Playwright Runtime & API Engine ─────────────────────────────────
FROM mcr.microsoft.com/playwright:v1.60.0-noble

WORKDIR /app

# 1. Install OS packages first (high cache hit rate, rarely invalidates)
RUN apt-get update && \
    apt-get install -y --no-install-recommends xvfb x11vnc novnc websockify && \
    rm -rf /var/lib/apt/lists/*

# 2. Layer cache & install backend production dependencies only
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --no-audit --no-fund 2>/dev/null || npm install --omit=dev --no-audit --no-fund

# 3. Copy compiled frontend assets ONLY (zero devDependencies or TS compiler bloat)
COPY --from=web-builder /web/dist ./web/dist

# 4. Copy backend application source code & API specs
COPY src/ ./src/
COPY docs/ ./docs/

# 5. Ensure recordings directory exists
RUN mkdir -p /app/recordings

# Expose API port (3000) and noVNC Web port (8080)
EXPOSE 3000 8080

# Container health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/v1/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Setup VNC entrypoint
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "src/index.js"]
