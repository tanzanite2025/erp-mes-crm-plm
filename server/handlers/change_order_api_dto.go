package handlers

type ChangeOrderOptionsApiDTO struct {
	ID            string  `json:"id"`
	ChangeOrderNo string  `json:"changeOrderNo"`
	Title         string  `json:"title"`
	ChangeType    string  `json:"changeType"`
	ProductID     *string `json:"productId,omitempty"`
	SiteCode      string  `json:"siteCode,omitempty"`
	IsDefaultSite bool    `json:"isDefaultSite"`
	RevisionNo    string  `json:"revisionNo,omitempty"`
	EffectiveFrom any     `json:"effectiveFrom,omitempty"`
	EffectiveTo   any     `json:"effectiveTo,omitempty"`
	Status        string  `json:"status"`
	Version       int     `json:"_v"`
}

type ChangeOrderApiDTO struct {
	ID            string         `json:"id"`
	ChangeOrderNo string         `json:"changeOrderNo"`
	Title         string         `json:"title"`
	ChangeType    string         `json:"changeType"`
	ProductID     *string        `json:"productId,omitempty"`
	Product       *ProductApiDTO `json:"product,omitempty"`
	SiteCode      string         `json:"siteCode,omitempty"`
	IsDefaultSite bool           `json:"isDefaultSite"`
	RevisionNo    string         `json:"revisionNo,omitempty"`
	EffectiveFrom any            `json:"effectiveFrom,omitempty"`
	EffectiveTo   any            `json:"effectiveTo,omitempty"`
	Status        string         `json:"status"`
	Description   string         `json:"description,omitempty"`
	CreatedAt     any            `json:"createdAt"`
	UpdatedAt     any            `json:"updatedAt"`
	Version       int            `json:"_v"`
}

type ChangeOrderListPageApiDTO struct {
	Items    []ChangeOrderApiDTO `json:"items"`
	Total    int64               `json:"total"`
	Page     int                 `json:"page"`
	PageSize int                 `json:"pageSize"`
}
