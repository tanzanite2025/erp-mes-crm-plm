package services

import (
	"strings"

	"gorm.io/gorm"
)

type productionOptionalUUIDWrite struct {
	Column string
	Value  string
}

func createProductionRecordWithOptionalUUIDs(tx *gorm.DB, record any, fields ...productionOptionalUUIDWrite) error {
	return applyProductionOptionalUUIDOmit(tx, fields...).Create(record).Error
}

func saveProductionRecordWithOptionalUUIDs(tx *gorm.DB, record any, fields ...productionOptionalUUIDWrite) error {
	emptyColumns := collectEmptyProductionOptionalUUIDColumns(fields...)
	if err := tx.Omit(emptyColumns...).Save(record).Error; err != nil {
		return err
	}
	if len(emptyColumns) == 0 {
		return nil
	}
	nullUpdates := make(map[string]any, len(emptyColumns))
	for _, column := range emptyColumns {
		nullUpdates[column] = nil
	}
	return tx.Model(record).UpdateColumns(nullUpdates).Error
}

func applyProductionOptionalUUIDOmit(tx *gorm.DB, fields ...productionOptionalUUIDWrite) *gorm.DB {
	emptyColumns := collectEmptyProductionOptionalUUIDColumns(fields...)
	if len(emptyColumns) == 0 {
		return tx
	}
	return tx.Omit(emptyColumns...)
}

func collectEmptyProductionOptionalUUIDColumns(fields ...productionOptionalUUIDWrite) []string {
	columns := make([]string, 0, len(fields))
	seen := make(map[string]struct{}, len(fields))
	for _, field := range fields {
		column := strings.TrimSpace(field.Column)
		if column == "" || strings.TrimSpace(field.Value) != "" {
			continue
		}
		if _, exists := seen[column]; exists {
			continue
		}
		seen[column] = struct{}{}
		columns = append(columns, column)
	}
	return columns
}
