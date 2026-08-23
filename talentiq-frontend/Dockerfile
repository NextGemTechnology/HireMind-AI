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

# Nginx config for high-concurrency SPA routing, API load-balancing & rate limiting
RUN printf 'upstream backend_cluster {\n\
    least_conn;\n\
    server backend:8080 max_fails=3 fail_timeout=10s;\n\
    keepalive 64;\n\
}\n\
\n\
limit_req_zone $binary_remote_addr zone=otp_zone:10m rate=10r/s;\n\
limit_req_zone $binary_remote_addr zone=api_zone:20m rate=100r/s;\n\
\n\
server {\n\
    listen 80;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    client_max_body_size 25M;\n\
\n\
    # Gzip compression for high throughput\n\
    gzip on;\n\
    gzip_vary on;\n\
    gzip_min_length 1024;\n\
    gzip_proxied expired no-cache no-store private auth;\n\
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/json;\n\
\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
\n\
    # OTP / Forgot-Password High-Throughput Protected Rate-Limit Route\n\
    location /api/v1/auth/forgot-password {\n\
        limit_req zone=otp_zone burst=20 nodelay;\n\
        proxy_pass http://backend_cluster/api/v1/auth/forgot-password;\n\
        proxy_http_version 1.1;\n\
        proxy_set_header Connection "";\n\
        proxy_set_header Host $host;\n\
        proxy_set_header X-Real-IP $remote_addr;\n\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n\
        proxy_set_header X-Forwarded-Proto $scheme;\n\
    }\n\
\n\
    location /api {\n\
        limit_req zone=api_zone burst=50 nodelay;\n\
        proxy_pass http://backend_cluster/api;\n\
        proxy_http_version 1.1;\n\
        proxy_set_header Connection "";\n\
        proxy_set_header Host $host;\n\
        proxy_set_header X-Real-IP $remote_addr;\n\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n\
        proxy_set_header X-Forwarded-Proto $scheme;\n\
        proxy_set_header Upgrade $http_upgrade;\n\
        proxy_set_header Connection "upgrade";\n\
    }\n\
\n\
    location /v1 {\n\
        limit_req zone=api_zone burst=50 nodelay;\n\
        proxy_pass http://backend_cluster/api/v1;\n\
        proxy_http_version 1.1;\n\
        proxy_set_header Connection "";\n\
        proxy_set_header Host $host;\n\
        proxy_set_header X-Real-IP $remote_addr;\n\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n\
        proxy_set_header X-Forwarded-Proto $scheme;\n\
        proxy_set_header Upgrade $http_upgrade;\n\
        proxy_set_header Connection "upgrade";\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ || exit 1
