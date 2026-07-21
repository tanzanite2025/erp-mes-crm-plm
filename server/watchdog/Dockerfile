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

# 默认环境变量配置：固定 UTF-8，避免容器日志在中文输出时被运行时环境误解码
ENV RUST_LOG=info \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8

# 启动极致监控哨兵
CMD ["./watchdog"]
