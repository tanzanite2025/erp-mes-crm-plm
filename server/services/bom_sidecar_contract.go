package services

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"
	"xdfc-server/dto"
	"xdfc-server/models"
)

type BOMParentChildrenProtocolBranchDraft struct {
	ID          string   `json:"id"`
	ParentID    *string  `json:"parentId"`
	Children    []string `json:"children"`
	NodeKind    string   `json:"nodeKind"`
	BranchRole  string   `json:"branchRole,omitempty"`
	Label       string   `json:"label"`
	SectionCode string   `json:"sectionCode"`
	SectionName string   `json:"sectionName,omitempty"`
}

type BOMParentChildrenProtocolItemDraft struct {
	ID          string   `json:"id"`
	ParentID    *string  `json:"parentId"`
	Children    []string `json:"children"`
	NodeKind    string   `json:"nodeKind"`
	SectionCode string   `json:"sectionCode"`
	SectionName string   `json:"sectionName,omitempty"`
	ItemID      string   `json:"itemId,omitempty"`
}

type BOMParentChildrenProtocolDraft struct {
	RootChildren []string                               `json:"rootChildren"`
	BranchNodes  []BOMParentChildrenProtocolBranchDraft `json:"branchNodes"`
	ItemNodes    []BOMParentChildrenProtocolItemDraft   `json:"itemNodes"`
}

type BOMRelationSidecar struct {
	Kind          string                         `json:"kind"`
	Version       string                         `json:"version"`
	ProtocolDraft BOMParentChildrenProtocolDraft `json:"protocolDraft"`
}

type BOMDetailResponse struct {
	ID                string                    `json:"id"`
	CreatedAt         time.Time                 `json:"createdAt"`
	UpdatedAt         time.Time                 `json:"updatedAt"`
	BOMType           string                    `json:"bomType"`
	BOMNo             string                    `json:"bomNo"`
	ProductID         string                    `json:"productId"`
	SourceEBOMID      *string                   `json:"sourceEbomId,omitempty"`
	BOMVersion        string                    `json:"bomVersion"`
	Status            string                    `json:"status"`
	IsLocked          bool                      `json:"isLocked"`
	Version           int                       `json:"version"`
	// 归属语义在 BOM 维度（方案 B + 1:1）：服务于内部 / 某客户。
	OwnerType         string                    `json:"ownerType"`
	OwnerCustomerID   string                    `json:"ownerCustomerId,omitempty"`
	// VersionLevel 是 BOM 档次标签（思路 3 重构，来源产品属性主数据 versionLevel category）。
	VersionLevel      string                    `json:"versionLevel,omitempty"`
	// MeasuredWeight 是该 BOM 对应最终产品的实测/目标重量(方案 B 端到端权威源)。
	MeasuredWeight     float64                   `json:"measuredWeight"`
	// MeasuredWeightUnit 引用 basic_settings 单位主数据(WEIGHT 类目)的 code。
	MeasuredWeightUnit string                    `json:"measuredWeightUnit"`
	Items             []models.BOMItem          `json:"items"`
	Description       string                    `json:"description"`
	RelationSidecar   *BOMRelationSidecar       `json:"relationSidecar,omitempty"`
	// --- MasterDataControl 嵌套命名空间（唯一输出格式） ---
	MasterDataControl *dto.MasterDataControlDTO `json:"masterDataControl,omitempty"`
}

func MapBOMToDetailResponse(bom models.BOM) (BOMDetailResponse, error) {
	sidecar, err := parseBOMRelationSidecar(bom.RelationSidecar)
	if err != nil {
		return BOMDetailResponse{}, err
	}

	return BOMDetailResponse{
		ID:                bom.ID,
		CreatedAt:         bom.CreatedAt,
		UpdatedAt:         bom.UpdatedAt,
		BOMType:           bom.BOMType,
		BOMNo:             bom.BOMNo,
		ProductID:         bom.ProductID,
		SourceEBOMID:      bom.SourceEBOMID,
		BOMVersion:        bom.VersionText,
		Status:            bom.Status,
		IsLocked:          bom.IsLocked,
		Version:           bom.Version,
		OwnerType:         bom.OwnerType,
		OwnerCustomerID:   bom.OwnerCustomerID,
		VersionLevel:      bom.VersionLevel,
		MeasuredWeight:     bom.MeasuredWeight,
		MeasuredWeightUnit: bom.MeasuredWeightUnit,
		Items:             bom.Items,
		Description:       bom.Description,
		RelationSidecar:   sidecar,
		MasterDataControl: dto.MapMasterDataControl(bom.MasterDataControl),
	}, nil
}

func normalizeBOMRelationSidecar(raw json.RawMessage) (json.RawMessage, error) {
	sidecar, err := parseBOMRelationSidecar(raw)
	if err != nil {
		return nil, err
	}
	if sidecar == nil {
		return nil, nil
	}

	encoded, err := json.Marshal(sidecar)
	if err != nil {
		return nil, fmt.Errorf("%w: encode canonical relation sidecar: %v", ErrBOMRelationSidecarInvalid, err)
	}
	return encoded, nil
}

func normalizeRequiredBOMRelationSidecar(raw json.RawMessage) (json.RawMessage, error) {
	trimmed := strings.TrimSpace(string(raw))
	if trimmed == "" || trimmed == "null" {
		return nil, fmt.Errorf("%w: relationSidecar is required", ErrBOMRelationSidecarInvalid)
	}

	return normalizeBOMRelationSidecar(raw)
}

func parseBOMRelationSidecar(raw json.RawMessage) (*BOMRelationSidecar, error) {
	trimmed := strings.TrimSpace(string(raw))
	if trimmed == "" || trimmed == "null" {
		return nil, nil
	}

	var sidecar BOMRelationSidecar
	if err := json.Unmarshal([]byte(trimmed), &sidecar); err != nil {
		return nil, fmt.Errorf("%w: invalid relation sidecar json: %v", ErrBOMRelationSidecarInvalid, err)
	}

	normalized, err := normalizeBOMRelationSidecarValue(sidecar)
	if err != nil {
		return nil, err
	}
	return &normalized, nil
}

func normalizeBOMRelationSidecarValue(sidecar BOMRelationSidecar) (BOMRelationSidecar, error) {
	sidecar.Kind = strings.TrimSpace(sidecar.Kind)
	if sidecar.Kind != "parent_children_protocol" {
		return BOMRelationSidecar{}, fmt.Errorf("%w: relationSidecar.kind must be parent_children_protocol", ErrBOMRelationSidecarInvalid)
	}

	sidecar.Version = strings.TrimSpace(sidecar.Version)
	if sidecar.Version != "v1" {
		return BOMRelationSidecar{}, fmt.Errorf("%w: relationSidecar.version must be v1", ErrBOMRelationSidecarInvalid)
	}

	draft, err := normalizeBOMParentChildrenProtocolDraft(sidecar.ProtocolDraft)
	if err != nil {
		return BOMRelationSidecar{}, err
	}
	sidecar.ProtocolDraft = draft

	return sidecar, nil
}

func normalizeBOMParentChildrenProtocolDraft(draft BOMParentChildrenProtocolDraft) (BOMParentChildrenProtocolDraft, error) {
	rootChildren, err := normalizeBOMRequiredStringSlice(draft.RootChildren, "relationSidecar.protocolDraft.rootChildren")
	if err != nil {
		return BOMParentChildrenProtocolDraft{}, err
	}

	branchNodes := make([]BOMParentChildrenProtocolBranchDraft, 0, len(draft.BranchNodes))
	itemNodes := make([]BOMParentChildrenProtocolItemDraft, 0, len(draft.ItemNodes))
	seenNodeIDs := make(map[string]struct{}, len(draft.BranchNodes)+len(draft.ItemNodes))

	for _, branch := range draft.BranchNodes {
		normalized, err := normalizeBOMParentChildrenProtocolBranchDraft(branch)
		if err != nil {
			return BOMParentChildrenProtocolDraft{}, err
		}
		if _, exists := seenNodeIDs[normalized.ID]; exists {
			return BOMParentChildrenProtocolDraft{}, fmt.Errorf("%w: duplicate protocol node id %s", ErrBOMRelationSidecarInvalid, normalized.ID)
		}
		seenNodeIDs[normalized.ID] = struct{}{}
		branchNodes = append(branchNodes, normalized)
	}

	for _, item := range draft.ItemNodes {
		normalized, err := normalizeBOMParentChildrenProtocolItemDraft(item)
		if err != nil {
			return BOMParentChildrenProtocolDraft{}, err
		}
		if _, exists := seenNodeIDs[normalized.ID]; exists {
			return BOMParentChildrenProtocolDraft{}, fmt.Errorf("%w: duplicate protocol node id %s", ErrBOMRelationSidecarInvalid, normalized.ID)
		}
		seenNodeIDs[normalized.ID] = struct{}{}
		itemNodes = append(itemNodes, normalized)
	}

	return BOMParentChildrenProtocolDraft{
		RootChildren: rootChildren,
		BranchNodes:  branchNodes,
		ItemNodes:    itemNodes,
	}, nil
}

func normalizeBOMParentChildrenProtocolBranchDraft(branch BOMParentChildrenProtocolBranchDraft) (BOMParentChildrenProtocolBranchDraft, error) {
	id, err := normalizeBOMRequiredString(branch.ID, "relationSidecar.protocolDraft.branchNodes.id")
	if err != nil {
		return BOMParentChildrenProtocolBranchDraft{}, err
	}

	children, err := normalizeBOMRequiredStringSlice(branch.Children, fmt.Sprintf("relationSidecar.protocolDraft.branchNodes[%s].children", id))
	if err != nil {
		return BOMParentChildrenProtocolBranchDraft{}, err
	}

	nodeKind := strings.TrimSpace(branch.NodeKind)
	if nodeKind != "branch" {
		return BOMParentChildrenProtocolBranchDraft{}, fmt.Errorf("%w: relationSidecar branch %s must have nodeKind=branch", ErrBOMRelationSidecarInvalid, id)
	}

	branchRole := strings.TrimSpace(branch.BranchRole)
	if branchRole != "" && branchRole != "section" && branchRole != "collection" {
		return BOMParentChildrenProtocolBranchDraft{}, fmt.Errorf("%w: relationSidecar branch %s has invalid branchRole", ErrBOMRelationSidecarInvalid, id)
	}

	label, err := normalizeBOMRequiredString(branch.Label, fmt.Sprintf("relationSidecar.protocolDraft.branchNodes[%s].label", id))
	if err != nil {
		return BOMParentChildrenProtocolBranchDraft{}, err
	}

	sectionCode, err := normalizeBOMRequiredString(branch.SectionCode, fmt.Sprintf("relationSidecar.protocolDraft.branchNodes[%s].sectionCode", id))
	if err != nil {
		return BOMParentChildrenProtocolBranchDraft{}, err
	}

	return BOMParentChildrenProtocolBranchDraft{
		ID:          id,
		ParentID:    normalizeBOMOptionalStringPointer(branch.ParentID),
		Children:    children,
		NodeKind:    nodeKind,
		BranchRole:  branchRole,
		Label:       label,
		SectionCode: sectionCode,
		SectionName: strings.TrimSpace(branch.SectionName),
	}, nil
}

func normalizeBOMParentChildrenProtocolItemDraft(item BOMParentChildrenProtocolItemDraft) (BOMParentChildrenProtocolItemDraft, error) {
	id, err := normalizeBOMRequiredString(item.ID, "relationSidecar.protocolDraft.itemNodes.id")
	if err != nil {
		return BOMParentChildrenProtocolItemDraft{}, err
	}

	children, err := normalizeBOMRequiredStringSlice(item.Children, fmt.Sprintf("relationSidecar.protocolDraft.itemNodes[%s].children", id))
	if err != nil {
		return BOMParentChildrenProtocolItemDraft{}, err
	}

	nodeKind := strings.TrimSpace(item.NodeKind)
	if nodeKind != "item" {
		return BOMParentChildrenProtocolItemDraft{}, fmt.Errorf("%w: relationSidecar item %s must have nodeKind=item", ErrBOMRelationSidecarInvalid, id)
	}

	sectionCode, err := normalizeBOMRequiredString(item.SectionCode, fmt.Sprintf("relationSidecar.protocolDraft.itemNodes[%s].sectionCode", id))
	if err != nil {
		return BOMParentChildrenProtocolItemDraft{}, err
	}

	return BOMParentChildrenProtocolItemDraft{
		ID:          id,
		ParentID:    normalizeBOMOptionalStringPointer(item.ParentID),
		Children:    children,
		NodeKind:    nodeKind,
		SectionCode: sectionCode,
		SectionName: strings.TrimSpace(item.SectionName),
		ItemID:      strings.TrimSpace(item.ItemID),
	}, nil
}

func normalizeBOMRequiredString(value string, field string) (string, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return "", fmt.Errorf("%w: %s is required", ErrBOMRelationSidecarInvalid, field)
	}
	return trimmed, nil
}

func normalizeBOMRequiredStringSlice(values []string, field string) ([]string, error) {
	if len(values) == 0 {
		return []string{}, nil
	}

	normalized := make([]string, 0, len(values))
	for _, value := range values {
		trimmed, err := normalizeBOMRequiredString(value, field)
		if err != nil {
			return nil, err
		}
		normalized = append(normalized, trimmed)
	}
	return normalized, nil
}

func normalizeBOMOptionalStringPointer(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}
