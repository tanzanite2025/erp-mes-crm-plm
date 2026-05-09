package apsschedulingengine

type CreatePlanRequest struct {
	OrderIDs  []string `json:"orderIds"`
	Strategy  string   `json:"strategy"`
	Scope     string   `json:"scope"`
	StartDate string   `json:"startDate"`
	EndDate   string   `json:"endDate"`
}

type RecalculatePlanRequest struct {
	Reason    string `json:"reason"`
	Scope     string `json:"scope"`
	StartDate string `json:"startDate"`
	EndDate   string `json:"endDate"`
}

type IngestEventRequest struct {
	Type      string         `json:"type"`
	Source    string         `json:"source"`
	Payload   map[string]any `json:"payload"`
	StartDate string         `json:"startDate"`
	EndDate   string         `json:"endDate"`
}

type PlanResponse struct {
	ID      string `json:"id"`
	Version int    `json:"version"`
	Status  string `json:"status"`
}

type PlanListItemResponse struct {
	ID          string `json:"id"`
	OrderNo     string `json:"orderNo"`
	ProductName string `json:"productName"`
	LineName    string `json:"lineName"`
	StartAt     string `json:"startAt"`
	DueAt       string `json:"dueAt"`
	Status      string `json:"status"`
}

type PlanListResponse struct {
	Items    []PlanListItemResponse `json:"items"`
	Total    int64                  `json:"total"`
	Page     int                    `json:"page"`
	PageSize int                    `json:"pageSize"`
}
