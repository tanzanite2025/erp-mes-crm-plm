package models

const BusinessApprovalTypeQualityStandard = "QUALITY_STANDARD"

// BusinessApprovalPolicyConfiguration owns the approver configuration for a
// business submission. Notification sources, rules and status labels do not own it.
// Existing requests retain their own approver snapshots after this row changes.
type BusinessApprovalPolicyConfiguration struct {
	BaseModel
	BusinessType string `json:"businessType" gorm:"size:80;not null;uniqueIndex"`
	Enabled      bool   `json:"enabled" gorm:"not null"`
	Approver1ID  string `json:"approver1Id" gorm:"size:100"`
	Approver2ID  string `json:"approver2Id" gorm:"size:100"`
	Version      int    `json:"version" gorm:"not null"`
	UpdatedBy    string `json:"updatedBy" gorm:"size:100"`
}

func (BusinessApprovalPolicyConfiguration) TableName() string {
	return "business_approval_policy_configurations"
}
