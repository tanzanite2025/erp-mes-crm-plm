# Stage 1: Build (Rust 1.88 on Debian Bookworm)
# ---------------------------------------------------
FROM rust:1.88-bookworm as builder

WORKDIR /usr/src/watchdog
COPY . .

# 编译生产环境优化后的二进制文件
RUN cargo build --release

# ---------------------------------------------------
# Stage 2: Runtime (Minimal Debian Slim)
# ---------------------------------------------------
FROM debian:bookworm-slim

# 安装必要的运行时库 (openssl, ca-certificates 为数据库连接/安全验证所需)
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 从构建阶段拷贝编译好的二进制
COPY --from=builder /usr/src/watchdog/target/release/xdfc-watchdog /app/watchdog

# 默认环境变量配置
ENV RUST_LOG=info

# 启动极致监控哨兵
CMD ["./watchdog"]
