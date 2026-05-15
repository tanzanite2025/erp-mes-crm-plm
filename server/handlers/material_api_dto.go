package handlers

type MaterialApiDTO struct {
	ID                 string  `json:"id"`
	Code               string  `json:"code"`
	Name               string  `json:"name"`
	Category           string  `json:"category"`
	Spec               string  `json:"spec"`
	InternalDimensions any     `json:"internalDimensions"`
	ExternalDimensions any     `json:"externalDimensions"`
	UOM                string  `json:"uom"`
	MinStock           float64 `json:"minStock"`
	CostPrice          float64 `json:"costPrice"`
	SupplierID         string  `json:"supplierId"`
	Description        string  `json:"description"`
	Images             any     `json:"images"`
	Status             string  `json:"status"`
	// --- MasterDataControl 嵌套命名空间（唯一输出格式） ---
	MasterDataControl  *MasterDataControlDTO `json:"masterDataControl,omitempty"`
	CreatedAt          any     `json:"createdAt"`
	UpdatedAt          any     `json:"updatedAt"`
	Version            int     `json:"version"`
}

type MaterialListPageApiDTO struct {
	Items    []MaterialApiDTO `json:"items"`
	Total    int64            `json:"total"`
	Page     int              `json:"page"`
	PageSize int              `json:"pageSize"`
	Version  string           `json:"version"`
}

type MaterialOptionApiDTO struct {
	ID        string  `json:"id"`
	Code      string  `json:"code"`
	Name      string  `json:"name"`
	Spec      string  `json:"spec"`
	UOM       string  `json:"uom"`
	Category  string  `json:"category"`
	Status    string  `json:"status"`
	CostPrice float64 `json:"costPrice"`
}

type MaterialOptionsApiDTO struct {
	Items   []MaterialOptionApiDTO `json:"items"`
	Version string                 `json:"version"`
}
