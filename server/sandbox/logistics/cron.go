package logistics

import (
	"fmt"
	"log"
	"time"
	"xdfc-server/services"

	"gorm.io/gorm"
)

// =========================================================================
// 物流 API 隔离砂箱 · 漏抓取补偿任务 (Compensation Cron)
// 解决推送丢失场景下的数据对冲
// =========================================================================

// CompensationConfig 补偿任务配置
type CompensationConfig struct {
	// ScanInterval 扫描间隔 (默认 6 小时)
	ScanInterval time.Duration
	// StaleThreshold 判定"失联"的阈值 (默认 12 小时未更新)
	StaleThreshold time.Duration
	// MaxBatchSize 单次扫描最大处理量
	MaxBatchSize int
}

// DefaultCompensationConfig 返回生产级默认配置
func DefaultCompensationConfig() CompensationConfig {
	return CompensationConfig{
		ScanInterval:   6 * time.Hour,
		StaleThreshold: 12 * time.Hour,
		MaxBatchSize:   100,
	}
}

// LogisticsCompensationTask 漏抓取补偿器
type LogisticsCompensationTask struct {
	DB     *gorm.DB
	Config CompensationConfig
}

// NewCompensationTask 初始化补偿任务
func NewCompensationTask(db *gorm.DB, config CompensationConfig) *LogisticsCompensationTask {
	return &LogisticsCompensationTask{
		DB:     db,
		Config: config,
	}
}

// Run 启动补偿扫描 (由外部 Cron 调度器调用)
// 逻辑：扫描"在途且超过 StaleThreshold 未收到推送"的订单
func (t *LogisticsCompensationTask) Run() {
	log.Println("[LOGISTICS-JANITOR] Starting compensation scan...")

	threshold := time.Now().Add(-t.Config.StaleThreshold)

	var staleOrders []DeliveryOrder
	result := t.DB.Where(
		"status NOT IN (?, ?, ?) AND (last_push_at IS NULL OR last_push_at < ?)",
		StatusSigned, StatusException, StatusReturned,
		threshold,
	).Limit(t.Config.MaxBatchSize).Find(&staleOrders)

	if result.Error != nil {
		log.Printf("[LOGISTICS-JANITOR][CRITICAL] Failed to query stale orders: %v", result.Error)
		return
	}

	if len(staleOrders) == 0 {
		log.Println("[LOGISTICS-JANITOR] No stale orders found. System healthy.")
		return
	}

	log.Printf("[LOGISTICS-JANITOR] Found %d stale order(s). Initiating active polling...", len(staleOrders))

	compensatedCount := 0
	for _, order := range staleOrders {
		err := t.pollAndCompensate(order)
		if err != nil {
			log.Printf("[LOGISTICS-JANITOR] Failed to compensate order %s: %v", order.TrackingNo, err)
			continue
		}
		compensatedCount++
	}

	log.Printf("[LOGISTICS-JANITOR] Compensation complete: %d/%d orders updated.", compensatedCount, len(staleOrders))
}

// pollAndCompensate 对单个订单发起即时查询补偿
func (t *LogisticsCompensationTask) pollAndCompensate(order DeliveryOrder) error {
	// 1. 加载该承运商的 API 配置
	var provider LogisticsProvider
	result := t.DB.Where("code = ? AND status = 'Enabled'", order.CarrierCode).First(&provider)
	if result.Error != nil {
		return fmt.Errorf("provider %s not found or disabled", order.CarrierCode)
	}

	resolution := services.ResolveTrustedLogisticsProviderTarget(provider.Code, services.LogisticsProviderTargetPurposeTracking)
	if !resolution.Supported || resolution.TargetURL == "" {
		log.Printf("[LOGISTICS-JANITOR] [SANDBOX-STUB] Tracking compensation for %s (%s) requires manual review: tracking=%s summary=%s",
			provider.Name, provider.Code, order.TrackingNo, resolution.SummaryMessage)
		return nil
	}

	// 2. 调用第三方"即时查询"接口 (此处为砂箱占位逻辑)
	// 正式并网时替换为实际的 HTTP 客户端调用，但目标解析必须继续复用受控解析器
	log.Printf("[LOGISTICS-JANITOR] [SANDBOX-STUB] Would poll %s API for tracking: %s (trusted_target: %s)",
		provider.Name, order.TrackingNo, resolution.TargetURL)

	// 3. 更新 API 额度消耗
	t.DB.Model(&provider).Update("quota_used", gorm.Expr("quota_used + 1"))

	// 4. 检查额度告警
	t.checkQuotaAlert(provider)

	return nil
}

// checkQuotaAlert 检查 API 额度是否触达告警阈值
func (t *LogisticsCompensationTask) checkQuotaAlert(provider LogisticsProvider) {
	remaining := provider.QuotaTotal - provider.QuotaUsed
	if remaining <= provider.QuotaAlertAt && provider.QuotaTotal > 0 {
		log.Printf("[LOGISTICS-JANITOR][WARNING] API quota LOW for %s (%s): remaining=%d, threshold=%d",
			provider.Name, provider.Code, remaining, provider.QuotaAlertAt)
	}
}
