package models

// ProductionBOMBranchOperationProcessLibrarySelection records the explicit
// process-library entry selected for one stable MBOM branch operation.
//
// The branch operation remains the execution identity used by routes and
// production facts. This relation keeps the reusable process-library identity
// separate from that branch-scoped execution identity.
type ProductionBOMBranchOperationProcessLibrarySelection struct {
	BaseModel
	ProductID          string `gorm:"type:uuid;not null;index:idx_bom_branch_process_library_selection_branch,priority:1;uniqueIndex:idx_bom_branch_process_library_selection_unique,priority:1,where:deleted_at IS NULL" json:"productId"`
	BOMOwnerType       string `gorm:"size:20;not null;index:idx_bom_branch_process_library_selection_branch,priority:2;uniqueIndex:idx_bom_branch_process_library_selection_unique,priority:2,where:deleted_at IS NULL" json:"bomOwnerType"`
	BOMOwnerCustomerID string `gorm:"size:36;not null;default:'';index:idx_bom_branch_process_library_selection_branch,priority:3;uniqueIndex:idx_bom_branch_process_library_selection_unique,priority:3,where:deleted_at IS NULL" json:"bomOwnerCustomerId"`
	BOMVersionLevel    string `gorm:"size:50;not null;default:'';index:idx_bom_branch_process_library_selection_branch,priority:4;uniqueIndex:idx_bom_branch_process_library_selection_unique,priority:4,where:deleted_at IS NULL" json:"bomVersionLevel"`
	BranchOperationID  string `gorm:"type:uuid;not null;uniqueIndex" json:"branchOperationId"`
	ProcessLibraryID   string `gorm:"type:uuid;not null;uniqueIndex:idx_bom_branch_process_library_selection_unique,priority:5,where:deleted_at IS NULL" json:"processLibraryId"`
	SortOrder          int    `gorm:"not null;default:0" json:"sortOrder"`

	BranchOperation *ProductionBOMBranchOperation `gorm:"foreignKey:BranchOperationID" json:"branchOperation,omitempty"`
	ProcessLibrary  *ProcessStep                  `gorm:"foreignKey:ProcessLibraryID" json:"processLibrary,omitempty"`
}
