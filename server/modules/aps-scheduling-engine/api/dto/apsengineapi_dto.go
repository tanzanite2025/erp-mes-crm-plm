package apsschedulingengine

type CreatePlanRequest struct {
	OrderIDs []string `json:"orderIds"`
	Strategy string   `json:"strategy"`
	Scope    string   `json:"scope"`
}

type RecalculatePlanRequest struct {
	Reason string `json:"reason"`
	Scope  string `json:"scope"`
}

type IngestEventRequest struct {
	Type    string         `json:"type"`
	Source  string         `json:"source"`
	Payload map[string]any `json:"payload"`
}

type PlanResponse struct {
	ID      string `json:"id"`
	Version int    `json:"version"`
	Status  string `json:"status"`
}
