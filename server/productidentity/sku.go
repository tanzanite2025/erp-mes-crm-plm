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

func NormalizeVersionLevel(raw string) string {
	return strings.ToUpper(strings.TrimSpace(raw))
}

func DeriveSKU(typeCode string, modelCode string, versionLevel string) string {
	normalizedTypeCode := NormalizeTypeCode(typeCode)
	normalizedModelCode := NormalizeModelCode(modelCode)
	normalizedVersionLevel := NormalizeVersionLevel(versionLevel)

	if normalizedTypeCode == "" {
		return ""
	}
	if normalizedVersionLevel != "" {
		return fmt.Sprintf("%s-%s-%s", normalizedTypeCode, normalizedModelCode, normalizedVersionLevel)
	}
	return fmt.Sprintf("%s-%s", normalizedTypeCode, normalizedModelCode)
}
