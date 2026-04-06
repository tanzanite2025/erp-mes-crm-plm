# --- Stage 1: Build ---
FROM golang:alpine AS builder

ENV CGO_ENABLED=0 \
    GOOS=linux \
    GOPROXY=https://goproxy.cn,direct

RUN apk add --no-cache git tzdata

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -ldflags="-s -w" -o xdfc-server .

# --- Stage 2: Runtime ---
FROM alpine:latest

RUN apk add --no-cache ca-certificates tzdata curl postgresql-client

# Keep runtime paths aligned with docker-compose volume mounts.
RUN addgroup -S xdfcgroup && adduser -S xdfcuser -G xdfcgroup
WORKDIR /app
RUN mkdir -p /app/uploads /app/backups && chown -R xdfcuser:xdfcgroup /app

COPY --from=builder /app/xdfc-server /app/xdfc-server

USER xdfcuser

ENV PORT=8080 \
    GIN_MODE=release \
    TZ=Asia/Shanghai

EXPOSE 8080

CMD ["./xdfc-server"]
