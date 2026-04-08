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

ARG XDFC_APP_UID=10001
ARG XDFC_APP_GID=10001

RUN apk add --no-cache ca-certificates tzdata curl postgresql-client

# Keep runtime paths aligned with docker-compose volume mounts.
RUN addgroup -S -g "${XDFC_APP_GID}" xdfcgroup \
    && adduser -S -D -H -u "${XDFC_APP_UID}" -G xdfcgroup xdfcuser
WORKDIR /app
RUN mkdir -p /app/uploads /app/backups \
    && chown -R "${XDFC_APP_UID}:${XDFC_APP_GID}" /app

COPY --from=builder /app/xdfc-server /app/xdfc-server

USER xdfcuser

ENV PORT=8080 \
    GIN_MODE=release \
    TZ=Asia/Shanghai

EXPOSE 8080

CMD ["./xdfc-server"]
