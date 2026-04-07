package services

import "encoding/json"

type DeltaMetadata struct {
	ID      string `json:"id"`
	Version int64  `json:"version"`
}

type DeltaHandlerRequest struct {
	Op       string                     `json:"op"`
	Delta    map[string]json.RawMessage `json:"delta"`
	Metadata DeltaMetadata              `json:"metadata"`
}

type SaveMoldRequest struct {
	ID                   string  `json:"id"`
	SN                   string  `json:"sn"`
	Name                 string  `json:"name"`
	MaxCycles            int     `json:"maxCycles"`
	CurrentCycles        int     `json:"currentCycles"`
	MaintenanceThreshold int     `json:"maintenanceThreshold"`
	TotalLifeCycles      int     `json:"totalLifeCycles"`
	GroupName            string  `json:"groupName"`
	Status               string  `json:"status"`
	Location             string  `json:"location"`
	Description          string  `json:"description"`
	IsAlerted            bool    `json:"isAlerted"`
	LastCheckedAt        *string `json:"lastCheckedAt"`
	ImageURL             string  `json:"imageUrl"`
}

type SaveFurnaceRequest struct {
	ID          string  `json:"id"`
	SN          string  `json:"sn"`
	Name        string  `json:"name"`
	Type        string  `json:"type"`
	MaxTemp     float64 `json:"maxTemp"`
	CurrentTemp float64 `json:"currentTemp"`
	Status      string  `json:"status"`
	Location    string  `json:"location"`
	Description string  `json:"description"`
}

type SaveEquipmentPartnerRequest struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	Type          string `json:"type"`
	ContactPerson string `json:"contactPerson"`
	Phone         string `json:"phone"`
	Address       string `json:"address"`
}

type SaveMoldDrawingRequest struct {
	ID         string `json:"id"`
	MoldID     string `json:"moldId"`
	MoldSN     string `json:"moldSn"`
	Name       string `json:"name"`
	Type       string `json:"type"`
	FileURL    string `json:"fileUrl"`
	Version    string `json:"version"`
	Status     string `json:"status"`
	UploadedAt string `json:"uploadedAt"`
	Remarks    string `json:"remarks"`
}
