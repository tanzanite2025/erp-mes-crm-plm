package models

type ContactChannelType string

const (
	ContactChannelTypePhone    ContactChannelType = "phone"
	ContactChannelTypeWechat   ContactChannelType = "wechat"
	ContactChannelTypeEmail    ContactChannelType = "email"
	ContactChannelTypeWhatsApp ContactChannelType = "whatsapp"
	ContactChannelTypeOther    ContactChannelType = "other"
)

type VehicleContactBinding struct {
	ID             string `json:"id" gorm:"column:id;primaryKey"`
	VehicleID      string `json:"vehicleId" gorm:"column:vehicle_id;index"`
	VehicleName    string `json:"vehicleName" gorm:"column:vehicle_name;not null"`
	Category       string `json:"category" gorm:"column:category;index;not null"`
	SupplierName   string `json:"supplierName,omitempty" gorm:"column:supplier_name;default:''"`
	ContactName    string `json:"contactName" gorm:"column:contact_name;not null"`
	PrimaryPhone   string `json:"primaryPhone" gorm:"column:primary_phone;not null"`
	ChannelsJSON   string `json:"channelsJson" gorm:"column:channels_json;type:jsonb;not null;default:'[]'"`
	Region         string `json:"region,omitempty" gorm:"column:region;default:''"`
	DispatchAdvice string `json:"dispatchAdvice,omitempty" gorm:"column:dispatch_advice;default:''"`
	Note           string `json:"note,omitempty" gorm:"column:note;default:''"`
	Enabled        bool   `json:"enabled" gorm:"column:enabled;default:true;index"`
	CreatedAt      string `json:"createdAt" gorm:"column:created_at"`
	UpdatedAt      string `json:"updatedAt" gorm:"column:updated_at"`
	DeletedAt      string `json:"deletedAt,omitempty" gorm:"column:deleted_at;index"`
}
