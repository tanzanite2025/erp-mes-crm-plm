package services

import (
	"encoding/json"
	"fmt"
	"strings"
)

func validateSupportedTopLevelDeltaKeys(delta map[string]json.RawMessage, allowedKeys ...string) error {
	if len(delta) == 0 {
		return fmt.Errorf("delta is required")
	}

	allowed := make(map[string]struct{}, len(allowedKeys))
	for _, key := range allowedKeys {
		allowed[key] = struct{}{}
	}

	for key := range delta {
		trimmed := strings.TrimSpace(key)
		if trimmed == "" {
			return fmt.Errorf("delta key must not be empty")
		}
		if strings.Contains(trimmed, ".") || strings.Contains(trimmed, "[") || strings.Contains(trimmed, "]") {
			return fmt.Errorf("nested delta path is not supported: %s", trimmed)
		}
		if _, ok := allowed[trimmed]; !ok {
			return fmt.Errorf("unsupported patch field: %s", trimmed)
		}
	}

	return nil
}
