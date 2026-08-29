FROM golang:1.26.5-alpine AS builder

WORKDIR /src
COPY attendance-gateway/ /src/attendance-gateway/
WORKDIR /src/attendance-gateway
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" \
    -o /out/xdfc-isup-gateway ./cmd/isup-gateway

FROM alpine:3.22

RUN apk add --no-cache ca-certificates tzdata \
    && addgroup -S xdfc \
    && adduser -S -D -H -G xdfc xdfc \
    && mkdir -p /etc/xdfc-isup-gateway /var/lib/xdfc-isup-gateway/queue /var/lib/xdfc-isup-gateway/dead-letter \
    && chown -R xdfc:xdfc /etc/xdfc-isup-gateway /var/lib/xdfc-isup-gateway

COPY --from=builder /out/xdfc-isup-gateway /usr/local/bin/xdfc-isup-gateway
COPY attendance-gateway/config/config.example.json /etc/xdfc-isup-gateway/config.example.json

USER xdfc
ENV CONFIG_FILE=/etc/xdfc-isup-gateway/config.json \
    TZ=Asia/Shanghai

EXPOSE 9090
VOLUME ["/etc/xdfc-isup-gateway", "/var/lib/xdfc-isup-gateway", "/opt/xdfc-isup-sdk-bridge"]

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:9090/healthz

ENTRYPOINT ["/usr/local/bin/xdfc-isup-gateway"]
