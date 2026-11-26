package models

// ProductionMBOMBranchProcessAssociation links a stable MBOM branch directly
// to an allowed process-library identity.
type ProductionMBOMBranchProcessAssociation struct {
	BaseModel
	ProductID          string       `gorm:"type:uuid;not null;index:idx_mbom_branch_process_branch,priority:1;uniqueIndex:idx_mbom_branch_process_unique,priority:1,where:deleted_at IS NULL" json:"productId"`
	BOMOwnerType       string       `gorm:"size:20;not null;index:idx_mbom_branch_process_branch,priority:2;uniqueIndex:idx_mbom_branch_process_unique,priority:2,where:deleted_at IS NULL" json:"bomOwnerType"`
	BOMOwnerCustomerID string       `gorm:"size:36;not null;default:'';index:idx_mbom_branch_process_branch,priority:3;uniqueIndex:idx_mbom_branch_process_unique,priority:3,where:deleted_at IS NULL" json:"bomOwnerCustomerId"`
	BOMVersionLevel    string       `gorm:"size:50;not null;default:'';index:idx_mbom_branch_process_branch,priority:4;uniqueIndex:idx_mbom_branch_process_unique,priority:4,where:deleted_at IS NULL" json:"bomVersionLevel"`
	ProcessStepID      string       `gorm:"type:uuid;not null;uniqueIndex:idx_mbom_branch_process_unique,priority:5,where:deleted_at IS NULL" json:"processStepId"`
	SortOrder          int          `gorm:"not null;default:0" json:"sortOrder"`
	ProcessStep        *ProcessStep `gorm:"foreignKey:ProcessStepID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"processStep,omitempty"`
}

func (ProductionMBOMBranchProcessAssociation) TableName() string {
	return "production_mbom_branch_process_associations"
}
