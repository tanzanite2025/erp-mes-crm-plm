package services

import (
	"encoding/json"
	"errors"
	"time"
	"xdfc-server/models"
)

var (
	ErrBOMIDRequired             = errors.New("bom id is required")
	ErrBOMActiveConflict         = errors.New("active bom conflict")
	ErrBOMDeleteLockedActive     = errors.New("active bom delete locked")
	ErrBOMRelationSidecarInvalid = errors.New("invalid bom relation sidecar")
	ErrEBOMNotFound              = errors.New("source EBOM not found")
	ErrInvalidBOMType            = errors.New("invalid BOM type for derivation")
)

type BOMListQuery struct {
	Page      int
	PageSize  int
	Options   bool
	ProductID string
	Status    string
	BOMType   string
}

// DeltaOperation 表示差量操作类型
type DeltaOperation string

const (
	DeltaOperationAdd    DeltaOperation = "add"
	DeltaOperationRemove DeltaOperation = "remove"
	DeltaOperationMove   DeltaOperation = "move"
	DeltaOperationUpdate DeltaOperation = "update"
)

// DeltaEntry 表示单个差量条目
type DeltaEntry struct {
	Operation DeltaOperation  `json:"op"`
	Path      string          `json:"path"`
	Value     interface{}     `json:"value,omitempty"`
	OldValue  interface{}     `json:"oldValue,omitempty"`
}

// DeltaSet 表示差量集合
type DeltaSet struct {
	Entries []DeltaEntry `json:"entries"`
}

type SaveBOMInput struct {
	ID              string           `json:"id"`
	BOMNo           string           `json:"bomNo"`
	BOMType         string           `json:"bomType"`
	ProductID       string           `json:"productId"`
	VersionText     string           `json:"bomVersion"`
	Status          string           `json:"status"`
	Items           []models.BOMItem `json:"items"`
	Description     string           `json:"description"`
	Version         int              `json:"version"`
	MasterDataControl struct {
		RevisionNo    string     `json:"revisionNo"`
		EffectiveFrom *time.Time `json:"effectiveFrom"`
		EffectiveTo   *time.Time `json:"effectiveTo"`
		ChangeType    string     `json:"changeType"`
		ChangeOrderNo string     `json:"changeOrderNo"`
		SiteCode      string     `json:"siteCode"`
		IsDefaultSite bool       `json:"isDefaultSite"`
	} `json:"masterDataControl"`
	RelationSidecar json.RawMessage  `json:"relationSidecar"`
	// 🔥 SDRTS 协议：Sidecar Delta
	SidecarDelta    *DeltaSet        `json:"_sidecarDelta,omitempty"`
}

type PromoteBOMStatusInput struct {
	Status          string `json:"status"`
	ExpectedVersion *int   `json:"expectedVersion,omitempty"`
	Reason          string `json:"reason,omitempty"`          // ✅ 新增：状态转换原因
	ApproverComment string `json:"approverComment,omitempty"` // ✅ 新增：审批意见
}

type DeriveMBOMInput struct {
	Description     string `json:"description"`
	RevisionNo      string `json:"revisionNo"`
	ChangeOrderNo   string `json:"changeOrderNo"`
	SourceVersion   *int   `json:"sourceVersion,omitempty"` // ✅ 新增：源 EBOM 版本号
}

// ReviseMBOMInput 描述工艺师对当前 MBOM 提交修订时的入参。
// 修订是 MBOM 自身版本独立升级，不影响 EBOM。
type ReviseMBOMInput struct {
	Reason          string `json:"reason"`           // 修订原因（必填，用于审计与通知模板）
	ChangeOrderNo   string `json:"changeOrderNo"`    // 工艺变更单号（可选）
	RevisionNo      string `json:"revisionNo"`       // 新版本的修订号（默认在原基础上 +1）
	ExpectedVersion *int   `json:"expectedVersion,omitempty"` // 乐观锁
}

func (input SaveBOMInput) toModel() models.BOM {
	model := models.BOM{
		BaseModel: models.BaseModel{
			ID: input.ID,
		},
		MasterDataControl: models.MasterDataControl{
			RevisionNo:    input.MasterDataControl.RevisionNo,
			EffectiveFrom: input.MasterDataControl.EffectiveFrom,
			EffectiveTo:   input.MasterDataControl.EffectiveTo,
			ChangeType:    input.MasterDataControl.ChangeType,
			ChangeOrderNo: input.MasterDataControl.ChangeOrderNo,
			SiteCode:      input.MasterDataControl.SiteCode,
			IsDefaultSite: input.MasterDataControl.IsDefaultSite,
		},
		BOMNo:           input.BOMNo,
		BOMType:         input.BOMType,
		ProductID:       input.ProductID,
		VersionText:     input.VersionText,
		Status:          input.Status,
		Items:           input.Items,
		Description:     input.Description,
		RelationSidecar: input.RelationSidecar,
	}
	return model
}
