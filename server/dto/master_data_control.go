// Package dto 提供跨 handlers/services 共享的 wire format 数据传输对象。
package dto

import "xdfc-server/models"

// MasterDataControlDTO 版本控制字段的嵌套命名空间。
// 过渡期内与平铺字段同时输出，前端优先读嵌套。
type MasterDataControlDTO struct {
	RevisionNo    string      `json:"revisionNo,omitempty"`
	EffectiveFrom interface{} `json:"effectiveFrom,omitempty"`
	EffectiveTo   interface{} `json:"effectiveTo,omitempty"`
	ChangeType    string      `json:"changeType,omitempty"`
	ChangeOrderNo string      `json:"changeOrderNo,omitempty"`
	SiteCode      string      `json:"siteCode,omitempty"`
	IsDefaultSite bool        `json:"isDefaultSite"`
}

// MapMasterDataControl 将 model 层的 MasterDataControl 转换为嵌套 DTO。
func MapMasterDataControl(mdc models.MasterDataControl) *MasterDataControlDTO {
	return &MasterDataControlDTO{
		RevisionNo:    mdc.RevisionNo,
		EffectiveFrom: mdc.EffectiveFrom,
		EffectiveTo:   mdc.EffectiveTo,
		ChangeType:    mdc.ChangeType,
		ChangeOrderNo: mdc.ChangeOrderNo,
		SiteCode:      mdc.SiteCode,
		IsDefaultSite: mdc.IsDefaultSite,
	}
}
