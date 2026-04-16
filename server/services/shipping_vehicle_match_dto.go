package services

type ShippingVehicleMatchItemResponse struct {
	ID                 string   `json:"id"`
	ShipmentID         string   `json:"shipmentId"`
	OrderNo            string   `json:"orderNo"`
	CustomerName       string   `json:"customerName"`
	WarehouseName      string   `json:"warehouseName"`
	MaterialName       string   `json:"materialName"`
	MaterialCode       string   `json:"materialCode"`
	Quantity           float64  `json:"quantity"`
	BoxCount           *int     `json:"boxCount"`
	VolumeM3           *float64 `json:"volumeM3"`
	WeightKg           *float64 `json:"weightKg"`
	Status             string   `json:"status"`
	ShipmentStatus     string   `json:"shipmentStatus"`
	LogisticsStatus    string   `json:"logisticsStatus,omitempty"`
	PackageProfileID   string   `json:"packageProfileId,omitempty"`
	PackageProfileName string   `json:"packageProfileName,omitempty"`
}
