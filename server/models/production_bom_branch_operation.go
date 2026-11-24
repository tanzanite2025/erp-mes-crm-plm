package models

// ProductionBOMBranchOperation is an independently maintained operation for a stable MBOM branch.
type ProductionBOMBranchOperation struct {
	BaseModel
	ProductID          string `gorm:"type:uuid;not null;index:idx_production_bom_branch_operations_branch,priority:1" json:"productId"`
	BOMOwnerType       string `gorm:"size:20;not null;index:idx_production_bom_branch_operations_branch,priority:2" json:"bomOwnerType"`
	BOMOwnerCustomerID string `gorm:"size:36;not null;default:'';index:idx_production_bom_branch_operations_branch,priority:3" json:"bomOwnerCustomerId"`
	BOMVersionLevel    string `gorm:"size:50;not null;default:'';index:idx_production_bom_branch_operations_branch,priority:4" json:"bomVersionLevel"`
	Name               string `gorm:"size:255;not null" json:"name"`
	Description        string `gorm:"type:text" json:"description"`
	SortOrder          int    `gorm:"not null;default:0" json:"sortOrder"`
	IsActive           bool   `gorm:"not null;default:true" json:"isActive"`
	// ProcessLibraryID is populated from the explicit branch selection relation.
	// It is intentionally not stored on the execution identity row.
	ProcessLibraryID string `gorm:"-" json:"processLibraryId,omitempty"`
}
