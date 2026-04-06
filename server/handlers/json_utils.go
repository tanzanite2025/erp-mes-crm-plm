package handlers

import (
	"encoding/json"
	"io"

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
