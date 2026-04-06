package db

import (
	"encoding/json"
	"fmt"
	"xdfc-server/models"
	"gorm.io/gorm"
)

// SeedDictionary 执行系统字典初始化 (可在 InitDB 中调用)
func SeedDictionary(database *gorm.DB) error {
	// 系统默认组
	systemGroups := []models.DictGroup{
		{Name: "物料管理", Code: "MATERIALS", IsSystem: true},
		{Name: "工艺基础", Code: "ENGINEERING", IsSystem: true},
		{Name: "购销贸易", Code: "TRADING", IsSystem: true},
		{Name: "产品资料", Code: "PRODUCT", IsSystem: true},
	}

	// 系统默认项
	systemEntries := []struct {
		GroupCode string
		Label     string
		Code      string
		Options   interface{}
	}{
		{"TRADING", "订单分类", "ORDER_CLASSIFICATION", []map[string]string{
			{"label": "一般贸易", "value": "GENERAL"},
			{"label": "受托加工", "value": "TOLL"},
			{"label": "研发试制", "value": "RD"},
			{"label": "项目专项", "value": "PROJECT"},
			{"label": "样品订单", "value": "SAMPLE"},
		}},
		{"TRADING", "订单模式", "ORDER_TYPE", []map[string]string{
			{"label": "客户订单", "value": "CUSTOMER"},
			{"label": "预估订单", "value": "ESTIMATE"},
			{"label": "委外订单", "value": "OUTSOURCE"},
			{"label": "补货订单", "value": "REPLENISH"},
			{"label": "退货订单", "value": "RETURN"},
			{"label": "备货订单", "value": "STOCK"},
		}},
		{"MATERIALS", "物料分类定义", "MATERIAL_CATEGORY", []map[string]string{
			{"label": "原材料", "value": "RAW_MATERIAL"},
			{"label": "包装材料", "value": "PACKAGING"},
			{"label": "辅助材料", "value": "AUXILIARY"},
			{"label": "低值易耗品", "value": "CONSUMABLE"},
			{"label": "化学品/试剂", "value": "CHEMICAL"},
		}},
		{"ENGINEERING", "技术系列/工艺", "TECH_SERIES", []map[string]string{
			{"label": "常温系列 (Normal Temp)", "value": "NORMAL"},
			{"label": "高温系列 (High TG)", "value": "HIGHTG"},
		}},
		{"ENGINEERING", "辐条编织模式", "LACING_PATTERN", []map[string]string{
			{"label": "1:1 等比 (Standard)", "value": "1:1"},
			{"label": "2:1 驱动侧 (Drive-Side)", "value": "2:1"},
			{"label": "G3 编织 (G3 System)", "value": "G3"},
		}},
		{"PRODUCT", "刹车类型", "BRAKE_TYPE", []map[string]string{
			{"label": "Disc (碟刹)", "value": "Disc"},
		}},
		{"PRODUCT", "胎型适配", "TIRE_TYPE", []map[string]string{
			{"label": "Hooked (有钩)", "value": "Hooked"},
			{"label": "Hookless (无钩)", "value": "Hookless"},
			{"label": "Tubular (管胎)", "value": "Tubular"},
		}},
		{"PRODUCT", "市场性质", "MARKET_SPEC", []map[string]string{
			{"label": "OE (原厂订单)", "value": "OE"},
		}},
		{"PRODUCT", "版本级别", "VERSION_LEVEL", []map[string]string{
			{"label": "标准版", "value": "STD"},
			{"label": "轻量版", "value": "Lightweight"},
			{"label": "超轻版", "value": "Ultralight"},
			{"label": "加强版", "value": "Reinforced"},
		}},
	}

	return database.Transaction(func(tx *gorm.DB) error {
		// 强制清理不再需要的旧系统字典分组 (确保安全：存在即清理，不存在则跳过，不中断事务)
		if tx.Migrator().HasTable("dict_entries") {
			if err := tx.Exec("DELETE FROM dict_entries WHERE group_id IN (SELECT id::text FROM dict_groups WHERE code = 'WAREHOUSE')").Error; err != nil {
				return fmt.Errorf("failed to clear old entries: %w", err)
			}
		}
		if tx.Migrator().HasTable("dict_groups") {
			if err := tx.Exec("DELETE FROM dict_groups WHERE code = 'WAREHOUSE'").Error; err != nil {
				return fmt.Errorf("failed to clear old groups: %w", err)
			}
		}

		// 强制物理驱逐不再需要的“允许孔数” (HOLE_COUNT) 等系统级遗留项
		fmt.Println("Purging legacy dictionary entries...")
		if err := tx.Exec("DELETE FROM dict_entries WHERE code IN ('HOLE_COUNT')").Error; err != nil {
			return fmt.Errorf("failed to purge legacy entries: %w", err)
		}

		fmt.Println("Seeding Dictionary Groups...")
		for _, g := range systemGroups {
			var existing models.DictGroup
			// 使用 Limit(1).Find 替代 First，防止 GORM 打印 "record not found" 日志噪音
			if err := tx.Unscoped().Where("code = ?", g.Code).Limit(1).Find(&existing).Error; err != nil {
				return fmt.Errorf("failed to query group %s: %w", g.Code, err)
			}
			
			if existing.ID == "" {
				// 记录完全不存在，新建
				if err := tx.Create(&g).Error; err != nil {
					return fmt.Errorf("failed to create group %s: %w", g.Code, err)
				}
			} else if existing.DeletedAt.Valid {
				// 如果记录存在但在回收站，重新激活它
				if err := tx.Unscoped().Model(&existing).Updates(map[string]interface{}{
					"deleted_at": nil,
					"name":       g.Name,
					"active":     true,
				}).Error; err != nil {
					return fmt.Errorf("failed to reactive group %s: %w", g.Code, err)
				}
			}
		}

		fmt.Println("Seeding Dictionary Entries...")
		for _, se := range systemEntries {
			var group models.DictGroup
			if err := tx.Unscoped().Where("code = ?", se.GroupCode).First(&group).Error; err != nil {
				return fmt.Errorf("missing group %s for entry %s: %w", se.GroupCode, se.Code, err)
			}

			var existing models.DictEntry
			optsJSON, _ := json.Marshal(se.Options)
			
			// 使用 Limit(1).Find 识别记录，防止日志噪音
			if err := tx.Unscoped().Where("code = ?", se.Code).Limit(1).Find(&existing).Error; err != nil {
				return fmt.Errorf("failed to query entry %s: %w", se.Code, err)
			}

			if existing.ID != "" {
				// 记录已存在（或在回收站），执行全量更新并确保恢复 deleted_at
				if err := tx.Unscoped().Model(&existing).Updates(map[string]interface{}{
					"group_id":   group.ID,
					"label":      se.Label,
					"options":    optsJSON,
					"deleted_at": nil,
					"active":     true,
				}).Error; err != nil {
					return fmt.Errorf("failed to update entry %s: %w", se.Code, err)
				}
			} else {
				// 记录完全不存在，新建
				if err := tx.Create(&models.DictEntry{
					GroupID: group.ID,
					Label:   se.Label,
					Code:    se.Code,
					Options: optsJSON,
					IsSystem: true,
				}).Error; err != nil {
					return fmt.Errorf("failed to create entry %s: %w", se.Code, err)
				}
			}
		}
		return nil
	})
}
