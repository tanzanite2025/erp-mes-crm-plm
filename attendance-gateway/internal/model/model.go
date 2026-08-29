package model

import "time"

type Event struct {
	DeviceID           string                 `json:"deviceId,omitempty"`
	DeviceCode         string                 `json:"deviceCode,omitempty"`
	DeviceEmployeeKey  string                 `json:"deviceEmployeeKey"`
	ExternalEventID    string                 `json:"externalEventId,omitempty"`
	OccurredAt         time.Time              `json:"occurredAt"`
	Direction          string                 `json:"direction,omitempty"`
	EventType          string                 `json:"eventType,omitempty"`
	VerificationMethod string                 `json:"verificationMethod,omitempty"`
	Source             string                 `json:"source,omitempty"`
	RawPayload         map[string]interface{} `json:"rawPayload,omitempty"`
}

type EventBatch struct {
	DeviceID   string  `json:"deviceId,omitempty"`
	DeviceCode string  `json:"deviceCode"`
	Events     []Event `json:"events"`
}

type StatusReport struct {
	DeviceID   string `json:"deviceId,omitempty"`
	DeviceCode string `json:"deviceCode"`
	Status     string `json:"status"`
	Message    string `json:"message,omitempty"`
}

type BridgeMessage struct {
	Type       string        `json:"type"`
	Event      *Event        `json:"event,omitempty"`
	Events     []Event       `json:"events,omitempty"`
	Status     *StatusReport `json:"status,omitempty"`
	DeviceCode string        `json:"deviceCode,omitempty"`
	Message    string        `json:"message,omitempty"`
}
