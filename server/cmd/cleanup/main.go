package main

import (
	"fmt"
	"log"
	"os"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load(".env.dev", "../.env.dev", "../../.env.dev", "../../server/.env.dev")

	// 1. DSN 自动适配 (Docker 环境 vs 本地宿主机)
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" || strings.Contains(dsn, "@db:") {
		// 容器外运行回退地址
		dsn = "postgres://xdfc_admin:xdfc_local_dev_password@127.0.0.1:5432/xdfc_official?sslmode=disable"
		fmt.Println("[ISOLATED_CLEANUP] Using Host-to-Docker fallback DSN: 127.0.0.1:5432")
	}

	// 2. 初始化核心链路
	db.InitDB(dsn)

	cleanupUsername := strings.TrimSpace(os.Getenv("CLEANUP_USERNAME"))
	if cleanupUsername == "" {
		cleanupUsername = "cashier"
	}

	// 3. 执行物理删除 (针对指定用户名精准爆破)
	fmt.Printf("[CRITICAL] Starting target data purging: [username=%q]...\n", cleanupUsername)

	result := db.DB.Unscoped().Where("LOWER(username) = ?", strings.ToLower(cleanupUsername)).Delete(&models.User{})
	if result.Error != nil {
		log.Fatalf("[ERROR] Failed to purge dirty data: %v", result.Error)
	}

	fmt.Printf("[SUCCESS] Dirty data cleared. Rows affected: %d\n", result.RowsAffected)
	fmt.Println("[HINT] Run complete. Refresh your browser to verify.")
}
