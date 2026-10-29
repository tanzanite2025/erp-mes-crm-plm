package services

import (
	"errors"
	"time"
	"xdfc-server/models"
)

var ErrInvalidProductionMaterialRequirementSelection = errors.New("invalid production material requirement selection")

type ProductionMaterialRequirementBOMSelection struct {
	SalesOrderID     string `json:"salesOrderId"`
	SalesOrderLineID uint   `json:"salesOrderLineId"`
	BOMID            string `json:"bomId"`
}

type ProductionMaterialRequirementBOMCandidate struct {
	ID                  string  `json:"id"`
	BOMNo               string  `json:"bomNo"`
	Version             int     `json:"version"`
	RevisionNo          string  `json:"revisionNo"`
	BOMVersion          string  `json:"bomVersion"`
	VersionLevel        string  `json:"versionLevel"`
	VersionLevelLabelZh string  `json:"versionLevelLabelZh"`
	VersionLevelLabelEn string  `json:"versionLevelLabelEn"`
	OwnerType           string  `json:"ownerType"`
	OwnerCustomerID     string  `json:"ownerCustomerId"`
	MeasuredWeight      float64 `json:"measuredWeight"`
	MeasuredWeightUnit  string  `json:"measuredWeightUnit"`
}

type ProductionMaterialRequirementContribution struct {
	BOMItemID     string  `json:"bomItemId"`
	MaterialID    string  `json:"materialId"`
	Section       string  `json:"section"`
	Unit          string  `json:"unit"`
	StandardUsage float64 `json:"standardUsage"`
	RequiredQty   float64 `json:"requiredQty"`
}

type ProductionMaterialRequirementSourceLine struct {
	SalesOrderID     string                                      `json:"salesOrderId"`
	SalesOrderLineID uint                                        `json:"salesOrderLineId"`
	OrderVersion     int                                         `json:"orderVersion"`
	OrderNo          string                                      `json:"orderNo"`
	LineNo           int                                         `json:"lineNo"`
	TotalLines       int                                         `json:"totalLines"`
	CustomerID       string                                      `json:"customerId"`
	CustomerName     string                                      `json:"customerName"`
	ProductID        string                                      `json:"productId"`
	ProductModel     string                                      `json:"productModel"`
	ProductName      string                                      `json:"productName"`
	FinishedQty      float64                                     `json:"finishedQty"`
	BOM              *ProductionMaterialRequirementBOMCandidate  `json:"bom"`
	BOMCandidates    []ProductionMaterialRequirementBOMCandidate `json:"bomCandidates"`
	Contributions    []ProductionMaterialRequirementContribution `json:"contributions"`
	IssueCode        string                                      `json:"issueCode"`
}

type ProductionMaterialRequirementExpansionInput struct {
	Orders                    []models.SalesOrder
	BOMs                      []models.BOM
	Materials                 []models.Material
	Products                  []models.Product
	SelectedKeys              []string
	BOMSelections             []ProductionMaterialRequirementBOMSelection
	PerformanceVersionOptions []models.ProductAttributeOption
	AsOf                      time.Time
}

type ProductionMaterialRequirementExpansion struct {
	SourceLines []ProductionMaterialRequirementSourceLine
	IsComplete  bool
}
