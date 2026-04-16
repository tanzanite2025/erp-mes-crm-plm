package services

import "regexp"

var productAttributeMachineValuePattern = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)

func normalizeProductAttributeMachineValue(value string) string {
	return collapseMachineValueSeparators(value)
}

func collapseMachineValueSeparators(value string) string {
	result := make([]rune, 0, len(value))
	lastWasSeparator := false
	for _, r := range value {
		switch {
		case r >= 'A' && r <= 'Z':
			result = append(result, r+('a'-'A'))
			lastWasSeparator = false
		case (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9'):
			result = append(result, r)
			lastWasSeparator = false
		case r == '-' || r == '_' || r == ' ' || r == '\t' || r == '\n' || r == '\r':
			if len(result) == 0 || lastWasSeparator {
				continue
			}
			result = append(result, '-')
			lastWasSeparator = true
		default:
			if len(result) == 0 || lastWasSeparator {
				continue
			}
			result = append(result, '-')
			lastWasSeparator = true
		}
	}
	for len(result) > 0 && result[len(result)-1] == '-' {
		result = result[:len(result)-1]
	}
	return string(result)
}

func isValidProductAttributeMachineValue(value string) bool {
	return productAttributeMachineValuePattern.MatchString(value)
}

func sameProductAttributeMachineValue(a string, b string) bool {
	return normalizeProductAttributeMachineValue(a) == normalizeProductAttributeMachineValue(b)
}

func normalizeProductAttributeCategoryKeyForCompare(value string) string {
	return normalizeProductAttributeMachineValue(value)
}

func sameProductAttributeCategoryKey(a string, b string) bool {
	return normalizeProductAttributeCategoryKeyForCompare(a) == normalizeProductAttributeCategoryKeyForCompare(b)
}
