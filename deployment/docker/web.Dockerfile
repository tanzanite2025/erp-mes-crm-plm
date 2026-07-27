FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

COPY package.json pnpm-lock.yaml ./
COPY scripts/setup-git-hooks.mjs ./scripts/setup-git-hooks.mjs
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM alpine:3.23

RUN apk upgrade --no-cache \
    && apk add --no-cache 'nginx>=1.28.3-r6' \
    && rm -f /etc/nginx/http.d/default.conf \
    && mkdir -p /usr/share/nginx/html /var/cache/nginx /var/lib/nginx /var/log/nginx \
    && chown -R nginx:nginx /var/cache/nginx /var/lib/nginx /var/log/nginx

COPY deployment/nginx/erp-web.conf /etc/nginx/nginx.conf
COPY --from=builder /app/dist /usr/share/nginx/html

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
