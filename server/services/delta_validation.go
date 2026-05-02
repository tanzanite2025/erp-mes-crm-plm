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

func extractDeltaNewValue(raw json.RawMessage) (json.RawMessage, error) {
	var value map[string]json.RawMessage
	if err := json.Unmarshal(raw, &value); err != nil || value == nil {
		return nil, fmt.Errorf("delta value must be an SDRTS object with o and n")
	}
	oldValue, hasOld := value["o"]
	newValue, hasNew := value["n"]
	if !hasOld || oldValue == nil || !hasNew || newValue == nil {
		return nil, fmt.Errorf("delta value must include both o and n")
	}
	if len(value) != 2 {
		return nil, fmt.Errorf("delta value must only contain o and n")
	}
	return newValue, nil
}
