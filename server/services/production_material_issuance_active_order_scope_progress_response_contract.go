package services

import "time"

type ProductionMaterialIssuanceActiveProgressQuery struct {
	MaterialsPage int
	OrdersPage    int
	PageSize      int
}

type ProductionMaterialIssuanceActiveOrderLineProgress struct {
	SalesOrderID     string                                             `json:"salesOrderId"`
	SalesOrderLineID uint                                               `json:"salesOrderLineId"`
	OrderNo          string                                             `json:"orderNo"`
	LineNo           int                                                `json:"lineNo"`
	CustomerName     string                                             `json:"customerName"`
	ProductName      string                                             `json:"productName"`
	FinishedQty      float64                                            `json:"finishedQty"`
	FinishedUnit     string                                             `json:"finishedUnit"`
	DocumentID       string                                             `json:"documentId"`
	DocumentNo       string                                             `json:"documentNo"`
	BOM              *ProductionMaterialRequirementBOMCandidate         `json:"bom"`
	IssueCode        string                                             `json:"issueCode"`
	Materials        []ProductionMaterialIssuanceSourceMaterialProgress `json:"materials"`
}

type ProductionMaterialIssuanceActiveMaterialProgress struct {
	ProductionMaterialIssuanceMaterialProgressTotal
	MaterialCode    string `json:"materialCode"`
	MaterialName    string `json:"materialName"`
	SourceLineCount int    `json:"sourceLineCount"`
}

type ProductionMaterialIssuanceActiveProgressScope struct {
	ActiveOrderCount      int  `json:"activeOrderCount"`
	SourceLineCount       int  `json:"sourceLineCount"`
	DispatchedLineCount   int  `json:"dispatchedLineCount"`
	UndispatchedLineCount int  `json:"undispatchedLineCount"`
	IssueLineCount        int  `json:"issueLineCount"`
	MaterialCount         int  `json:"materialCount"`
	IsComplete            bool `json:"isComplete"`
}

type ProductionMaterialIssuanceActiveProgressResponse struct {
	AsOf                  time.Time                                           `json:"asOf"`
	WarehouseCategoryCode string                                              `json:"warehouseCategoryCode"`
	Scope                 ProductionMaterialIssuanceActiveProgressScope       `json:"scope"`
	Materials             []ProductionMaterialIssuanceActiveMaterialProgress  `json:"materials"`
	OrderLines            []ProductionMaterialIssuanceActiveOrderLineProgress `json:"orderLines"`
	MaterialsPage         int                                                 `json:"materialsPage"`
	OrdersPage            int                                                 `json:"ordersPage"`
	PageSize              int                                                 `json:"pageSize"`
}
