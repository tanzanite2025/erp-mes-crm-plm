package validators

import (
	"fmt"
	"strings"
	"time"
	"unicode"
	"xdfc-server/db"
	"xdfc-server/models"
)

// MaintenanceRecordValidator 维保记录验证器
type MaintenanceRecordValidator struct{}

// NewMaintenanceRecordValidator 创建验证器实例
func NewMaintenanceRecordValidator() *MaintenanceRecordValidator {
	return &MaintenanceRecordValidator{}
}

// ValidateTitle 验证标题
func (v *MaintenanceRecordValidator) ValidateTitle(title string) error {
	title = strings.TrimSpace(title)
	if title == "" {
		return fmt.Errorf("[VALIDATION] 标题不能为空")
	}
	if len(title) > 255 {
		return fmt.Errorf("[VALIDATION] 标题长度不能超过 255 个字符")
	}
	// 检查是否包含控制字符
	for _, r := range title {
		if unicode.IsControl(r) && r != '\n' && r != '\r' && r != '\t' {
			return fmt.Errorf("[VALIDATION] 标题不能包含控制字符")
		}
	}
	return nil
}

// ValidateDescription 验证描述
func (v *MaintenanceRecordValidator) ValidateDescription(description string) error {
	if len(description) > 5000 {
		return fmt.Errorf("[VALIDATION] 描述长度不能超过 5000 个字符")
	}
	return nil
}

// ValidateRemarks 验证备注
func (v *MaintenanceRecordValidator) ValidateRemarks(remarks string) error {
	if len(remarks) > 5000 {
		return fmt.Errorf("[VALIDATION] 备注长度不能超过 5000 个字符")
	}
	return nil
}

// ValidateAssetType 验证资产类型
func (v *MaintenanceRecordValidator) ValidateAssetType(assetType string) error {
	if assetType != "MOLD" && assetType != "FURNACE" {
		return fmt.Errorf("[VALIDATION] assetType 必须是 MOLD 或 FURNACE")
	}
	return nil
}

// ValidateMaintenanceType 验证维保类型
func (v *MaintenanceRecordValidator) ValidateMaintenanceType(maintenanceType string) error {
	if maintenanceType != "PREVENTIVE" && maintenanceType != "CORRECTIVE" && maintenanceType != "INSPECTION" {
		return fmt.Errorf("[VALIDATION] type 必须是 PREVENTIVE、CORRECTIVE 或 INSPECTION")
	}
	return nil
}

// ValidatePriority 验证优先级
func (v *MaintenanceRecordValidator) ValidatePriority(priority string) error {
	if priority != "LOW" && priority != "MEDIUM" && priority != "HIGH" && priority != "CRITICAL" {
		return fmt.Errorf("[VALIDATION] priority 必须是 LOW、MEDIUM、HIGH 或 CRITICAL")
	}
	return nil
}

// ValidateStatus 验证状态
func (v *MaintenanceRecordValidator) ValidateStatus(status string) error {
	if status != "OPEN" && status != "IN_PROGRESS" && status != "COMPLETED" && status != "CANCELLED" {
		return fmt.Errorf("[VALIDATION] status 必须是 OPEN、IN_PROGRESS、COMPLETED 或 CANCELLED")
	}
	return nil
}

// ValidateCost 验证成本
func (v *MaintenanceRecordValidator) ValidateCost(cost float64) error {
	if cost < 0 {
		return fmt.Errorf("[VALIDATION] 成本不能为负数")
	}
	if cost > 999999999.99 {
		return fmt.Errorf("[VALIDATION] 成本不能超过 999,999,999.99")
	}
	// 限制小数位数（最多 2 位）
	costRounded := float64(int64(cost*100+0.5)) / 100
	if cost-costRounded > 0.0001 || costRounded-cost > 0.0001 {
		return fmt.Errorf("[VALIDATION] 成本最多保留 2 位小数")
	}
	return nil
}

// ValidateTimeOrder 验证时间顺序
func (v *MaintenanceRecordValidator) ValidateTimeOrder(startedAt, completedAt *time.Time) error {
	if startedAt != nil && completedAt != nil {
		if startedAt.After(*completedAt) {
			return fmt.Errorf("[VALIDATION] 开始时间不能晚于完成时间")
		}
	}
	return nil
}

// ValidateAssetExists 验证资产是否存在
func (v *MaintenanceRecordValidator) ValidateAssetExists(assetType, assetID string) error {
	if assetID == "" {
		return nil // 允许空 assetID
	}

	if assetType == "MOLD" {
		var count int64
		if err := db.DB.Model(&models.Mold{}).Where("id = ?", assetID).Count(&count).Error; err != nil {
			return fmt.Errorf("[SERVER] 验证资产失败: %v", err)
		}
		if count == 0 {
			return fmt.Errorf("[VALIDATION] 指定的模具不存在")
		}
	} else if assetType == "FURNACE" {
		var count int64
		if err := db.DB.Model(&models.Furnace{}).Where("id = ?", assetID).Count(&count).Error; err != nil {
			return fmt.Errorf("[SERVER] 验证资产失败: %v", err)
		}
		if count == 0 {
			return fmt.Errorf("[VALIDATION] 指定的炉台不存在")
		}
	}

	return nil
}

// ValidateStatusTransition 验证状态流转
func (v *MaintenanceRecordValidator) ValidateStatusTransition(currentStatus, newStatus string) error {
	if currentStatus == newStatus {
		return nil
	}

	// 不允许从 COMPLETED 回到 OPEN
	if currentStatus == "COMPLETED" && newStatus == "OPEN" {
		return fmt.Errorf("[VALIDATION] 不允许将已完成的记录改回待处理状态")
	}

	// 不允许从 CANCELLED 回到 OPEN
	if currentStatus == "CANCELLED" && newStatus == "OPEN" {
		return fmt.Errorf("[VALIDATION] 不允许将已取消的记录改回待处理状态")
	}

	// 不允许从 CANCELLED 到 IN_PROGRESS
	if currentStatus == "CANCELLED" && newStatus == "IN_PROGRESS" {
		return fmt.Errorf("[VALIDATION] 不允许将已取消的记录改为进行中状态")
	}

	return nil
}

// ValidateSearchKeyword 验证搜索关键词
func (v *MaintenanceRecordValidator) ValidateSearchKeyword(search string) error {
	if search == "" {
		return nil
	}
	if len(search) < 2 {
		return fmt.Errorf("[VALIDATION] 搜索关键词至少需要 2 个字符")
	}
	return nil
}

// ValidateQueryStatus 验证查询状态参数
func (v *MaintenanceRecordValidator) ValidateQueryStatus(status string) error {
	if status == "" {
		return nil
	}
	validStatuses := map[string]bool{"OPEN": true, "IN_PROGRESS": true, "COMPLETED": true, "CANCELLED": true}
	if !validStatuses[status] {
		return fmt.Errorf("[VALIDATION] 无效的状态值")
	}
	return nil
}

// ValidateQueryPriorities 验证查询优先级参数（支持逗号分隔）
func (v *MaintenanceRecordValidator) ValidateQueryPriorities(priority string) ([]string, error) {
	if priority == "" {
		return nil, nil
	}

	priorities := strings.Split(priority, ",")
	validPriorities := map[string]bool{"LOW": true, "MEDIUM": true, "HIGH": true, "CRITICAL": true}

	result := make([]string, 0, len(priorities))
	for _, p := range priorities {
		p = strings.TrimSpace(p)
		if !validPriorities[p] {
			return nil, fmt.Errorf("[VALIDATION] 无效的优先级值: %s", p)
		}
		result = append(result, p)
	}

	return result, nil
}

// ValidateQueryType 验证查询类型参数
func (v *MaintenanceRecordValidator) ValidateQueryType(recordType string) error {
	if recordType == "" {
		return nil
	}
	validTypes := map[string]bool{"PREVENTIVE": true, "CORRECTIVE": true, "INSPECTION": true}
	if !validTypes[recordType] {
		return fmt.Errorf("[VALIDATION] 无效的类型值")
	}
	return nil
}
