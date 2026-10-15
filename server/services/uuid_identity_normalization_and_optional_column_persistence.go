package services

import (
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type optionalUUIDColumnValue struct {
	Column string
	Value  string
}

func normalizeUUIDIdentity(value string) string {
	value = strings.TrimSpace(value)
	if parsed, err := uuid.Parse(value); err == nil {
		return parsed.String()
	}
	return value
}

func omitEmptyUUIDColumnsForRecordCreation(tx *gorm.DB, fields ...optionalUUIDColumnValue) *gorm.DB {
	columns := collectEmptyOptionalUUIDColumns(fields...)
	if len(columns) == 0 {
		return tx
	}
	return tx.Omit(columns...)
}

func collectEmptyOptionalUUIDColumns(fields ...optionalUUIDColumnValue) []string {
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
