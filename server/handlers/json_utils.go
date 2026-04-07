package handlers

import (
	"encoding/json"
	"io"
	"time"

	"github.com/gin-gonic/gin"
)

type deltaValue struct {
	Old json.RawMessage `json:"o"`
	New json.RawMessage `json:"n"`
}

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
	var value deltaValue
	if err := json.Unmarshal(raw, &value); err == nil && value.New != nil {
		return value.New, nil
	}

	return raw, nil
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
