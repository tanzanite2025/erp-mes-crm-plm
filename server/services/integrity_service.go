package services

import (
	"context"
	"encoding/json"
	"xdfc-server/db"
)

// IntegrityResult 包含审计结果、自愈状态以及指纹粒度的详细信息 (与 Rust watchdogs 结构对齐)
type IntegrityResult struct {
	Anomalies []string `json:"anomalies"`
	IsHealing bool     `json:"isHealing"`
	Details   []string `json:"details"`
}

// AuditSystemIntegrity 系统审计逻辑 (Go 消费端)
// 此版本已成功实现“哨兵分离”：Go 不再执行物理扫描，而是通过 Redis 获取 Rust 哨兵的即时审计快照。
func AuditSystemIntegrity() IntegrityResult {
	ctx := context.Background()

	// 1. 从分布式缓存总线中提取系统哨兵 (Rust Engine) 推播的最新完整性快照
	statusJSON, err := db.RDB.Get(ctx, "global:integrity:status").Result()

	if err != nil || statusJSON == "" {
		// [DEGRADATION] 如果哨兵尚未就绪或连接断开，上报 Pending 状态提醒前端
		return IntegrityResult{
			Anomalies: []string{"SYSTEM_WATCHDOG_OFFLINE"},
			Details:   []string{"Rust Watchdog Engine is not reporting in."},
		}
	}

	// 2. 解析由 Rust 引擎写入的结构化审计报告
	var result IntegrityResult
	if err := json.Unmarshal([]byte(statusJSON), &result); err != nil {
		return IntegrityResult{
			Anomalies: []string{"DATA_LINK_ANOMALY"},
			Details:   []string{"Failed to parse watchdog report."},
		}
	}

	return result
}
