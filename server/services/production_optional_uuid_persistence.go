package services

import (
	"gorm.io/gorm"
)

type productionOptionalUUIDWrite = optionalUUIDColumnValue

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
	return omitEmptyUUIDColumnsForRecordCreation(tx, fields...)
}

func collectEmptyProductionOptionalUUIDColumns(fields ...productionOptionalUUIDWrite) []string {
	return collectEmptyOptionalUUIDColumns(fields...)
}
