package main

import (
	"context"
	"errors"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"xdfc-attendance-gateway/internal/config"
	"xdfc-attendance-gateway/internal/gateway"
)

func main() {
	logger := log.New(os.Stdout, "[isup-gateway] ", log.LstdFlags|log.Lmicroseconds)

	configPath := os.Getenv("CONFIG_FILE")
	if configPath == "" {
		configPath = "/etc/xdfc-isup-gateway/config.json"
	}

	cfg, err := config.Load(configPath)
	if err != nil {
		logger.Fatalf("加载配置失败: %v", err)
	}
	cfg.ConfigFile = configPath

	service, err := gateway.New(cfg, logger)
	if err != nil {
		logger.Fatalf("初始化网关失败: %v", err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	if err := service.Run(ctx); err != nil && !errors.Is(err, context.Canceled) {
		logger.Fatalf("网关已停止: %v", err)
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := service.Shutdown(shutdownCtx); err != nil {
		logger.Printf("网关关闭时存在未完成任务: %v", err)
	}
}
