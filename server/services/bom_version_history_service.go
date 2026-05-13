package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
	"xdfc-server/audit"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type BOMVersionHistoryQuery struct {
	BOMID     string
	ProductID string
}

type BOMVersionRecordSummary struct {
	ID                  string     `json:"id"`
	BOMID               string     `json:"bomId"`
	ProductID           string     `json:"productId"`
	BOMNo               string     `json:"bomNo"`
	VersionSequence     int        `json:"versionSequence"`
	DisplayVersionLabel string     `json:"displayVersionLabel"`
	Operation           string     `json:"operation"`
	Status              string     `json:"status"`
	Description         string     `json:"description"`
	RevisionNo          string     `json:"revisionNo"`
	EffectiveFrom       *time.Time `json:"effectiveFrom"`
	EffectiveTo         *time.Time `json:"effectiveTo"`
	ChangeType          string     `json:"changeType"`
	ChangeOrderNo       string     `json:"changeOrderNo"`
	SiteCode            string     `json:"siteCode"`
	IsDefaultSite       bool       `json:"isDefaultSite"`
	CreatedAt           time.Time  `json:"createdAt"`
	CreatedBy           string     `json:"createdBy"`
}

type BOMVersionRecordDetail struct {
	BOMVersionRecordSummary
	Snapshot        map[string]any      `json:"snapshot"`
	RelationSidecar *BOMRelationSidecar `json:"relationSidecar,omitempty"`
}

func ListBOMVersionHistory(query BOMVersionHistoryQuery) ([]BOMVersionRecordSummary, error) {
	tx := db.DB.Model(&models.BOMVersionSnapshot{})
	if trimmed := strings.TrimSpace(query.BOMID); trimmed != "" {
		tx = tx.Where("bom_id = ?", trimmed)
	}
	if trimmed := strings.TrimSpace(query.ProductID); trimmed != "" {
		tx = tx.Where("product_id = ?", trimmed)
	}

	var records []models.BOMVersionSnapshot
	if err := tx.Order("created_at desc").Order("version_sequence desc").Find(&records).Error; err != nil {
		return nil, err
	}

	result := make([]BOMVersionRecordSummary, 0, len(records))
	for _, record := range records {
		result = append(result, mapBOMVersionRecordSummary(record))
	}
	return result, nil
}

func GetBOMVersionRecordByID(id string) (BOMVersionRecordDetail, error) {
	var record models.BOMVersionSnapshot
	if err := db.DB.First(&record, "id = ?", strings.TrimSpace(id)).Error; err != nil {
		return BOMVersionRecordDetail{}, err
	}
	return mapBOMVersionRecordDetail(record)
}

func writeBOMVersionSnapshotTx(ctx context.Context, tx *gorm.DB, bom models.BOM, operation string) error {
	bomID := strings.TrimSpace(bom.ID)
	if bomID == "" {
		return nil
	}

	sequence, err := nextBOMVersionSequence(tx, bomID)
	if err != nil {
		return err
	}

	snapshotPayload, err := json.Marshal(bomAuditSnapshot(bom))
	if err != nil {
		return fmt.Errorf("encode bom version snapshot: %w", err)
	}

	relationSidecar := json.RawMessage(nil)
	if len(bom.RelationSidecar) > 0 {
		relationSidecar = append(json.RawMessage(nil), bom.RelationSidecar...)
	}

	record := models.BOMVersionSnapshot{
		BaseModel:       models.BaseModel{ID: uuid.NewString()},
		BOMID:           bomID,
		BOMType:         strings.TrimSpace(bom.BOMType),
		ProductID:       strings.TrimSpace(bom.ProductID),
		BOMNo:           strings.TrimSpace(bom.BOMNo),
		SourceEBOMID:    bom.SourceEBOMID,
		VersionSequence: sequence,
		VersionText:     resolveBOMDisplayVersion(bom),
		Status:          strings.TrimSpace(bom.Status),
		IsLocked:        bom.IsLocked,
		Description:     strings.TrimSpace(bom.Description),
		RevisionNo:      strings.TrimSpace(bom.RevisionNo),
		EffectiveFrom:   cloneTime(bom.EffectiveFrom),
		EffectiveTo:     cloneTime(bom.EffectiveTo),
		ChangeType:      strings.TrimSpace(bom.ChangeType),
		ChangeOrderNo:   strings.TrimSpace(bom.ChangeOrderNo),
		SiteCode:        strings.TrimSpace(bom.SiteCode),
		IsDefaultSite:   bom.IsDefaultSite,
		Operation:       normalizeBOMVersionOperation(operation),
		CreatedBy:       resolveBOMVersionCreatedBy(ctx),
		Snapshot:        snapshotPayload,
		RelationSidecar: relationSidecar,
	}
	return tx.Create(&record).Error
}

func nextBOMVersionSequence(tx *gorm.DB, bomID string) (int, error) {
	var currentMax int
	
	// ✅ 使用 FOR UPDATE 锁定相关行，防止并发竞态
	if err := tx.Model(&models.BOMVersionSnapshot{}).
		Where("bom_id = ?", strings.TrimSpace(bomID)).
		Select("COALESCE(MAX(version_sequence), 0)").
		Clauses(clause.Locking{Strength: "UPDATE"}).
		Scan(&currentMax).Error; err != nil {
		return 0, err
	}
	
	return currentMax + 1, nil
}

func resolveBOMVersionCreatedBy(ctx context.Context) string {
	actor, ok := audit.ActorFromContext(ctx)
	if !ok {
		return "system"
	}
	if trimmed := strings.TrimSpace(actor.Username); trimmed != "" {
		return trimmed
	}
	if trimmed := strings.TrimSpace(actor.UserID); trimmed != "" {
		return trimmed
	}
	return "system"
}

func normalizeBOMVersionOperation(value string) string {
	trimmed := strings.ToUpper(strings.TrimSpace(value))
	
	// ✅ 定义允许的操作类型（保留业务语义）
	validOperations := map[string]bool{
		"SAVE":    true,
		"CREATE":  true,
		"UPDATE":  true,
		"DELETE":  true,
		"PROMOTE": true, // 状态流转
		"DERIVE":  true, // MBOM 派生
	}
	
	if validOperations[trimmed] {
		return trimmed
	}
	
	// 未知操作类型，默认为 SAVE
	return "SAVE"
}

func mapBOMVersionRecordSummary(record models.BOMVersionSnapshot) BOMVersionRecordSummary {
	return BOMVersionRecordSummary{
		ID:                  strings.TrimSpace(record.ID),
		BOMID:               strings.TrimSpace(record.BOMID),
		ProductID:           strings.TrimSpace(record.ProductID),
		BOMNo:               strings.TrimSpace(record.BOMNo),
		VersionSequence:     record.VersionSequence,
		DisplayVersionLabel: resolveBOMVersionRecordDisplayVersion(record),
		Operation:           normalizeBOMVersionOperation(record.Operation),
		Status:              strings.TrimSpace(record.Status),
		Description:         strings.TrimSpace(record.Description),
		RevisionNo:          strings.TrimSpace(record.RevisionNo),
		EffectiveFrom:       cloneTime(record.EffectiveFrom),
		EffectiveTo:         cloneTime(record.EffectiveTo),
		ChangeType:          strings.TrimSpace(record.ChangeType),
		ChangeOrderNo:       strings.TrimSpace(record.ChangeOrderNo),
		SiteCode:            strings.TrimSpace(record.SiteCode),
		IsDefaultSite:       record.IsDefaultSite,
		CreatedAt:           record.CreatedAt,
		CreatedBy:           strings.TrimSpace(record.CreatedBy),
	}
}

func mapBOMVersionRecordDetail(record models.BOMVersionSnapshot) (BOMVersionRecordDetail, error) {
	snapshot, err := parseBOMVersionSnapshotPayload(record.Snapshot)
	if err != nil {
		return BOMVersionRecordDetail{}, err
	}
	
	// ✅ 添加主数据状态警告（防止使用已禁用的物料）
	enrichedSnapshot, err := enrichBOMSnapshotWithMaterialStatus(db.DB, snapshot)
	if err != nil {
		return BOMVersionRecordDetail{}, err
	}
	
	relationSidecar, err := parseBOMRelationSidecar(record.RelationSidecar)
	if err != nil {
		return BOMVersionRecordDetail{}, err
	}
	return BOMVersionRecordDetail{
		BOMVersionRecordSummary: mapBOMVersionRecordSummary(record),
		Snapshot:                enrichedSnapshot,
		RelationSidecar:         relationSidecar,
	}, nil
}

// enrichBOMSnapshotWithMaterialStatus 为快照添加主数据状态标记
func enrichBOMSnapshotWithMaterialStatus(tx *gorm.DB, snapshot map[string]any) (map[string]any, error) {
	itemsRaw, ok := snapshot["items"]
	if !ok {
		return snapshot, nil
	}
	
	// 处理 []any 类型
	itemsSlice, ok := itemsRaw.([]any)
	if !ok {
		return snapshot, nil
	}
	
	for idx := range itemsSlice {
		itemMap, ok := itemsSlice[idx].(map[string]any)
		if !ok {
			continue
		}
		
		materialID, ok := itemMap["materialId"].(string)
		if !ok || strings.TrimSpace(materialID) == "" {
			continue
		}
		
		var material models.Material
		if err := tx.Where("id = ?", materialID).First(&material).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				itemMap["_materialStatusWarning"] = "DELETED"
				itemMap["_materialStatusMessage"] = "物料已被删除"
			}
			continue
		}
		
		if material.Status != "Active" {
			itemMap["_materialStatusWarning"] = material.Status
			itemMap["_materialStatusMessage"] = fmt.Sprintf("物料当前状态: %s", material.Status)
		}
	}
	
	snapshot["items"] = itemsSlice
	return snapshot, nil
}

func parseBOMVersionSnapshotPayload(raw json.RawMessage) (map[string]any, error) {
	trimmed := strings.TrimSpace(string(raw))
	if trimmed == "" || trimmed == "null" {
		return map[string]any{}, nil
	}
	var snapshot map[string]any
	if err := json.Unmarshal(raw, &snapshot); err != nil {
		return nil, fmt.Errorf("decode bom version snapshot: %w", err)
	}
	return snapshot, nil
}

func resolveBOMVersionRecordDisplayVersion(record models.BOMVersionSnapshot) string {
	if strings.TrimSpace(record.VersionText) != "" {
		return strings.TrimSpace(record.VersionText)
	}
	return "V1.0"
}
