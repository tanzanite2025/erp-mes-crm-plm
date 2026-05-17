package productidentity

import (
	"fmt"
	"strings"
)

func NormalizeTypeCode(raw string) string {
	return strings.ToUpper(strings.ReplaceAll(strings.TrimSpace(raw), " ", ""))
}

func NormalizeModelCode(raw string) string {
	digitsOnly := strings.Builder{}
	for _, r := range strings.TrimSpace(raw) {
		if r >= '0' && r <= '9' {
			digitsOnly.WriteRune(r)
		}
		if digitsOnly.Len() >= 2 {
			break
		}
	}
	if digitsOnly.Len() == 0 {
		return "01"
	}
	return digitsOnly.String()
}

// DeriveSKU 派生产品 SKU。
//
// 思路 3 重构 (Step R7): versionLevel 已迁移到 BOM,产品 SKU 不再含 versionLevel,
// 公式简化为 typeCode-modelCode。
func DeriveSKU(typeCode string, modelCode string) string {
	normalizedTypeCode := NormalizeTypeCode(typeCode)
	normalizedModelCode := NormalizeModelCode(modelCode)

	if normalizedTypeCode == "" {
		return ""
	}
	return fmt.Sprintf("%s-%s", normalizedTypeCode, normalizedModelCode)
}
