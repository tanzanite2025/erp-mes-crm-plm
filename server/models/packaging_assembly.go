package models

import "time"

type PackagingAssembly struct {
	BaseModel
	PackageCode string                  `gorm:"size:120;uniqueIndex;not null" json:"packageCode"`
	Status      string                  `gorm:"size:24;index;not null" json:"status"`
	ItemCount   int                     `gorm:"not null;default:0" json:"itemCount"`
	Source      string                  `gorm:"size:40;index;not null" json:"source"`
	SessionID   string                  `gorm:"size:100;index" json:"sessionId"`
	AssembledBy string                  `gorm:"size:120;not null" json:"assembledBy"`
	AssembledAt *time.Time              `gorm:"index" json:"assembledAt,omitempty"`
	Items       []PackagingAssemblyItem `gorm:"foreignKey:AssemblyID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"items,omitempty"`
}

func (PackagingAssembly) TableName() string {
	return "packaging_assemblies"
}

type PackagingAssemblyItem struct {
	BaseModel
	AssemblyID              string                 `gorm:"type:uuid;index;not null" json:"assemblyId"`
	Assembly                *PackagingAssembly     `gorm:"foreignKey:AssemblyID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"assembly,omitempty"`
	ProductBarcode          string                 `gorm:"size:120;uniqueIndex;not null" json:"productBarcode"`
	ProductBarcodeBindingID string                 `gorm:"type:uuid;index;not null" json:"productBarcodeBindingId"`
	ProductBarcodeBinding   *ProductBarcodeBinding `gorm:"foreignKey:ProductBarcodeBindingID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"productBarcodeBinding,omitempty"`
	BarcodeProtocol         string                 `gorm:"size:40;not null" json:"barcodeProtocol"`
	BarcodeSummary          string                 `gorm:"type:text;not null" json:"barcodeSummary"`
	SortOrder               int                    `gorm:"not null;default:0" json:"sortOrder"`
}

func (PackagingAssemblyItem) TableName() string {
	return "packaging_assembly_items"
}

type PackagingAssemblyCaptureSession struct {
	BaseModel
	SessionID              string     `gorm:"size:100;uniqueIndex;not null" json:"sessionId"`
	UploadToken            string     `gorm:"size:120;not null" json:"-"`
	Status                 string     `gorm:"size:24;default:'Waiting';index" json:"status"`
	PackageCode            string     `gorm:"size:120;index;not null" json:"packageCode"`
	ProductBarcodeSnapshot string     `gorm:"type:text" json:"productBarcodeSnapshot"`
	AssemblyID             *string    `gorm:"type:uuid;index" json:"assemblyId,omitempty"`
	SubmittedAt            *time.Time `json:"submittedAt,omitempty"`
	ExpiresAt              time.Time  `gorm:"index" json:"expiresAt"`
}

func (PackagingAssemblyCaptureSession) TableName() string {
	return "packaging_assembly_capture_sessions"
}
