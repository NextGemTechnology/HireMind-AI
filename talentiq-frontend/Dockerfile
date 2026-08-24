# ============================================================
# TalentIQ Frontend — Multi-stage Dockerfile
# Stage 1: Build with Node/Vite
# Stage 2: Serve with Nginx
# ============================================================

# ── Stage 1: Build ────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Cache dependencies
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
ENV VITE_API_BASE_URL=/api/v1
RUN npm run build

# ── Stage 2: Serve ────────────────────────────────────────────
FROM nginx:1.27-alpine

LABEL maintainer="TalentIQ Engineering <engineering@talentiq.ai>"
LABEL description="TalentIQ AI Talent Intelligence Platform — Frontend"

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy optimized Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ || exit 1
