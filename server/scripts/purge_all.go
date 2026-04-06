//go:build ignore

package main

import (
	"fmt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"log"
)

func main() {
	dsn := "host=127.0.0.1 user=xdfc_admin password=Wang622575_secure_db dbname=xdfc_official port=5432 sslmode=disable"

	database, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("[CRITICAL] 数据库连接失败: %v", err)
	}

	fmt.Println(">>> 启动 XDFC 数据强力清理程序 (PURGE_PROTOCOL_V1) <<<")

	// 顺序清理（考虑外键约束）
	tables := []string{
		"exp_reports",
		"exp_tasks",
		"exp_equipment",
		"exp_categories",
		"inspection_tasks",
		"inspection_standards",
		"piecework_records",
		"piecework_rates",
		"teams",
		"audit_logs", // 可选：清理初始化产生的审计日志
	}

	for _, table := range tables {
		fmt.Printf("- 正在物理清空表: %s\n", table)
		database.Exec(fmt.Sprintf("TRUNCATE TABLE %s RESTART IDENTITY CASCADE", table))
	}

	fmt.Println("\n✅ 数据库已清空。所有冗余演示数据已彻底毁灭。")
	fmt.Println("请立即重启后端服务器 (go run main.go)。")
}
