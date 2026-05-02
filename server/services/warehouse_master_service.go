package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var (
	ErrMaterialVersionConflict = errors.New("material version conflict")
	ErrMaterialInInventory     = errors.New("material still has inventory quantity")
	ErrMaterialLinkedSales     = errors.New("material linked by sales order line")
	ErrMaterialLinkedBOM       = errors.New("material linked by bom")
	ErrMaterialLinkedPurchase  = errors.New("material linked by purchase order line")

	ErrStocktakeTaskNotFound             = errors.New("stocktake task not found")
	ErrStocktakeTaskStatusUnsupported    = errors.New("stocktake task status is unsupported")
	ErrStocktakeItemNotFound             = errors.New("stocktake item not found")
	ErrStocktakeItemPatchVersionConflict = errors.New("stocktake item patch version conflict")
	ErrPDAScanInvalidPayload             = errors.New("invalid pda scan payload")
	ErrPDAScanTaskStatusConflict         = errors.New("stocktake task status conflict")
	ErrPDAScanUnknownMaterial            = errors.New("unknown material code")

	ErrAdjustmentPendingExists     = errors.New("pending adjustment already exists")
	ErrAdjustmentNotFound          = errors.New("inventory adjustment not found")
	ErrAdjustmentAlreadyExecuted   = errors.New("inventory adjustment already executed")
	ErrAdjustmentTaskInvalidStatus = errors.New("adjustment task status is unsupported")
)

func toMaterialModel(input SaveMaterialAPIRequest) models.Material {
	return models.Material{
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
		Code:               input.Code,
		Name:               input.Name,
		Category:           input.Category,
		Spec:               input.Spec,
		InternalDimensions: append(json.RawMessage(nil), input.InternalDimensions...),
		ExternalDimensions: append(json.RawMessage(nil), input.ExternalDimensions...),
		UOM:                input.UOM,
		MinStock:           input.MinStock,
		CostPrice:          input.CostPrice,
		SupplierID:         input.SupplierID,
		Description:        input.Description,
		Images:             append(json.RawMessage(nil), input.Images...),
		Status:             input.Status,
		Version:            input.Version,
	}
}

func materialAuditSnapshot(material models.Material) map[string]any {
	return map[string]any{
		"id":                 strings.TrimSpace(material.ID),
		"code":               strings.TrimSpace(material.Code),
		"name":               strings.TrimSpace(material.Name),
		"category":           strings.TrimSpace(material.Category),
		"spec":               strings.TrimSpace(material.Spec),
		"internalDimensions": append(json.RawMessage(nil), material.InternalDimensions...),
		"externalDimensions": append(json.RawMessage(nil), material.ExternalDimensions...),
		"uom":                strings.TrimSpace(material.UOM),
		"minStock":           material.MinStock,
		"costPrice":          material.CostPrice,
		"supplierId":         strings.TrimSpace(material.SupplierID),
		"description":        strings.TrimSpace(material.Description),
		"images":             append(json.RawMessage(nil), material.Images...),
		"status":             strings.TrimSpace(material.Status),
		"revisionNo":         strings.TrimSpace(material.RevisionNo),
		"effectiveFrom":      material.EffectiveFrom,
		"effectiveTo":        material.EffectiveTo,
		"changeType":         strings.TrimSpace(material.ChangeType),
		"changeOrderNo":      strings.TrimSpace(material.ChangeOrderNo),
		"siteCode":           strings.TrimSpace(material.SiteCode),
		"isDefaultSite":      material.IsDefaultSite,
		"version":            material.Version,
	}
}

func materialAuditDiff(before map[string]any, payload map[string]any) json.RawMessage {
	diff, _ := json.Marshal(map[string]any{
		"before":  before,
		"payload": payload,
	})
	return diff
}

func writeMaterialAuditEntryWithContext(ctx context.Context, tx *gorm.DB, targetID string, action string, before map[string]any, payload map[string]any) error {
	return recordLegacyAuditEntryWithContext(ctx, tx, "Material", strings.TrimSpace(targetID), strings.TrimSpace(action), materialAuditDiff(before, payload))
}

func materialAuditTargetID(material models.Material, fallbackCode string) string {
	if strings.TrimSpace(material.ID) != "" {
		return strings.TrimSpace(material.ID)
	}
	return strings.TrimSpace(fallbackCode)
}

type CreateStocktakeTaskInput struct {
	Title                 string `json:"title" binding:"required"`
	WarehouseCategoryCode string `json:"warehouseCategoryCode" binding:"required"`
	Remarks               string `json:"remarks"`
}

type PDAScanSubmitRequest struct {
	TaskID       string  `json:"taskId" binding:"required"`
	MaterialCode string  `json:"materialCode" binding:"required"`
	BatchNo      string  `json:"batchNo"`
	ScannedQty   float64 `json:"scannedQty"`
	ScannerID    string  `json:"scannerId"`
}

type PDASyncScanRequest struct {
	TaskID       string    `json:"taskId"`
	MaterialCode string    `json:"materialCode"`
	BatchNo      string    `json:"batchNo"`
	ScannedQty   float64   `json:"scannedQty"`
	ScanTime     time.Time `json:"scanTime"`
}

type PDASyncFailure struct {
	Index        int     `json:"index"`
	TaskID       string  `json:"taskId"`
	MaterialCode string  `json:"materialCode"`
	BatchNo      string  `json:"batchNo"`
	ScannedQty   float64 `json:"scannedQty"`
	Error        string  `json:"error"`
}

type PDASyncResult struct {
	Count        int              `json:"count"`
	SuccessCount int              `json:"successCount"`
	FailedCount  int              `json:"failedCount"`
	Failures     []PDASyncFailure `json:"failures"`
	Message      string           `json:"message"`
}

type PDAScanPayload struct {
	TaskID       string
	MaterialCode string
	BatchNo      string
	ScannedQty   float64
	ScanTime     *time.Time
}

func buildMaterialBaseQuery(category string, search string) *gorm.DB {
	query := db.DB.Model(&models.Material{})
	if category != "" && category != "ALL" {
		query = query.Where("category = ?", category)
	}
	if search != "" {
		searchPattern := "%" + search + "%"
		query = query.Where("name ILIKE ? OR code ILIKE ?", searchPattern, searchPattern)
	}
	return query
}

func ListMaterialOptions(category string, search string) ([]MaterialOptionQueryResult, error) {
	query := buildMaterialBaseQuery(strings.TrimSpace(category), strings.TrimSpace(search))
	var options []MaterialOptionQueryResult
	if err := query.Order("code asc").Select("id, code, name, spec, uom, category, status, cost_price").Find(&options).Error; err != nil {
		return nil, err
	}
	return options, nil
}

func ListMaterials(query MaterialListPageQuery) ([]models.Material, int64, error) {
	page := query.Page
	pageSize := query.PageSize
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 20
	}

	tx := buildMaterialBaseQuery(strings.TrimSpace(query.Category), strings.TrimSpace(query.Search))
	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var materials []models.Material
	if err := tx.Order("code asc").Limit(pageSize).Offset((page - 1) * pageSize).Find(&materials).Error; err != nil {
		return nil, 0, err
	}
	return materials, total, nil
}

func SaveMaterial(ctx context.Context, input SaveMaterialAPIRequest) (models.Material, error) {
	modelInput := toMaterialModel(input)
	var saved models.Material

	err := db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if strings.TrimSpace(modelInput.ID) == "" {
			modelInput.ID = uuid.NewString()
		}
		if modelInput.ID != "" {
			var existing models.Material
			if err := tx.Where("id = ?", modelInput.ID).First(&existing).Error; err == nil {
				before := materialAuditSnapshot(existing)
				modelInput.MasterDataControl.MergeMissingFrom(existing.MasterDataControl, "R1")
				if modelInput.Version != existing.Version {
					return ErrMaterialVersionConflict
				}
				modelInput.Version = existing.Version + 1
				if err := tx.Model(&existing).Updates(modelInput).Error; err != nil {
					return err
				}
				if err := tx.Where("id = ?", existing.ID).First(&saved).Error; err != nil {
					return err
				}
				payload := materialAuditSnapshot(saved)
				payload["operation"] = "update"
				return writeMaterialAuditEntryWithContext(ctx, tx, saved.ID, "SAVE", before, payload)
			} else if !errors.Is(err, gorm.ErrRecordNotFound) {
				return err
			}
		}

		modelInput.MasterDataControl.Normalize("R1")
		modelInput.Version = 1
		if err := tx.Create(&modelInput).Error; err != nil {
			return err
		}
		saved = modelInput
		payload := materialAuditSnapshot(saved)
		payload["operation"] = "create"
		return writeMaterialAuditEntryWithContext(ctx, tx, materialAuditTargetID(saved, modelInput.Code), "SAVE", nil, payload)
	})
	if err != nil {
		return models.Material{}, err
	}
	return saved, nil
}

func BulkSyncMaterials(ctx context.Context, input BulkSyncMaterialsAPIPayload) error {
	return db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, in := range input.Materials {
			material := toMaterialModel(in)
			if strings.TrimSpace(material.ID) == "" {
				material.ID = uuid.NewString()
			}

			var existing models.Material
			before := map[string]any(nil)
			operation := "create"
			err := tx.Where("code = ?", strings.TrimSpace(material.Code)).First(&existing).Error
			if err == nil {
				before = materialAuditSnapshot(existing)
				operation = "update"
				material.ID = existing.ID
			} else if !errors.Is(err, gorm.ErrRecordNotFound) {
				return err
			}

			material.MasterDataControl.Normalize("R1")
			if err := tx.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "code"}},
				UpdateAll: true,
			}).Create(&material).Error; err != nil {
				return err
			}

			var saved models.Material
			if err := tx.Where("code = ?", strings.TrimSpace(material.Code)).First(&saved).Error; err != nil {
				return err
			}
			payload := materialAuditSnapshot(saved)
			payload["operation"] = operation
			payload["batchCount"] = len(input.Materials)
			payload["globalVersion"] = input.GlobalVersion
			if err := writeMaterialAuditEntryWithContext(ctx, tx, materialAuditTargetID(saved, material.Code), "BULK_SYNC", before, payload); err != nil {
				return err
			}
		}
		return nil
	})
}

func DeleteMaterial(ctx context.Context, id string) error {
	return db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var material models.Material
		if err := tx.Where("id = ?", id).First(&material).Error; err != nil {
			return err
		}

		var invCount int64
		if err := tx.Model(&models.Inventory{}).Where("material_id = ? AND quantity > 0", id).Count(&invCount).Error; err != nil {
			return err
		}
		if invCount > 0 {
			return ErrMaterialInInventory
		}

		var salesCount int64
		if err := tx.Model(&models.SalesOrderLine{}).Where("product_id = ?", id).Count(&salesCount).Error; err != nil {
			return err
		}
		if salesCount > 0 {
			return ErrMaterialLinkedSales
		}

		var bomCount int64
		if err := tx.Model(&models.BOMItem{}).Where("material_id = ?", id).Count(&bomCount).Error; err != nil {
			return err
		}
		if bomCount > 0 {
			return ErrMaterialLinkedBOM
		}

		var purchaseCount int64
		if err := tx.Model(&models.PurchaseOrderLine{}).Where("material_id = ?", id).Count(&purchaseCount).Error; err != nil {
			return err
		}
		if purchaseCount > 0 {
			return ErrMaterialLinkedPurchase
		}

		before := materialAuditSnapshot(material)
		if err := tx.Delete(&models.Material{}, "id = ?", id).Error; err != nil {
			return err
		}
		payload := map[string]any{
			"deleted":  true,
			"code":     strings.TrimSpace(material.Code),
			"name":     strings.TrimSpace(material.Name),
			"category": strings.TrimSpace(material.Category),
		}
		return writeMaterialAuditEntryWithContext(ctx, tx, material.ID, "DELETE", before, payload)
	})
}

func ListStocktakeTasks() ([]models.StocktakeTask, error) {
	var tasks []models.StocktakeTask
	if err := db.DB.Order("created_at desc").Find(&tasks).Error; err != nil {
		return nil, err
	}
	return tasks, nil
}

func CreateStocktakeTask(input CreateStocktakeTaskInput, username string) error {
	now := time.Now()
	return db.DB.Transaction(func(tx *gorm.DB) error {
		task := models.StocktakeTask{
			Title:                 input.Title,
			WarehouseCategoryCode: input.WarehouseCategoryCode,
			Status:                "IN_PROGRESS",
			CreatedBy:             username,
			StartTime:             &now,
			Remarks:               input.Remarks,
		}
		if err := tx.Create(&task).Error; err != nil {
			return err
		}

		var inventory []models.Inventory
		if err := tx.Where("category_code = ?", input.WarehouseCategoryCode).Find(&inventory).Error; err != nil {
			return err
		}
		if len(inventory) == 0 {
			return errors.New("no inventory found under selected warehouse category")
		}

		for _, inv := range inventory {
			item := models.StocktakeItem{
				TaskID:       task.ID,
				MaterialID:   inv.MaterialID,
				MaterialCode: inv.MaterialCode,
				MaterialName: inv.MaterialName,
				BatchNo:      inv.BatchNo,
				TheoryQty:    inv.Quantity,
				ActualQty:    0,
				UOM:          inv.UOM,
			}
			if err := tx.Create(&item).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func ListStocktakeItems(taskID string) ([]models.StocktakeItem, error) {
	var items []models.StocktakeItem
	if err := db.DB.Where("task_id = ?", taskID).Find(&items).Error; err != nil {
		return nil, err
	}
	for i := range items {
		items[i].Difference = items[i].ActualQty - items[i].TheoryQty
	}
	return items, nil
}

func PatchStocktakeItem(id string, patch PatchStocktakeItemRequest, deltaKeys []string, operator string, ip string) (models.StocktakeItem, error) {
	var updated models.StocktakeItem

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var item models.StocktakeItem
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&item, "id = ?", id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrStocktakeItemNotFound
			}
			return err
		}

		if patch.Version != optimisticVersionFromTimestamps(item.UpdatedAt, item.CreatedAt) {
			return ErrStocktakeItemPatchVersionConflict
		}

		var task models.StocktakeTask
		if err := tx.Select("id", "status").Where("id = ?", item.TaskID).First(&task).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrStocktakeTaskNotFound
			}
			return err
		}
		if task.Status != "IN_PROGRESS" && task.Status != "COMPLETED" {
			return ErrStocktakeTaskStatusUnsupported
		}

		updates := make(map[string]any)
		if patch.ActualQty != nil {
			if *patch.ActualQty < 0 {
				return errors.New("[CRITICAL_LOGIC_ERROR] stocktake actual quantity cannot be negative")
			}
			updates["actual_qty"] = *patch.ActualQty
		}

		effectiveScannerID := patch.ScannerID
		if patch.ActualQty != nil && effectiveScannerID == nil {
			trimmedOperator := strings.TrimSpace(operator)
			if trimmedOperator != "" {
				effectiveScannerID = &trimmedOperator
			}
		}
		if effectiveScannerID != nil {
			updates["scanner_id"] = strings.TrimSpace(*effectiveScannerID)
		}

		effectiveScanTime := patch.ScanTime
		if patch.ActualQty != nil && effectiveScanTime == nil {
			now := time.Now().UTC()
			effectiveScanTime = &now
		}
		if patch.ScanTime != nil || patch.ActualQty != nil {
			updates["scan_time"] = effectiveScanTime
		}

		if len(updates) == 0 {
			return errors.New("[VALIDATION] no stocktake fields to update")
		}

		if err := tx.Model(&item).Updates(updates).Error; err != nil {
			return err
		}
		if err := tx.First(&item, "id = ?", id).Error; err != nil {
			return err
		}

		if err := defaultServiceRuntime().auditLogger.Write(tx, AuditEntry{
			Module:   "Stocktake",
			TargetID: item.ID,
			Action:   "STOCKTAKE_ITEM_PATCH",
			Diff:     auditDeltaKeys(deltaKeys),
			Operator: strings.TrimSpace(operator),
			IP:       strings.TrimSpace(ip),
		}); err != nil {
			return err
		}

		updated = item
		return nil
	})
	if err != nil {
		return models.StocktakeItem{}, err
	}

	updated.Difference = updated.ActualQty - updated.TheoryQty
	return updated, nil
}

func SubmitPDAScan(scan PDAScanPayload, scannerID string) error {
	taskID := strings.TrimSpace(scan.TaskID)
	materialCode := strings.ToUpper(strings.TrimSpace(scan.MaterialCode))
	batchNo := strings.TrimSpace(scan.BatchNo)

	if taskID == "" || materialCode == "" {
		return fmt.Errorf("%w: taskId/materialCode is required", ErrPDAScanInvalidPayload)
	}
	if scan.ScannedQty <= 0 {
		return fmt.Errorf("%w: scannedQty must be greater than 0", ErrPDAScanInvalidPayload)
	}

	scanTime := time.Now()
	if scan.ScanTime != nil && !scan.ScanTime.IsZero() {
		scanTime = scan.ScanTime.UTC()
	}

	return db.DB.Transaction(func(tx *gorm.DB) error {
		var task models.StocktakeTask
		if err := tx.Select("id", "status").Where("id = ?", taskID).First(&task).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("%w: %s", ErrStocktakeTaskNotFound, taskID)
			}
			return err
		}
		if task.Status != "IN_PROGRESS" {
			return fmt.Errorf("%w: %s", ErrPDAScanTaskStatusConflict, task.Status)
		}

		var item models.StocktakeItem
		err := tx.Where("task_id = ? AND material_code = ? AND batch_no = ?", taskID, materialCode, batchNo).First(&item).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			var material models.Material
			if err := tx.Where("code = ?", materialCode).First(&material).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return fmt.Errorf("%w: %s", ErrPDAScanUnknownMaterial, materialCode)
				}
				return err
			}

			newItem := models.StocktakeItem{
				TaskID:       taskID,
				MaterialID:   material.ID,
				MaterialCode: material.Code,
				MaterialName: material.Name,
				BatchNo:      batchNo,
				TheoryQty:    0,
				ActualQty:    scan.ScannedQty,
				UOM:          material.UOM,
				ScannerID:    scannerID,
				ScanTime:     &scanTime,
			}
			return tx.Create(&newItem).Error
		}
		if err != nil {
			return err
		}

		updates := map[string]interface{}{
			"actual_qty": gorm.Expr("actual_qty + ?", scan.ScannedQty),
			"scan_time":  scanTime,
		}
		if scannerID != "" {
			updates["scanner_id"] = scannerID
		}
		return tx.Model(&models.StocktakeItem{}).Where("id = ?", item.ID).Updates(updates).Error
	})
}

func SyncPDAScans(scans []PDASyncScanRequest, scannerID string) (PDASyncResult, error) {
	if len(scans) == 0 {
		return PDASyncResult{}, fmt.Errorf("%w: sync list is empty", ErrPDAScanInvalidPayload)
	}

	result := PDASyncResult{
		Count:    len(scans),
		Failures: make([]PDASyncFailure, 0),
	}

	for idx, scan := range scans {
		currentScanTime := scan.ScanTime
		err := SubmitPDAScan(PDAScanPayload{
			TaskID:       scan.TaskID,
			MaterialCode: scan.MaterialCode,
			BatchNo:      scan.BatchNo,
			ScannedQty:   scan.ScannedQty,
			ScanTime:     &currentScanTime,
		}, scannerID)

		if err != nil {
			result.Failures = append(result.Failures, PDASyncFailure{
				Index:        idx,
				TaskID:       scan.TaskID,
				MaterialCode: scan.MaterialCode,
				BatchNo:      scan.BatchNo,
				ScannedQty:   scan.ScannedQty,
				Error:        err.Error(),
			})
			continue
		}
		result.SuccessCount++
	}

	result.FailedCount = len(result.Failures)
	result.Message = "offline scan sync completed"
	if result.FailedCount > 0 {
		result.Message = "offline scan sync partially failed, please fix and retry"
	}
	return result, nil
}

func SubmitPDAScanRequest(input PDAScanSubmitRequest, scannerID string) error {
	return SubmitPDAScan(PDAScanPayload{
		TaskID:       input.TaskID,
		MaterialCode: input.MaterialCode,
		BatchNo:      input.BatchNo,
		ScannedQty:   input.ScannedQty,
	}, scannerID)
}

func SubmitAdjustmentApproval(taskID string, username string) error {
	var task models.StocktakeTask
	if err := db.DB.First(&task, "id = ?", taskID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrStocktakeTaskNotFound
		}
		return err
	}

	if task.Status != "IN_PROGRESS" && task.Status != "COMPLETED" {
		return ErrAdjustmentTaskInvalidStatus
	}

	var existCount int64
	if err := db.DB.Model(&models.InventoryAdjustment{}).Where("task_id = ? AND status = ?", taskID, "PENDING").Count(&existCount).Error; err != nil {
		return err
	}
	if existCount > 0 {
		return ErrAdjustmentPendingExists
	}

	var items []models.StocktakeItem
	if err := db.DB.Where("task_id = ?", taskID).Find(&items).Error; err != nil {
		return err
	}

	return db.DB.Transaction(func(tx *gorm.DB) error {
		adjustment := models.InventoryAdjustment{
			TaskID:       taskID,
			AdjustmentNo: GenerateAdjustmentNo(tx),
			Type:         "STOCKTAKE",
			Status:       "PENDING",
			CreatedBy:    username,
			TotalItems:   len(items),
			Reason:       fmt.Sprintf("stocktake task [%s] auto adjustment request", task.Title),
		}
		if err := tx.Create(&adjustment).Error; err != nil {
			return err
		}

		for _, item := range items {
			diff := item.ActualQty - item.TheoryQty
			if diff == 0 {
				continue
			}

			adjItem := models.InventoryAdjustmentItem{
				AdjustmentID: adjustment.ID,
				MaterialID:   item.MaterialID,
				MaterialCode: item.MaterialCode,
				MaterialName: item.MaterialName,
				CategoryCode: task.WarehouseCategoryCode,
				BatchNo:      item.BatchNo,
				TheoryQty:    item.TheoryQty,
				ActualQty:    item.ActualQty,
				DiffQty:      diff,
				UOM:          item.UOM,
			}
			if err := tx.Create(&adjItem).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

func GenerateAdjustmentNo(tx *gorm.DB) string {
	dateStr := time.Now().Format("20060102")
	var count int64
	tx.Model(&models.InventoryAdjustment{}).Where("adjustment_no LIKE ?", "ADJUST-"+dateStr+"-%").Count(&count)
	return fmt.Sprintf("ADJUST-%s-%03d", dateStr, count+1)
}

func ExecuteAdjustment(id string, username string) error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		now := time.Now()
		var adj models.InventoryAdjustment
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Preload("Items").First(&adj, "id = ?", id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrAdjustmentNotFound
			}
			return err
		}
		if adj.Status == "EXECUTED" {
			return ErrAdjustmentAlreadyExecuted
		}

		for _, item := range adj.Items {
			var inv models.Inventory
			err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
				Where("material_id = ? AND category_code = ? AND batch_no = ?", item.MaterialID, item.CategoryCode, item.BatchNo).
				First(&inv).Error

			if errors.Is(err, gorm.ErrRecordNotFound) {
				inv = models.Inventory{
					MaterialID:   item.MaterialID,
					MaterialCode: item.MaterialCode,
					MaterialName: item.MaterialName,
					CategoryCode: item.CategoryCode,
					BatchNo:      item.BatchNo,
					Quantity:     item.ActualQty,
				}
				if err := tx.Create(&inv).Error; err != nil {
					return err
				}
				continue
			}
			if err != nil {
				return err
			}

			if err := tx.Model(&inv).Update("quantity", item.ActualQty).Error; err != nil {
				return err
			}
		}

		if err := tx.Model(&adj).Updates(map[string]interface{}{
			"status":      "EXECUTED",
			"executed_by": username,
			"executed_at": now,
		}).Error; err != nil {
			return err
		}
		if adj.TaskID != "" {
			if err := tx.Model(&models.StocktakeTask{}).Where("id = ?", adj.TaskID).Update("status", "ADJUSTED").Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func ListAdjustmentHistory() ([]models.InventoryAdjustment, error) {
	var adjustments []models.InventoryAdjustment
	if err := db.DB.Preload("Items").Order("created_at desc").Find(&adjustments).Error; err != nil {
		return nil, err
	}
	return adjustments, nil
}
