# --- Build Stage ---
FROM rust:1.75-alpine as builder

# 安装必要的编译依赖
RUN apk add --no-cache musl-dev gcc

WORKDIR /app

# 先创建一个假的 main.rs 以利用 Docker 缓存层优化依赖编译
RUN mkdir src && echo "fn main() {}" > src/main.rs
COPY Cargo.toml ./
RUN cargo build --release
RUN rm -rf src

# 拷贝真实源码并执行最终编译
COPY src ./src
# 更新文件修改时间以确保重新编译
RUN touch src/main.rs
RUN cargo build --release

# --- Run Stage ---
FROM alpine:latest

WORKDIR /app

# 从构建阶段拷贝二进制文件
COPY --from=builder /app/target/release/xdfc-search .

# 暴露接口端口
EXPOSE 8081

# 启动服务
CMD ["./xdfc-search"]
