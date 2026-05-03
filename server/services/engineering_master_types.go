package services

import (
	"errors"
	"time"
	"xdfc-server/models"
)

var (
	ErrBOMIDRequired         = errors.New("bom id is required")
	ErrBOMActiveConflict     = errors.New("active bom conflict")
	ErrBOMDeleteLockedActive = errors.New("active bom delete locked")
)

type BOMListQuery struct {
	Page      int
	PageSize  int
	Options   bool
	ProductID string
}

type SaveBOMInput struct {
	ID            string           `json:"id"`
	BOMNo         string           `json:"bomNo"`
	ProductID     string           `json:"productId"`
	VersionText   string           `json:"version"`
	Status        string           `json:"status"`
	Items         []models.BOMItem `json:"items"`
	Description   string           `json:"description"`
	Version       int              `json:"_v"`
	RevisionNo    string           `json:"revisionNo"`
	EffectiveFrom *time.Time       `json:"effectiveFrom"`
	EffectiveTo   *time.Time       `json:"effectiveTo"`
	ChangeType    string           `json:"changeType"`
	ChangeOrderNo string           `json:"changeOrderNo"`
	SiteCode      string           `json:"siteCode"`
	IsDefaultSite bool             `json:"isDefaultSite"`
}

func (input SaveBOMInput) toModel() models.BOM {
	model := models.BOM{
		BaseModel: models.BaseModel{
			ID: input.ID,
		},
		MasterDataControl: models.MasterDataControl{
			RevisionNo:    input.RevisionNo,
			EffectiveFrom: input.EffectiveFrom,
			EffectiveTo:   input.EffectiveTo,
			ChangeType:    input.ChangeType,
			ChangeOrderNo: input.ChangeOrderNo,
			SiteCode:      input.SiteCode,
			IsDefaultSite: input.IsDefaultSite,
		},
		BOMNo:       input.BOMNo,
		ProductID:   input.ProductID,
		VersionText: input.VersionText,
		Status:      input.Status,
		Items:       input.Items,
		Description: input.Description,
	}
	return model
}
