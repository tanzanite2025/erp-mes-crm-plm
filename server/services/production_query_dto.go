package services

import "time"

type ProductionTaskResponse struct {
	ID          string     `json:"id"`
	PlanID      string     `json:"planId"`
	BatchNo     string     `json:"batchNo"`
	ProcessID   string     `json:"processId"`
	ProcessName string     `json:"processName"`
	TargetQty   float64    `json:"targetQty"`
	ActualQty   float64    `json:"actualQty"`
	Status      string     `json:"status"`
	Operator    string     `json:"operator"`
	StartedAt   *time.Time `json:"startedAt"`
	CompletedAt *time.Time `json:"completedAt"`
}

type ProductionPlanResponse struct {
	ID          string                   `json:"id"`
	CreatedAt   time.Time                `json:"createdAt"`
	UpdatedAt   time.Time                `json:"updatedAt"`
	OrderNo     string                   `json:"orderNo"`
	OrderID     string                   `json:"orderId"`
	ProductID   string                   `json:"productId"`
	ProductName string                   `json:"productName"`
	Quantity    float64                  `json:"quantity"`
	Status      string                   `json:"status"`
	StartDate   *time.Time               `json:"startDate"`
	EndDate     *time.Time               `json:"endDate"`
	Notes       string                   `json:"notes"`
	Tasks       []ProductionTaskResponse `json:"tasks"`
}

type ProductionPlansListResponse struct {
	Items    []ProductionPlanResponse `json:"items"`
	Total    int64                    `json:"total"`
	Page     int                      `json:"page"`
	PageSize int                      `json:"pageSize"`
}

type ProductionStatsResponse struct {
	TotalPlans     int64   `json:"totalPlans"`
	TotalQuantity  float64 `json:"totalQuantity"`
	ActiveWIP      float64 `json:"activeWIP"`
	CompletedToday float64 `json:"completedToday"`
	DelayedCount   int64   `json:"delayedCount"`
}

type ProductionStatsEnvelopeResponse struct {
	Item ProductionStatsResponse `json:"item"`
}

type OrderProgressItemResponse struct {
	ID        string  `json:"id"`
	OrderNo   string  `json:"orderNo"`
	Customer  string  `json:"customer"`
	Target    float64 `json:"target"`
	Completed float64 `json:"completed"`
	WIP       float64 `json:"wip"`
}

type OrderProgressListResponse struct {
	Items []OrderProgressItemResponse `json:"items"`
}
