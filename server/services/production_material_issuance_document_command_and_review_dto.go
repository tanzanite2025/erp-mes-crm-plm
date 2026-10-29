package services

import (
	"errors"
	"xdfc-server/models"
)

var (
	ErrProductionMaterialIssuanceInvalidRequest = errors.New("invalid production material issuance request")
	ErrProductionMaterialIssuanceBasisChanged   = errors.New("production material issuance basis changed")
	ErrProductionMaterialIssuanceSourceCovered  = errors.New("production material issuance source already covered")
	ErrProductionMaterialIssuanceCommandReused  = errors.New("production material issuance command reused with different payload")
	ErrProductionMaterialIssuanceOrderProtected = errors.New("production material issuance protects this order source")
)

type ProductionMaterialIssuanceSourceSelection struct {
	SalesOrderID     string `json:"salesOrderId"`
	SalesOrderLineID uint   `json:"salesOrderLineId"`
	BOMID            string `json:"bomId"`
}

type ProductionMaterialIssuanceFrozenMaterialContribution struct {
	ProductionMaterialRequirementContribution
	MaterialCode string `json:"materialCode"`
	MaterialName string `json:"materialName"`
	MaterialSpec string `json:"materialSpec"`
}

// Only the selected BOM is frozen; unused candidate BOMs are not historical basis.
type ProductionMaterialIssuanceReviewedSourceBasis struct {
	SalesOrderID     string                                                 `json:"salesOrderId"`
	SalesOrderLineID uint                                                   `json:"salesOrderLineId"`
	OrderVersion     int                                                    `json:"orderVersion"`
	OrderNo          string                                                 `json:"orderNo"`
	LineNo           int                                                    `json:"lineNo"`
	CustomerID       string                                                 `json:"customerId"`
	CustomerName     string                                                 `json:"customerName"`
	ProductID        string                                                 `json:"productId"`
	ProductName      string                                                 `json:"productName"`
	FinishedQty      float64                                                `json:"finishedQty"`
	FinishedUnit     string                                                 `json:"finishedUnit"`
	BOM              ProductionMaterialRequirementBOMCandidate              `json:"bom"`
	Contributions    []ProductionMaterialIssuanceFrozenMaterialContribution `json:"contributions"`
	BasisFingerprint string                                                 `json:"basisFingerprint"`
}

type ProductionMaterialIssuanceDispatchSourceExpectation struct {
	ProductionMaterialIssuanceSourceSelection
	ExpectedOrderVersion int    `json:"expectedOrderVersion"`
	ExpectedBOMVersion   int    `json:"expectedBomVersion"`
	BasisFingerprint     string `json:"basisFingerprint"`
}

type ProductionMaterialIssuanceDispatchRequest struct {
	CommandID string                                                `json:"commandId"`
	Sources   []ProductionMaterialIssuanceDispatchSourceExpectation `json:"sources"`
}

type ProductionMaterialIssuanceWithdrawalRequest struct {
	CommandID       string `json:"commandId"`
	DocumentID      string `json:"documentId"`
	ExpectedVersion int    `json:"expectedVersion"`
	Reason          string `json:"reason"`
}

type ProductionMaterialIssuanceDocumentDetail struct {
	Document models.ProductionMaterialIssuanceDocument       `json:"document"`
	Sources  []ProductionMaterialIssuanceReviewedSourceBasis `json:"sources"`
}

type ProductionMaterialIssuanceCommandActor struct {
	UserID   string
	Username string
	IP       string
}

type ProductionMaterialIssuanceDocumentList struct {
	Items    []models.ProductionMaterialIssuanceDocument `json:"items"`
	Total    int64                                       `json:"total"`
	Page     int                                         `json:"page"`
	PageSize int                                         `json:"pageSize"`
}
