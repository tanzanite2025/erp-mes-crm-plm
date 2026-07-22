package db

import (
	"context"
	"errors"
	"log"
	"xdfc-server/models"

	"gorm.io/gorm"
)

const UnitsCacheKey = "global:cache:units"

func defaultUnitSeeds() []models.Unit {
	return []models.Unit{
		defaultUnitSeed("00000000-0000-0000-0000-000000000101", "PCS", "件", "QUANTITY", 0, "系统预置数量单位，用于物料、成品和单据数量。"),
		defaultUnitSeed("00000000-0000-0000-0000-000000000102", "SET", "套", "QUANTITY", 0, "系统预置成套数量单位。"),
		defaultUnitSeed("00000000-0000-0000-0000-000000000103", "PAIR", "双", "QUANTITY", 0, "系统预置成对数量单位。"),
		defaultUnitSeed("00000000-0000-0000-0000-000000000104", "ROLL", "卷", "QUANTITY", 0, "系统预置卷装数量单位。"),
		defaultUnitSeed("00000000-0000-0000-0000-000000000105", "BOX", "箱", "QUANTITY", 0, "系统预置箱装数量单位。"),
		defaultUnitSeed("00000000-0000-0000-0000-000000000106", "BAG", "袋", "QUANTITY", 0, "系统预置袋装数量单位。"),
		defaultUnitSeed("00000000-0000-0000-0000-000000000201", "G", "克", "WEIGHT", 3, "系统预置重量单位。"),
		defaultUnitSeed("00000000-0000-0000-0000-000000000202", "KG", "千克", "WEIGHT", 3, "系统预置重量单位。"),
		defaultUnitSeed("00000000-0000-0000-0000-000000000203", "T", "吨", "WEIGHT", 3, "系统预置重量单位。"),
		defaultUnitSeed("00000000-0000-0000-0000-000000000301", "MM", "毫米", "LENGTH", 2, "系统预置长度单位，包装规则和规格尺寸常用。"),
		defaultUnitSeed("00000000-0000-0000-0000-000000000302", "CM", "厘米", "LENGTH", 2, "系统预置长度单位。"),
		defaultUnitSeed("00000000-0000-0000-0000-000000000303", "M", "米", "LENGTH", 3, "系统预置长度单位。"),
		defaultUnitSeed("00000000-0000-0000-0000-000000000401", "CM2", "平方厘米", "AREA", 2, "系统预置面积单位。"),
		defaultUnitSeed("00000000-0000-0000-0000-000000000402", "M2", "平方米", "AREA", 3, "系统预置面积单位。"),
		defaultUnitSeed("00000000-0000-0000-0000-000000000501", "ML", "毫升", "VOLUME", 3, "系统预置体积单位。"),
		defaultUnitSeed("00000000-0000-0000-0000-000000000502", "L", "升", "VOLUME", 3, "系统预置体积单位。"),
		defaultUnitSeed("00000000-0000-0000-0000-000000000503", "M3", "立方米", "VOLUME", 3, "系统预置体积单位。"),
		defaultUnitSeed("00000000-0000-0000-0000-000000000601", "MIN", "分钟", "TIME", 0, "系统预置时间单位。"),
		defaultUnitSeed("00000000-0000-0000-0000-000000000602", "HOUR", "小时", "TIME", 2, "系统预置时间单位。"),
		defaultUnitSeed("00000000-0000-0000-0000-000000000603", "DAY", "天", "TIME", 2, "系统预置时间单位。"),
	}
}

func defaultUnitSeed(id string, code string, name string, category string, precision int, description string) models.Unit {
	return models.Unit{
		BaseModel:   models.BaseModel{ID: id},
		Code:        code,
		Name:        name,
		Category:    category,
		Precision:   precision,
		Status:      "active",
		IsSystem:    true,
		Description: description,
	}
}

func ensureDefaultUnits() {
	if DB == nil || !DB.Migrator().HasTable(&models.Unit{}) {
		return
	}

	changed := false
	for _, seed := range defaultUnitSeeds() {
		var existing models.Unit
		err := DB.Unscoped().Where("code = ?", seed.Code).First(&existing).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			unit := seed
			if createErr := DB.Create(&unit).Error; createErr != nil {
				log.Fatal("[CRITICAL] Failed to seed default unit: ", createErr)
			}
			changed = true
			continue
		}

		if err != nil {
			log.Fatal("[CRITICAL] Failed to query default unit: ", err)
		}

		updates := map[string]interface{}{}
		if !existing.IsSystem {
			updates["is_system"] = true
		}
		if existing.DeletedAt.Valid {
			updates["deleted_at"] = nil
			updates["status"] = "active"
		}
		if len(updates) == 0 {
			continue
		}

		if updateErr := DB.Unscoped().Model(&existing).Updates(updates).Error; updateErr != nil {
			log.Fatal("[CRITICAL] Failed to repair default unit: ", updateErr)
		}
		changed = true
	}

	if changed && RDB != nil {
		_ = RDB.Del(context.Background(), UnitsCacheKey).Err()
	}
}
