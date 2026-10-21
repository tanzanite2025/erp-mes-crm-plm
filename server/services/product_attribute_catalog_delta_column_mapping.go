package services

import (
	"encoding/json"
	"strings"
	"time"
)

// Only domain fields enter Updates; JSON names never become SQL column names.
func buildProductAttributeCatalogColumnUpdates(payload map[string]json.RawMessage, entityStringColumns map[string]string) (map[string]interface{}, error) {
	stringColumns := map[string]string{
		"description": "description", "revisionNo": "revision_no", "changeType": "change_type",
		"changeOrderNo": "change_order_no", "siteCode": "site_code",
	}
	allowedFields := []string{"sortOrder", "active", "isDefaultSite", "effectiveFrom", "effectiveTo"}
	for field, column := range entityStringColumns {
		stringColumns[field] = column
	}
	for field := range stringColumns {
		allowedFields = append(allowedFields, field)
	}
	if err := validateSupportedTopLevelDeltaKeys(payload, allowedFields...); err != nil {
		return nil, err
	}
	updates := make(map[string]interface{}, len(payload))
	for field, raw := range payload {
		valueRaw, err := extractDeltaNewValue(raw)
		if err != nil {
			return nil, err
		}
		if column, isString := stringColumns[field]; isString {
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				return nil, err
			}
			value = strings.TrimSpace(value)
			if field == "key" || field == "value" {
				value = normalizeProductAttributeMachineValue(value)
			}
			if value == "" && (field == "key" || field == "value" || field == "categoryKey" || field == "nameZh" || field == "labelZh") {
				return nil, domainValidationError("产品属性分类编码、归属分类和中文名称不能为空")
			}
			updates[column] = value
			continue
		}
		switch field {
		case "sortOrder":
			var value int
			if string(valueRaw) == "null" || json.Unmarshal(valueRaw, &value) != nil {
				return nil, domainValidationError("产品属性排序必须是整数")
			}
			updates["sort_order"] = value
		case "active", "isDefaultSite":
			var value bool
			if string(valueRaw) == "null" || json.Unmarshal(valueRaw, &value) != nil {
				return nil, domainValidationError("产品属性启用和默认站点状态必须是布尔值")
			}
			column := "active"
			if field == "isDefaultSite" {
				column = "is_default_site"
			}
			updates[column] = value
		case "effectiveFrom", "effectiveTo":
			column := "effective_from"
			if field == "effectiveTo" {
				column = "effective_to"
			}
			if string(valueRaw) == "null" {
				updates[column] = nil
				continue
			}
			var value *time.Time
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				return nil, domainValidationError("产品属性生效时间格式无效")
			}
			updates[column] = value
		}
	}
	return updates, nil
}
