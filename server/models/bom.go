package models

import "encoding/json"

const (
	BOMTypeEBOM = "EBOM"
	BOMTypeMBOM = "MBOM"

	// EBOM 完整生命周期：DRAFT → REVIEWING → APPROVED → RELEASED → OBSOLETE
	// MBOM 数据层只用 RELEASED / OBSOLETE（派生即生效，无草稿/审批中间态）
	BOMStatusDraft     = "DRAFT"
	BOMStatusReviewing = "REVIEWING"
	BOMStatusApproved  = "APPROVED"
	BOMStatusReleased  = "RELEASED"
	BOMStatusObsolete  = "OBSOLETE"
)

// BOM 配方清单模型
type BOM struct {
	BaseModel
	MasterDataControl
	BOMType         string          `gorm:"size:20;not null;default:'EBOM'" json:"bomType"`
	BOMNo           string          `gorm:"size:50;uniqueIndex;not null" json:"bomNo"`
	ProductID       string          `gorm:"type:uuid;index;not null" json:"productId"`
	Product         *Product        `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	SourceEBOMID    *string         `gorm:"type:uuid;index" json:"sourceEbomId,omitempty"`
	VersionText     string          `gorm:"size:20;default:'V1.0'" json:"bomVersion"`
	Status          string          `gorm:"size:20;default:'DRAFT'" json:"status"`
	IsLocked        bool            `gorm:"default:false" json:"isLocked"`
	Version         int             `gorm:"default:1" json:"version"`
	// 归属语义在 BOM 维度（方案 B + 1:1 设计）：
	//   - INTERNAL：内部生产 BOM（OwnerCustomerID 留空）
	//   - CUSTOMER：某客户专供 BOM（OwnerCustomerID 必填，关联 Customer.ID）
	OwnerType       string          `gorm:"size:20;not null;default:'INTERNAL';index" json:"ownerType"`
	OwnerCustomerID string          `gorm:"type:uuid;index" json:"ownerCustomerId,omitempty"`
	// MeasuredWeight 是该 BOM 对应最终产品的实测/目标重量（方案 B 端到端权威源）。
	// > 0 才允许 RELEASED；EBOM 阶段可为 0 表示尚未称重。
	MeasuredWeight     float64         `gorm:"not null;default:0" json:"measuredWeight"`
	// MeasuredWeightUnit 引用 basic_settings 单位主数据（WEIGHT 类目），如 g/kg。
	MeasuredWeightUnit string          `gorm:"size:20;not null;default:'g'" json:"measuredWeightUnit"`
	Items           []BOMItem       `gorm:"foreignKey:BOMID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"items"`
	Description     string          `gorm:"type:text" json:"description"`
	RelationSidecar json.RawMessage `gorm:"type:jsonb" json:"-"`
}

// BOMItem BOM 鏄庣粏琛屾ā鍨?
type BOMItem struct {
	ID             string  `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	BOMID          string  `gorm:"type:uuid;index;not null" json:"bomId"`
	Section        string  `gorm:"size:100" json:"section"`
	MaterialID     string  `gorm:"type:uuid;index" json:"materialId"`
	UnitPrice      float64 `json:"unitPrice"`
	Unit           string  `gorm:"size:20" json:"unit"`
	UnitUsage      float64 `json:"unitUsage"`
	WastagePercent float64 `json:"wastagePercent"`
	StandardUsage  float64 `json:"standardUsage"`
	MaterialType   string  `gorm:"size:50" json:"materialType"`
	SupplyChannel  string  `gorm:"size:100" json:"supplyChannel"`
	SortOrder      int     `gorm:"default:0" json:"sortOrder"`
}
