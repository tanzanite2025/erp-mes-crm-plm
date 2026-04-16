//go:build tools
// +build tools

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
	_ = godotenv.Load(".env.dev", "../.env.dev", "../../server/.env.dev")

	// 1. 优先使用环境变量，否则回退到本地默认开发配置
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" || strings.Contains(dsn, "@db:") {
		// 容器外运行，将 "@db:" 替换为 "@127.0.0.1:"
		dsn = "postgres://xdfc_admin:xdfc_local_dev_password@127.0.0.1:5432/xdfc_official?sslmode=disable"
		fmt.Println("[CLEANUP] Using Host-to-Docker fallback DSN: 127.0.0.1:5432")
	}

	// 2. 初始化数据库链路
	db.InitDB(dsn)

	cleanupUsername := strings.TrimSpace(os.Getenv("CLEANUP_USERNAME"))
	if cleanupUsername == "" {
		cleanupUsername = "cashier"
	}

	// 3. 执行物理删除 (精准爆破，不区分大小写)
	fmt.Printf("[CRITICAL] Starting target data purging: [username=%q]...\n", cleanupUsername)

	result := db.DB.Unscoped().Where("LOWER(username) = ?", strings.ToLower(cleanupUsername)).Delete(&models.User{})
	if result.Error != nil {
		log.Fatalf("[ERROR] Failed to purge dirty data: %v", result.Error)
	}

	fmt.Printf("[SUCCESS] Purge completed. Rows affected: %d\n", result.RowsAffected)
	fmt.Println("[HINT] Please refresh your browser to verify the cleanup.")
}
