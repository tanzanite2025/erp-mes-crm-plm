package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"xdfc-server/models"

	"github.com/google/uuid"
)

var (
	ErrInvalidProductionTopologyTemplate          = errors.New("invalid production topology template")
	ErrProductionTopologyTemplateVersionConflict  = errors.New("拓扑模板已修改，请刷新后重试")
	ErrProductionTopologyTemplateLineCodeConflict = errors.New("新 L1 编码已存在，请使用其他编码")
)

type ProductionTopologyTemplateOperationReferenceSnapshot struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	SortOrder   int    `json:"sortOrder"`
	IsActive    bool   `json:"isActive"`
}

type ProductionTopologyTemplateBranchSnapshot struct {
	ProductID           string                                                 `json:"productId"`
	BOMOwnerType        string                                                 `json:"bomOwnerType"`
	BOMOwnerCustomerID  string                                                 `json:"bomOwnerCustomerId"`
	BOMVersionLevel     string                                                 `json:"bomVersionLevel"`
	Name                string                                                 `json:"name"`
	ProductSKU          string                                                 `json:"productSKU"`
	Description         string                                                 `json:"description"`
	Attributes          json.RawMessage                                        `json:"attributes"`
	OperationReferences []ProductionTopologyTemplateOperationReferenceSnapshot `json:"operationReferences"`
}

type ProductionTopologyTemplateSnapshot struct {
	ProductTemplateID   string                                     `json:"productTemplateId"`
	ProductTemplateName string                                     `json:"productTemplateName"`
	SourceLineCode      string                                     `json:"sourceLineCode"`
	LineDescription     string                                     `json:"lineDescription"`
	Branches            []ProductionTopologyTemplateBranchSnapshot `json:"branches"`
}

type ProductionTopologyTemplateDTO struct {
	ID          string                             `json:"id"`
	Name        string                             `json:"name"`
	Description string                             `json:"description"`
	Version     int64                              `json:"version"`
	CreatedAt   time.Time                          `json:"createdAt"`
	UpdatedAt   time.Time                          `json:"updatedAt"`
	Snapshot    ProductionTopologyTemplateSnapshot `json:"snapshot"`
}

type CaptureProductionTopologyTemplateFromLineRequest struct {
	SourceLineID      string `json:"sourceLineId" binding:"required,uuid"`
	SourceLineVersion int64  `json:"sourceLineVersion" binding:"required,min=1"`
	Name              string `json:"name" binding:"required"`
	Description       string `json:"description"`
}

type SaveProductionTopologyTemplateSnapshotRequest struct {
	Name        string                             `json:"name"`
	Description string                             `json:"description"`
	Version     int64                              `json:"version" binding:"required,min=1"`
	Snapshot    ProductionTopologyTemplateSnapshot `json:"snapshot"`
}

type ApplyProductionTopologyTemplateToNewLineRequest struct {
	Version     int64   `json:"version" binding:"required,min=1"`
	Code        string  `json:"code" binding:"required"`
	Description *string `json:"description"`
}

func mapProductionTopologyTemplateSnapshotToDTO(template models.ProductionTopologyTemplate) (ProductionTopologyTemplateDTO, error) {
	result := ProductionTopologyTemplateDTO{ID: template.ID, Name: template.Name, Description: template.Description,
		Version: template.Version, CreatedAt: template.CreatedAt, UpdatedAt: template.UpdatedAt}
	err := json.Unmarshal(template.Snapshot, &result.Snapshot)
	return result, err
}

func validateProductionTopologyTemplateSnapshot(name string, snapshot *ProductionTopologyTemplateSnapshot) error {
	if strings.TrimSpace(name) == "" || len([]rune(name)) > 255 {
		return fmt.Errorf("%w: 模板名称不能为空且不能超过 255 个字符", ErrInvalidProductionTopologyTemplate)
	}
	if _, err := uuid.Parse(snapshot.ProductTemplateID); err != nil {
		return fmt.Errorf("%w: 必须选择产品侧模板", ErrInvalidProductionTopologyTemplate)
	}
	if snapshot.Branches == nil {
		snapshot.Branches = []ProductionTopologyTemplateBranchSnapshot{}
	}
	if len(snapshot.Branches) > 200 {
		return fmt.Errorf("%w: 模板最多包含 200 个分支", ErrInvalidProductionTopologyTemplate)
	}
	seen := make(map[productionRouteBOMBranchIdentity]struct{})
	for index := range snapshot.Branches {
		branch := &snapshot.Branches[index]
		parsedID, err := uuid.Parse(branch.ProductID)
		if err != nil {
			return fmt.Errorf("%w: 分支产品身份无效", ErrInvalidProductionTopologyTemplate)
		}
		branch.ProductID = parsedID.String()
		branch.BOMOwnerType = strings.ToUpper(strings.TrimSpace(branch.BOMOwnerType))
		branch.BOMOwnerCustomerID = strings.TrimSpace(branch.BOMOwnerCustomerID)
		branch.BOMVersionLevel = strings.TrimSpace(branch.BOMVersionLevel)
		if len(branch.BOMVersionLevel) > 50 {
			return fmt.Errorf("%w: 分支性能版本过长", ErrInvalidProductionTopologyTemplate)
		}
		if branch.BOMOwnerType == "CUSTOMER" {
			customerID, err := uuid.Parse(branch.BOMOwnerCustomerID)
			if err != nil {
				return fmt.Errorf("%w: 客户分支归属身份无效", ErrInvalidProductionTopologyTemplate)
			}
			branch.BOMOwnerCustomerID = customerID.String()
		}
		if branch.OperationReferences == nil {
			branch.OperationReferences = []ProductionTopologyTemplateOperationReferenceSnapshot{}
		}
		identity := productionRouteBOMBranchIdentity{ProductID: branch.ProductID, BOMOwnerType: branch.BOMOwnerType,
			BOMOwnerCustomerID: branch.BOMOwnerCustomerID, BOMVersionLevel: branch.BOMVersionLevel}
		if err := validateProductionRouteBOMBranchIdentity(models.ProductionRoute{ProductID: identity.ProductID, BOMOwnerType: identity.BOMOwnerType,
			BOMOwnerCustomerID: identity.BOMOwnerCustomerID, BOMVersionLevel: identity.BOMVersionLevel}); err != nil {
			return fmt.Errorf("%w: %v", ErrInvalidProductionTopologyTemplate, err)
		}
		if _, duplicate := seen[identity]; duplicate {
			return fmt.Errorf("%w: 同一 MBOM 分支不能重复加入模板", ErrInvalidProductionTopologyTemplate)
		}
		seen[identity] = struct{}{}
		if len(branch.OperationReferences) > 500 {
			return fmt.Errorf("%w: 一个分支最多保留 500 条工序参考", ErrInvalidProductionTopologyTemplate)
		}
	}
	return nil
}
