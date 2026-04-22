package models

// ProductAppearance 产品外观主数据
// 独立于产品型号建立流程，由工程主数据中心维护，供销售订单等下游场景消费。
type ProductAppearance struct {
	BaseModel
	MasterDataControl
	Name              string `gorm:"size:100;not null;index" json:"name"`
	BarcodeCode       string `gorm:"size:10;not null;uniqueIndex" json:"barcodeCode"`
	Description       string `gorm:"type:text" json:"description"`
	ImageURL          string `gorm:"size:1024" json:"imageUrl"`
	ImageThumbnailURL string `gorm:"size:1024" json:"imageThumbnailUrl"`
	ImageName         string `gorm:"size:255" json:"imageName"`
	Active            bool   `gorm:"default:true;index" json:"active"`
	SortOrder         int    `gorm:"default:0;index" json:"sortOrder"`
	Version           int    `gorm:"default:1" json:"version"`
}

func (ProductAppearance) TableName() string {
	return "product_appearances"
}
