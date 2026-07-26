# --- Stage 1: Build Go API ---
FROM golang:1.26.5-alpine AS api-builder

ENV CGO_ENABLED=0 \
    GOOS=linux \
    GOPROXY=https://goproxy.cn,direct

RUN apk add --no-cache git tzdata

WORKDIR /app/server

COPY server/go.mod server/go.sum ./
RUN go mod download

COPY server ./
RUN go build -ldflags="-s -w" -o xdfc-server .

# --- Stage 2: Build Rust vehicle geometry parser CLI ---
FROM rust:1-alpine AS vehicle-geometry-parser-builder

RUN apk add --no-cache musl-dev

WORKDIR /app/vehicle-loading-engine

COPY vehicle-loading-engine/Cargo.toml vehicle-loading-engine/Cargo.lock ./
COPY vehicle-loading-engine/core/Cargo.toml core/Cargo.toml
COPY vehicle-loading-engine/wasm/Cargo.toml wasm/Cargo.toml
COPY vehicle-loading-engine/cli/Cargo.toml cli/Cargo.toml
COPY vehicle-loading-engine/core core
COPY vehicle-loading-engine/wasm wasm
COPY vehicle-loading-engine/cli cli
RUN cargo build --release --bin xdfc-vehicle-geometry-parser

# --- Stage 3: Runtime ---
FROM alpine:latest

ARG XDFC_APP_UID=10001
ARG XDFC_APP_GID=10001

RUN apk add --no-cache ca-certificates tzdata curl postgresql-client

# Keep runtime paths aligned with docker-compose volume mounts.
RUN addgroup -S -g "${XDFC_APP_GID}" xdfcgroup \
    && adduser -S -D -H -u "${XDFC_APP_UID}" -G xdfcgroup xdfcuser
WORKDIR /app
RUN mkdir -p /app/uploads /app/backups /app/storage \
    && chown -R "${XDFC_APP_UID}:${XDFC_APP_GID}" /app

COPY --from=api-builder /app/server/xdfc-server /app/xdfc-server
COPY --from=vehicle-geometry-parser-builder /app/vehicle-loading-engine/target/release/xdfc-vehicle-geometry-parser /app/xdfc-vehicle-geometry-parser

USER xdfcuser

ENV PORT=8080 \
    GIN_MODE=release \
    VEHICLE_GEOMETRY_PARSER_BIN=/app/xdfc-vehicle-geometry-parser \
    TZ=Asia/Shanghai

EXPOSE 8080

CMD ["./xdfc-server"]
