package services

import (
	"encoding/json"
	"time"
)

type MaterialListPageQuery struct {
	Category string
	Search   string
	Page     int
	PageSize int
}

type MaterialOptionQueryResult struct {
	ID        string  `json:"id"`
	Code      string  `json:"code"`
	Name      string  `json:"name"`
	Spec      string  `json:"spec"`
	UOM       string  `json:"uom"`
	Category  string  `json:"category"`
	Status    string  `json:"status"`
	CostPrice float64 `json:"costPrice"`
}

type SaveMaterialAPIRequest struct {
	ID                 string          `json:"id"`
	Code               string          `json:"code"`
	Name               string          `json:"name"`
	Category           string          `json:"category"`
	Spec               string          `json:"spec"`
	InternalDimensions json.RawMessage `json:"internalDimensions"`
	ExternalDimensions json.RawMessage `json:"externalDimensions"`
	UOM                string          `json:"uom"`
	MinStock           float64         `json:"minStock"`
	CostPrice          float64         `json:"costPrice"`
	SupplierID         string          `json:"supplierId"`
	Description        string          `json:"description"`
	Images             json.RawMessage `json:"images"`
	Status             string          `json:"status"`
	RevisionNo         string          `json:"revisionNo"`
	EffectiveFrom      *time.Time      `json:"effectiveFrom"`
	EffectiveTo        *time.Time      `json:"effectiveTo"`
	ChangeType         string          `json:"changeType"`
	ChangeOrderNo      string          `json:"changeOrderNo"`
	SiteCode           string          `json:"siteCode"`
	IsDefaultSite      bool            `json:"isDefaultSite"`
	Version            int             `json:"version"`
}

type BulkSyncMaterialAPIRequest = SaveMaterialAPIRequest

type BulkSyncMaterialsAPIPayload struct {
	Materials     []BulkSyncMaterialAPIRequest `json:"materials"`
	GlobalVersion int                          `json:"globalVersion"`
}
