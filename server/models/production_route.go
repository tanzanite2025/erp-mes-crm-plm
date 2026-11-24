package models

import "gorm.io/datatypes"

// ProductionRouteFamily owns the route history for one stable MBOM branch.
type ProductionRouteFamily struct {
	BaseModel
	Code               string `gorm:"size:50;uniqueIndex;not null" json:"code"`
	ProductID          string `gorm:"type:uuid;not null;uniqueIndex:idx_production_route_family_branch,priority:1" json:"productId"`
	BOMOwnerType       string `gorm:"size:20;not null;uniqueIndex:idx_production_route_family_branch,priority:2" json:"bomOwnerType"`
	BOMOwnerCustomerID string `gorm:"size:36;not null;default:'';uniqueIndex:idx_production_route_family_branch,priority:3" json:"bomOwnerCustomerId"`
	BOMVersionLevel    string `gorm:"size:50;not null;default:'';uniqueIndex:idx_production_route_family_branch,priority:4" json:"bomVersionLevel"`
	CurrentRevisionID  string `gorm:"type:uuid;index;default:null" json:"currentRevisionId"`
}

// ProductionRoute defines one immutable published or editable draft revision.
type ProductionRoute struct {
	BaseModel
	RouteFamilyID        string                 `gorm:"type:uuid;uniqueIndex:idx_production_route_family_revision,priority:1" json:"routeFamilyId"`
	RouteFamily          *ProductionRouteFamily `gorm:"foreignKey:RouteFamilyID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"routeFamily,omitempty"`
	RevisionNo           int                    `gorm:"not null;uniqueIndex:idx_production_route_family_revision,priority:2" json:"revisionNo"`
	BasedOnRouteID       *string                `gorm:"type:uuid;index;default:null" json:"basedOnRouteId"`
	Code                 string                 `gorm:"size:50;not null" json:"code"`
	Name                 string                 `gorm:"size:255;not null" json:"name"`
	ProductID            string                 `gorm:"size:36;index" json:"productId"`
	ProductSKU           string                 `gorm:"size:100" json:"productSKU"`
	ProductName          string                 `gorm:"size:255" json:"productName"`
	BOMOwnerType         string                 `gorm:"size:20;index" json:"bomOwnerType"`
	BOMOwnerCustomerID   string                 `gorm:"size:36;index" json:"bomOwnerCustomerId"`
	BOMOwnerCustomerName string                 `gorm:"size:255" json:"bomOwnerCustomerName"`
	BOMVersionLevel      string                 `gorm:"size:50;index" json:"bomVersionLevel"`
	Description          string                 `gorm:"type:text" json:"description"`
	Version              int64                  `gorm:"default:1" json:"version"`
	Status               string                 `gorm:"size:20;index;default:'DRAFT'" json:"status"`
	Steps                []ProductionRouteStep  `gorm:"foreignKey:RouteID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"steps"`
}

// ProductionRouteStep binds a route sequence to an operation maintained for its MBOM branch.
type ProductionRouteStep struct {
	BaseModel
	RouteID                            string                        `gorm:"type:uuid;index;not null" json:"routeId"`
	Sequence                           int                           `gorm:"not null;default:0" json:"sequence"`
	BranchOperationID                  string                        `gorm:"type:uuid;index;not null" json:"branchOperationId"`
	BranchOperation                    *ProductionBOMBranchOperation `gorm:"foreignKey:BranchOperationID" json:"branchOperation,omitempty"`
	BranchOperationNameSnapshot        string                        `gorm:"size:255;not null;default:''" json:"branchOperationNameSnapshot"`
	BranchOperationDescriptionSnapshot string                        `gorm:"type:text" json:"branchOperationDescriptionSnapshot"`
	ExecutionMode                      string                        `gorm:"size:30;not null;default:'IN_HOUSE'" json:"executionMode"`
	QualityGate                        string                        `gorm:"size:30;not null;default:'NONE'" json:"qualityGate"`
	QualityRouting                     datatypes.JSON                `gorm:"type:jsonb" json:"qualityRouting"`
	EstimatedMinutes                   int                           `gorm:"not null;default:0" json:"estimatedMinutes"`
	TransferRequired                   bool                          `gorm:"not null;default:false" json:"transferRequired"`
	Description                        string                        `gorm:"type:text" json:"description"`
}
