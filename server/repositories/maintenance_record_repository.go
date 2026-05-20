package repositories

import (
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
)

// MaintenanceRecordRepository 维保记录数据访问层
type MaintenanceRecordRepository struct {
	db *gorm.DB
}

// NewMaintenanceRecordRepository 创建 repository 实例
func NewMaintenanceRecordRepository(db *gorm.DB) *MaintenanceRecordRepository {
	return &MaintenanceRecordRepository{db: db}
}

// ListParams 列表查询参数
type ListParams struct {
	AssetType  string
	AssetID    string
	Status     string
	Priorities []string
	Type       string
	DateFrom   string
	DateTo     string
	Search     string
	Limit      int
	Offset     int
}

// ListResult 列表查询结果
type ListResult struct {
	Records []models.MaintenanceRecord
	Total   int64
}

// List 查询维保记录列表
func (r *MaintenanceRecordRepository) List(params ListParams) (*ListResult, error) {
	query := r.db.Model(&models.MaintenanceRecord{})

	// 按设备筛选（可选）
	if params.AssetType != "" && params.AssetID != "" {
		query = query.Where("asset_type = ? AND asset_id = ?", params.AssetType, params.AssetID)
	}

	// 按状态筛选
	if params.Status != "" {
		query = query.Where("status = ?", params.Status)
	}

	// 按优先级筛选（支持多值）
	if len(params.Priorities) > 0 {
		if len(params.Priorities) == 1 {
			query = query.Where("priority = ?", params.Priorities[0])
		} else {
			query = query.Where("priority IN ?", params.Priorities)
		}
	}

	// 按类型筛选
	if params.Type != "" {
		query = query.Where("type = ?", params.Type)
	}

	// 按日期范围筛选
	if params.DateFrom != "" {
		query = query.Where("created_at >= ?", params.DateFrom)
	}
	if params.DateTo != "" {
		query = query.Where("created_at <= ?", params.DateTo)
	}

	// 全文搜索（使用 PostgreSQL FTS）
	if params.Search != "" {
		// 使用全文搜索
		searchQuery := strings.ReplaceAll(params.Search, " ", " & ")
		query = query.Where("search_vector @@ plainto_tsquery('simple', ?)", searchQuery)
		
		// 按相关性排序
		query = query.Order(r.db.Raw("ts_rank(search_vector, plainto_tsquery('simple', ?)) DESC", searchQuery))
	}
	
	// 默认按创建时间排序（如果没有搜索）
	if params.Search == "" {
		query = query.Order("created_at DESC")
	}

	// 获取总记录数
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	// 查询记录
	var records []models.MaintenanceRecord
	if err := query.Limit(params.Limit).Offset(params.Offset).Find(&records).Error; err != nil {
		return nil, err
	}

	return &ListResult{
		Records: records,
		Total:   total,
	}, nil
}

// GetByID 根据 ID 获取单条记录
func (r *MaintenanceRecordRepository) GetByID(id string) (*models.MaintenanceRecord, error) {
	var record models.MaintenanceRecord
	if err := r.db.First(&record, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &record, nil
}

// Create 创建维保记录
func (r *MaintenanceRecordRepository) Create(record *models.MaintenanceRecord) error {
	return r.db.Create(record).Error
}

// Update 更新维保记录
func (r *MaintenanceRecordRepository) Update(record *models.MaintenanceRecord, updates map[string]interface{}) error {
	return r.db.Model(record).Updates(updates).Error
}

// Delete 软删除维保记录
func (r *MaintenanceRecordRepository) Delete(record *models.MaintenanceRecord) error {
	return r.db.Delete(record).Error
}

// StatsResult 统计结果
type StatsResult struct {
	Open       int64
	InProgress int64
	Completed  int64
	Cancelled  int64
	Total      int64
}

// GetStats 获取统计数据
func (r *MaintenanceRecordRepository) GetStats() (*StatsResult, error) {
	type StatusCount struct {
		Status string
		Count  int64
	}

	var statusCounts []StatusCount
	if err := r.db.Model(&models.MaintenanceRecord{}).
		Where("deleted_at IS NULL").
		Select("status, COUNT(*) as count").
		Group("status").
		Find(&statusCounts).Error; err != nil {
		return nil, err
	}

	stats := &StatsResult{}
	for _, sc := range statusCounts {
		switch sc.Status {
		case "OPEN":
			stats.Open = sc.Count
		case "IN_PROGRESS":
			stats.InProgress = sc.Count
		case "COMPLETED":
			stats.Completed = sc.Count
		case "CANCELLED":
			stats.Cancelled = sc.Count
		}
		stats.Total += sc.Count
	}

	return stats, nil
}

// escapeLikePattern 转义 LIKE 特殊字符
func escapeLikePattern(s string) string {
	s = strings.ReplaceAll(s, "\\", "\\\\")
	s = strings.ReplaceAll(s, "%", "\\%")
	s = strings.ReplaceAll(s, "_", "\\_")
	return s
}
