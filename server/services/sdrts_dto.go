package services

import "encoding/json"

// SDRTSDeltaMetadata is the canonical metadata envelope for SDRTS delta payloads.
type SDRTSDeltaMetadata struct {
	ID      string `json:"id"`
	Version int64  `json:"version"`
}

// SDRTSDeltaHandlerRequest is the canonical handler-level envelope for SDRTS delta updates.
type SDRTSDeltaHandlerRequest struct {
	Op       string                     `json:"op"`
	Delta    map[string]json.RawMessage `json:"delta"`
	Metadata SDRTSDeltaMetadata         `json:"metadata"`
}
