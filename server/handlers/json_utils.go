package handlers

import (
	"encoding/json"
	"errors"
	"io"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// decodeJSONBodyMap extracts the raw JSON body and unmarshals it into a map of raw messages.
// This allows for partial updates while maintaining awareness of which fields were explicitly provided.
func decodeJSONBodyMap(c *gin.Context) (map[string]json.RawMessage, []byte, error) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		return nil, nil, err
	}

	var payload map[string]json.RawMessage
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, nil, err
	}

	return payload, body, nil
}

func extractDeltaNewValue(raw json.RawMessage) (json.RawMessage, error) {
	var value map[string]json.RawMessage
	if err := json.Unmarshal(raw, &value); err != nil || value == nil {
		return nil, errors.New("delta value must be an SDRTS object with o and n")
	}
	oldValue, hasOld := value["o"]
	newValue, hasNew := value["n"]
	if !hasOld || oldValue == nil || !hasNew || newValue == nil {
		return nil, errors.New("delta value must include both o and n")
	}
	if len(value) != 2 {
		return nil, errors.New("delta value must only contain o and n")
	}
	return newValue, nil
}

func parseOptionalTimeValue(raw json.RawMessage) (*time.Time, error) {
	if string(raw) == "null" {
		return nil, nil
	}

	var text string
	if err := json.Unmarshal(raw, &text); err == nil {
		if text == "" {
			return nil, nil
		}
		parsed, err := time.Parse(time.RFC3339, text)
		if err != nil {
			return nil, err
		}
		return &parsed, nil
	}

	var parsed time.Time
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return nil, err
	}
	return &parsed, nil
}

func validateSupportedTopLevelDeltaKeys(delta map[string]json.RawMessage, allowedKeys ...string) error {
	if len(delta) == 0 {
		return errors.New("delta is required")
	}

	allowed := make(map[string]struct{}, len(allowedKeys))
	for _, key := range allowedKeys {
		allowed[key] = struct{}{}
	}

	for key := range delta {
		trimmed := strings.TrimSpace(key)
		if trimmed == "" {
			return errors.New("delta key must not be empty")
		}
		if strings.Contains(trimmed, ".") || strings.Contains(trimmed, "[") || strings.Contains(trimmed, "]") {
			return errors.New("nested delta path is not supported: " + trimmed)
		}
		if _, ok := allowed[trimmed]; !ok {
			return errors.New("unsupported patch field: " + trimmed)
		}
	}

	return nil
}
