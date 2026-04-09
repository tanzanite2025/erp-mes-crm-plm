package handlers

import "encoding/json"

func servicesDeltaKeys(delta map[string]json.RawMessage) []string {
	keys := make([]string, 0, len(delta))
	for key := range delta {
		keys = append(keys, key)
	}
	return keys
}
