package services

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"
	"xdfc-server/audit"
	"xdfc-server/models"
	"xdfc-server/repositories"
	"xdfc-server/validators"

	"gorm.io/gorm"
)

// MaintenanceRecordService 维保记录业务逻辑服务
type MaintenanceRecordService struct {
	repo      *repositories.MaintenanceRecordRepository
	validator *validators.MaintenanceRecordValidator
	db        *gorm.DB
}

// NewMaintenanceRecordService 创建 service 实例
func NewMaintenanceRecordService(db *gorm.DB) *MaintenanceRecordService {
	return &MaintenanceRecordService{
		repo:      repositories.NewMaintenanceRecordRepository(db),
		validator: validators.NewMaintenanceRecordValidator(),
		db:        db,
	}
}

// ListRecords 查询维保记录列表
func (s *MaintenanceRecordService) ListRecords(params repositories.ListParams) (*repositories.ListResult, error) {
	// 验证查询参数
	if err := s.validator.ValidateQueryStatus(params.Status); err != nil {
		return nil, err
	}

	priorities, err := s.validator.ValidateQueryPriorities(strings.Join(params.Priorities, ","))
	if err != nil {
		return nil, err
	}
	params.Priorities = priorities

	if err := s.validator.ValidateQueryType(params.Type); err != nil {
		return nil, err
	}

	if params.AssetType != "" {
		if err := s.validator.ValidateAssetType(params.AssetType); err != nil {
			return nil, err
		}
	}

	if err := s.validator.ValidateSearchKeyword(params.Search); err != nil {
		return nil, err
	}

	// 查询数据
	return s.repo.List(params)
}

// GetStats 获取统计数据
func (s *MaintenanceRecordService) GetStats() (*repositories.StatsResult, error) {
	return s.repo.GetStats()
}

// GetByID 根据 ID 获取单条记录
func (s *MaintenanceRecordService) GetByID(id string) (*models.MaintenanceRecord, error) {
	return s.repo.GetByID(id)
}

// CreateInput 创建维保记录的输入参数
type CreateInput struct {
	AssetType   string
	AssetID     string
	AssetSN     string
	Type        string
	Title       string
	Description string
	Priority    string
	StartedAt   *time.Time
	CompletedAt *time.Time
	Cost        float64
	Remarks     string
	Operator    string
	UserID      string
	ClientIP    string
}

// Create 创建维保记录
func (s *MaintenanceRecordService) Create(input CreateInput) (*models.MaintenanceRecord, error) {
	// 验证输入 - 先验证枚举值,再验证资产存在性
	if err := s.validator.ValidateTitle(input.Title); err != nil {
		return nil, err
	}

	if err := s.validator.ValidateDescription(input.Description); err != nil {
		return nil, err
	}

	if err := s.validator.ValidateRemarks(input.Remarks); err != nil {
		return nil, err
	}

	if err := s.validator.ValidateAssetType(input.AssetType); err != nil {
		return nil, err
	}

	if err := s.validator.ValidateMaintenanceType(input.Type); err != nil {
		return nil, err
	}

	priority := input.Priority
	if priority == "" {
		priority = "MEDIUM"
	}
	if err := s.validator.ValidatePriority(priority); err != nil {
		return nil, err
	}

	if err := s.validator.ValidateCost(input.Cost); err != nil {
		return nil, err
	}

	if err := s.validator.ValidateTimeOrder(input.StartedAt, input.CompletedAt); err != nil {
		return nil, err
	}

	// 构建记录
	record := &models.MaintenanceRecord{
		AssetType:   input.AssetType,
		AssetID:     input.AssetID,
		AssetSN:     input.AssetSN,
		Type:        input.Type,
		Status:      "OPEN",
		Title:       input.Title,
		Description: input.Description,
		Priority:    priority,
		StartedAt:   input.StartedAt,
		CompletedAt: input.CompletedAt,
		Cost:        input.Cost,
		Remarks:     input.Remarks,
		CreatedBy:   input.Operator,
		UpdatedBy:   input.Operator,
		Version:     1,
	}

	// 使用事务创建记录并写入审计日志
	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 在事务中验证资产存在性（防止 TOCTOU 竞态条件）
		if input.AssetID != "" {
			var exists bool
			var err error

			if input.AssetType == "MOLD" {
				err = tx.Model(&models.Mold{}).
					Select("1").
					Where("id = ? AND deleted_at IS NULL", input.AssetID).
					Limit(1).
					Scan(&exists).Error
				if err != nil {
					return fmt.Errorf("[SERVER] 验证资产失败: %v", err)
				}
				if !exists {
					return fmt.Errorf("[VALIDATION] 指定的模具不存在或已删除")
				}
			} else if input.AssetType == "FURNACE" {
				err = tx.Model(&models.Furnace{}).
					Select("1").
					Where("id = ? AND deleted_at IS NULL", input.AssetID).
					Limit(1).
					Scan(&exists).Error
				if err != nil {
					return fmt.Errorf("[SERVER] 验证资产失败: %v", err)
				}
				if !exists {
					return fmt.Errorf("[VALIDATION] 指定的炉台不存在或已删除")
				}
			}
		}

		// 创建记录
		if err := tx.Create(record).Error; err != nil {
			return err
		}

		// 写入审计日志
		actor := audit.AuditActor{
			UserID:   input.UserID,
			Username: input.Operator,
			IP:       input.ClientIP,
			Source:   "http",
		}

		auditEvent := audit.NewAuditEvent(
			audit.AuditEntityKey("MaintenanceRecord"),
			record.ID,
			audit.AuditActionCreate,
			actor,
		)

		changes := []audit.AuditChange{
			{Field: "assetType", NewValue: record.AssetType, Label: "设备类型"},
			{Field: "assetId", NewValue: record.AssetID, Label: "设备ID"},
			{Field: "assetSn", NewValue: record.AssetSN, Label: "设备序列号"},
			{Field: "type", NewValue: record.Type, Label: "维保类型"},
			{Field: "status", NewValue: record.Status, Label: "状态"},
			{Field: "title", NewValue: record.Title, Label: "标题"},
			{Field: "priority", NewValue: record.Priority, Label: "优先级"},
			{Field: "cost", NewValue: record.Cost, Label: "成本"},
		}
		auditEvent = auditEvent.WithChanges(changes...)

		return RecordAuditEventTx(tx, auditEvent)
	})

	if err != nil {
		return nil, err
	}

	return record, nil
}

// PatchInput 更新维保记录的输入参数
type PatchInput struct {
	ID       string
	Delta    map[string]json.RawMessage
	Version  int
	Operator string
	UserID   string
	ClientIP string
}

// Patch 差分更新维保记录
func (s *MaintenanceRecordService) Patch(input PatchInput) (*models.MaintenanceRecord, error) {
	// 加载现有记录
	existing, err := s.repo.GetByID(input.ID)
	if err != nil {
		return nil, err
	}

	// 检查版本号（乐观锁）
	if input.Version != 0 && input.Version != existing.Version {
		return nil, fmt.Errorf("[CONFLICT] 记录已被其他用户修改")
	}

	// 构建更新字段
	updates, err := s.buildUpdates(input.Delta, existing)
	if err != nil {
		return nil, err
	}

	updates["updated_by"] = input.Operator
	updates["updated_at"] = time.Now()
	updates["version"] = existing.Version + 1

	// 使用事务更新记录并写入审计日志
	err = s.db.Transaction(func(tx *gorm.DB) error {
		txRepo := repositories.NewMaintenanceRecordRepository(tx)

		// 更新记录
		if err := txRepo.Update(existing, updates); err != nil {
			return err
		}

		// 写入审计日志
		actor := audit.AuditActor{
			UserID:   input.UserID,
			Username: input.Operator,
			IP:       input.ClientIP,
			Source:   "http",
		}

		auditEvent := audit.NewAuditEvent(
			audit.AuditEntityKey("MaintenanceRecord"),
			input.ID,
			audit.AuditActionPatch,
			actor,
		)

		// 添加变更的字段
		for key := range input.Delta {
			var label string
			switch key {
			case "status":
				label = "状态"
			case "priority":
				label = "优先级"
			case "title":
				label = "标题"
			case "description":
				label = "描述"
			case "remarks":
				label = "备注"
			case "cost":
				label = "成本"
			case "startedAt":
				label = "开始时间"
			case "completedAt":
				label = "完成时间"
			default:
				label = key
			}

			if newVal, ok := updates[toSnakeCase(key)]; ok {
				auditEvent = auditEvent.WithChanges(audit.AuditChange{
					Field:    key,
					NewValue: newVal,
					Label:    label,
				})
			}
		}

		return RecordAuditEventTx(tx, auditEvent)
	})

	if err != nil {
		return nil, err
	}

	// 重新加载更新后的记录
	return s.repo.GetByID(input.ID)
}

// Delete 软删除维保记录
func (s *MaintenanceRecordService) Delete(id string, operator string, userID string, clientIP string) error {
	// 检查记录是否存在
	existing, err := s.repo.GetByID(id)
	if err != nil {
		return err
	}

	// 使用事务软删除并写入审计日志
	return s.db.Transaction(func(tx *gorm.DB) error {
		txRepo := repositories.NewMaintenanceRecordRepository(tx)

		// 删除记录
		if err := txRepo.Delete(existing); err != nil {
			return err
		}

		// 写入审计日志
		actor := audit.AuditActor{
			UserID:   userID,
			Username: operator,
			IP:       clientIP,
			Source:   "http",
		}

		auditEvent := audit.NewAuditEvent(
			audit.AuditEntityKey("MaintenanceRecord"),
			id,
			audit.AuditActionDelete,
			actor,
		)

		return RecordAuditEventTx(tx, auditEvent)
	})
}

// buildUpdates 构建更新字段映射
func (s *MaintenanceRecordService) buildUpdates(delta map[string]json.RawMessage, existing *models.MaintenanceRecord) (map[string]interface{}, error) {
	updates := make(map[string]interface{})

	for key, raw := range delta {
		valueRaw, err := extractDeltaNewValue(raw)
		if err != nil {
			return nil, err
		}

		switch key {
		case "title":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				return nil, err
			}
			if err := s.validator.ValidateTitle(value); err != nil {
				return nil, err
			}
			updates["title"] = value

		case "description":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				return nil, err
			}
			if err := s.validator.ValidateDescription(value); err != nil {
				return nil, err
			}
			updates["description"] = value

		case "remarks":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				return nil, err
			}
			if err := s.validator.ValidateRemarks(value); err != nil {
				return nil, err
			}
			updates["remarks"] = value

		case "assetSn":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				return nil, err
			}
			updates["asset_sn"] = value

		case "type":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				return nil, err
			}
			if err := s.validator.ValidateMaintenanceType(value); err != nil {
				return nil, err
			}
			updates["type"] = value

		case "priority":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				return nil, err
			}
			if err := s.validator.ValidatePriority(value); err != nil {
				return nil, err
			}
			updates["priority"] = value

		case "status":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				return nil, err
			}
			if err := s.validator.ValidateStatus(value); err != nil {
				return nil, err
			}

			// 验证状态流转
			if err := s.validator.ValidateStatusTransition(existing.Status, value); err != nil {
				return nil, err
			}

			updates["status"] = value

			// 当状态变为 COMPLETED 且 completedAt 未在 delta 中时，自动设置
			if value == "COMPLETED" {
				if _, hasCompletedAt := delta["completedAt"]; !hasCompletedAt {
					now := time.Now()
					updates["completed_at"] = &now
				}
			}

		case "cost":
			var value float64
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				return nil, err
			}
			if err := s.validator.ValidateCost(value); err != nil {
				return nil, err
			}
			updates["cost"] = value

		case "startedAt":
			var value *time.Time
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				return nil, err
			}
			updates["started_at"] = value

		case "completedAt":
			var value *time.Time
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				return nil, err
			}
			updates["completed_at"] = value
		}
	}

	// 验证时间顺序
	startedAt := existing.StartedAt
	completedAt := existing.CompletedAt

	if val, ok := updates["started_at"]; ok {
		if t, ok := val.(*time.Time); ok {
			startedAt = t
		}
	}
	if val, ok := updates["completed_at"]; ok {
		if t, ok := val.(*time.Time); ok {
			completedAt = t
		}
	}

	if err := s.validator.ValidateTimeOrder(startedAt, completedAt); err != nil {
		return nil, err
	}

	return updates, nil
}

// toSnakeCase 将驼峰命名转换为蛇形命名
func toSnakeCase(s string) string {
	var result []rune
	for i, r := range s {
		if i > 0 && r >= 'A' && r <= 'Z' {
			result = append(result, '_')
		}
		result = append(result, r)
	}
	return strings.ToLower(string(result))
}
