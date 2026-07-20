package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
	"xdfc-server/audit"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// EquipmentAssetService owns mutations for the equipment domain. Keeping the
// database write and its audit event in one transaction prevents the audit
// engine from reporting a mutation that was only partially persisted.
type EquipmentAssetService struct {
	db *gorm.DB
}

func NewEquipmentAssetService(db *gorm.DB) *EquipmentAssetService {
	return &EquipmentAssetService{db: db}
}

func (s *EquipmentAssetService) transaction(ctx context.Context, fn func(*gorm.DB) error) error {
	if s == nil || s.db == nil {
		return gorm.ErrInvalidDB
	}
	if ctx == nil {
		ctx = context.Background()
	}
	return s.db.WithContext(ctx).Transaction(fn)
}

func equipmentActor(ctx context.Context) audit.AuditActor {
	if actor, ok := audit.ActorFromContext(ctx); ok {
		return actor.Normalize()
	}
	return audit.AuditActor{Source: "system"}.Normalize()
}

func equipmentOperator(ctx context.Context) string {
	actor := equipmentActor(ctx)
	if value := strings.TrimSpace(actor.Username); value != "" {
		return value
	}
	if value := strings.TrimSpace(actor.UserID); value != "" {
		return value
	}
	return "system"
}

func equipmentAuditDiff(before, payload map[string]any, operation string) json.RawMessage {
	if payload == nil {
		payload = map[string]any{}
	}
	payload["operation"] = operation
	diff, _ := json.Marshal(map[string]any{
		"before":  before,
		"payload": payload,
	})
	return diff
}

func writeEquipmentAudit(ctx context.Context, tx *gorm.DB, module, targetID, action string, before, payload map[string]any) error {
	return recordLegacyAuditEntryWithContext(
		ctx,
		tx,
		module,
		strings.TrimSpace(targetID),
		strings.TrimSpace(action),
		equipmentAuditDiff(before, payload, strings.ToLower(strings.TrimSpace(action))),
	)
}

func parseEquipmentTime(raw json.RawMessage) (*time.Time, error) {
	if string(raw) == "null" {
		return nil, nil
	}
	var value string
	if err := json.Unmarshal(raw, &value); err != nil {
		return nil, err
	}
	if strings.TrimSpace(value) == "" {
		return nil, nil
	}
	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		return nil, err
	}
	return &parsed, nil
}

func moldAuditSnapshot(mold models.Mold) map[string]any {
	return map[string]any{
		"id":                   mold.ID,
		"sn":                   mold.SN,
		"name":                 mold.Name,
		"maxCycles":            mold.MaxCycles,
		"currentCycles":        mold.CurrentCycles,
		"maintenanceThreshold": mold.MaintenanceThreshold,
		"totalLifeCycles":      mold.TotalLifeCycles,
		"groupName":            mold.GroupName,
		"status":               mold.Status,
		"location":             mold.Location,
		"description":          mold.Description,
		"isAlerted":            mold.IsAlerted,
		"lastCheckedAt":        mold.LastCheckedAt,
		"imageUrl":             mold.ImageURL,
		"createdBy":            mold.CreatedBy,
		"updatedBy":            mold.UpdatedBy,
	}
}

func furnaceAuditSnapshot(furnace models.Furnace) map[string]any {
	return map[string]any{
		"id":          furnace.ID,
		"sn":          furnace.SN,
		"name":        furnace.Name,
		"type":        furnace.Type,
		"maxTemp":     furnace.MaxTemp,
		"currentTemp": furnace.CurrentTemp,
		"status":      furnace.Status,
		"location":    furnace.Location,
		"description": furnace.Description,
		"createdBy":   furnace.CreatedBy,
		"updatedBy":   furnace.UpdatedBy,
	}
}

func partnerAuditSnapshot(partner models.EquipmentPartner) map[string]any {
	return map[string]any{
		"id":            partner.ID,
		"name":          partner.Name,
		"type":          partner.Type,
		"contactPerson": partner.ContactPerson,
		"phone":         partner.Phone,
		"address":       partner.Address,
	}
}

func drawingAuditSnapshot(drawing models.MoldDrawing) map[string]any {
	return map[string]any{
		"id":         drawing.ID,
		"moldId":     drawing.MoldID,
		"moldSn":     drawing.MoldSN,
		"name":       drawing.Name,
		"type":       drawing.Type,
		"fileUrl":    drawing.FileURL,
		"version":    drawing.Version,
		"status":     drawing.Status,
		"uploadedAt": drawing.UploadedAt,
		"remarks":    drawing.Remarks,
	}
}

func loanAuditSnapshot(loan models.MoldLoan) map[string]any {
	return map[string]any{
		"id":                 loan.ID,
		"moldId":             loan.MoldID,
		"moldSn":             loan.MoldSN,
		"moldName":           loan.MoldName,
		"fromFactory":        loan.FromFactory,
		"toFactory":          loan.ToFactory,
		"contactPerson":      loan.ContactPerson,
		"loanDate":           loan.LoanDate,
		"expectedReturnDate": loan.ExpectedReturnDate,
		"actualReturnDate":   loan.ActualReturnDate,
		"status":             loan.Status,
		"remarks":            loan.Remarks,
		"photoUrl":           loan.PhotoURL,
		"createdBy":          loan.CreatedBy,
	}
}

func moldSaveUpdates(input SaveMoldRequest, operator string, lastCheckedAt *time.Time) map[string]any {
	return map[string]any{
		"sn":                    input.SN,
		"name":                  input.Name,
		"max_cycles":            input.MaxCycles,
		"current_cycles":        input.CurrentCycles,
		"maintenance_threshold": input.MaintenanceThreshold,
		"total_life_cycles":     input.TotalLifeCycles,
		"group_name":            input.GroupName,
		"status":                input.Status,
		"location":              input.Location,
		"description":           input.Description,
		"is_alerted":            input.IsAlerted,
		"last_checked_at":       lastCheckedAt,
		"image_url":             input.ImageURL,
		"updated_by":            operator,
	}
}

func (s *EquipmentAssetService) SaveMold(ctx context.Context, input SaveMoldRequest) (models.Mold, error) {
	operator := equipmentOperator(ctx)
	lastCheckedAt := (*time.Time)(nil)
	if input.LastCheckedAt != nil && strings.TrimSpace(*input.LastCheckedAt) != "" {
		parsed, err := time.Parse(time.RFC3339, strings.TrimSpace(*input.LastCheckedAt))
		if err != nil {
			return models.Mold{}, fmt.Errorf("[VALIDATION] lastCheckedAt format is invalid: %w", err)
		}
		lastCheckedAt = &parsed
	}

	var saved models.Mold
	err := s.transaction(ctx, func(tx *gorm.DB) error {
		id := strings.TrimSpace(input.ID)
		isCreate := id == ""
		if isCreate {
			id = uuid.NewString()
		}
		var existing models.Mold
		err := tx.Where("id = ?", id).First(&existing).Error
		if err == nil {
			before := moldAuditSnapshot(existing)
			if err := tx.Model(&existing).Updates(moldSaveUpdates(input, operator, lastCheckedAt)).Error; err != nil {
				return err
			}
			if err := tx.First(&saved, "id = ?", id).Error; err != nil {
				return err
			}
			return writeEquipmentAudit(ctx, tx, AuditModuleMold, saved.ID, "UPDATE", before, moldAuditSnapshot(saved))
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		if !isCreate {
			return err
		}

		created := models.Mold{
			ID:                   id,
			SN:                   input.SN,
			Name:                 input.Name,
			MaxCycles:            input.MaxCycles,
			CurrentCycles:        input.CurrentCycles,
			MaintenanceThreshold: input.MaintenanceThreshold,
			TotalLifeCycles:      input.TotalLifeCycles,
			GroupName:            input.GroupName,
			Status:               input.Status,
			Location:             input.Location,
			Description:          input.Description,
			IsAlerted:            input.IsAlerted,
			LastCheckedAt:        lastCheckedAt,
			ImageURL:             input.ImageURL,
			CreatedBy:            operator,
			UpdatedBy:            operator,
		}
		if err := tx.Create(&created).Error; err != nil {
			return err
		}
		if err := tx.First(&saved, "id = ?", created.ID).Error; err != nil {
			return err
		}
		return writeEquipmentAudit(ctx, tx, AuditModuleMold, saved.ID, "CREATE", nil, moldAuditSnapshot(saved))
	})
	return saved, err
}

func parseMoldPatch(delta map[string]json.RawMessage) (map[string]any, error) {
	if err := validateSupportedTopLevelDeltaKeys(delta, "sn", "name", "groupName", "status", "location", "description", "imageUrl", "maxCycles", "currentCycles", "maintenanceThreshold", "totalLifeCycles", "isAlerted", "lastCheckedAt"); err != nil {
		return nil, err
	}
	updates := make(map[string]any, len(delta))
	for key, raw := range delta {
		valueRaw, err := extractDeltaNewValue(raw)
		if err != nil {
			return nil, err
		}
		switch key {
		case "sn", "name", "groupName", "status", "location", "description", "imageUrl":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				return nil, err
			}
			if key == "groupName" {
				updates["group_name"] = value
			} else if key == "imageUrl" {
				updates["image_url"] = value
			} else {
				updates[key] = value
			}
		case "maxCycles", "currentCycles", "maintenanceThreshold", "totalLifeCycles":
			var value int
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				return nil, err
			}
			updates[map[string]string{"maxCycles": "max_cycles", "currentCycles": "current_cycles", "maintenanceThreshold": "maintenance_threshold", "totalLifeCycles": "total_life_cycles"}[key]] = value
		case "isAlerted":
			var value bool
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				return nil, err
			}
			updates["is_alerted"] = value
		case "lastCheckedAt":
			value, err := parseEquipmentTime(valueRaw)
			if err != nil {
				return nil, err
			}
			updates["last_checked_at"] = value
		}
	}
	return updates, nil
}

func (s *EquipmentAssetService) PatchMold(ctx context.Context, id string, delta map[string]json.RawMessage) (models.Mold, error) {
	updates, err := parseMoldPatch(delta)
	if err != nil {
		return models.Mold{}, fmt.Errorf("[VALIDATION] invalid mold delta: %w", err)
	}
	operator := equipmentOperator(ctx)
	var saved models.Mold
	err = s.transaction(ctx, func(tx *gorm.DB) error {
		var existing models.Mold
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ?", strings.TrimSpace(id)).First(&existing).Error; err != nil {
			return err
		}
		before := moldAuditSnapshot(existing)
		updates["updated_by"] = operator
		updates["updated_at"] = time.Now()
		if err := tx.Model(&existing).Updates(updates).Error; err != nil {
			return err
		}
		if err := tx.First(&saved, "id = ?", id).Error; err != nil {
			return err
		}
		return writeEquipmentAudit(ctx, tx, AuditModuleMold, saved.ID, "PATCH", before, moldAuditSnapshot(saved))
	})
	return saved, err
}

func (s *EquipmentAssetService) UpdateMoldTelemetry(ctx context.Context, id string, cycles int) error {
	operator := equipmentOperator(ctx)
	return s.transaction(ctx, func(tx *gorm.DB) error {
		var existing models.Mold
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ?", strings.TrimSpace(id)).First(&existing).Error; err != nil {
			return err
		}
		before := moldAuditSnapshot(existing)
		if err := tx.Model(&existing).Updates(map[string]any{
			"current_cycles":    existing.CurrentCycles + cycles,
			"total_life_cycles": existing.TotalLifeCycles + cycles,
			"updated_at":        time.Now(),
			"updated_by":        operator,
		}).Error; err != nil {
			return err
		}
		existing.CurrentCycles += cycles
		existing.TotalLifeCycles += cycles
		existing.UpdatedBy = operator
		return writeEquipmentAudit(ctx, tx, AuditModuleMold, existing.ID, "TELEMETRY", before, moldAuditSnapshot(existing))
	})
}

func (s *EquipmentAssetService) BulkSyncMolds(ctx context.Context, molds []models.Mold) error {
	operator := equipmentOperator(ctx)
	return s.transaction(ctx, func(tx *gorm.DB) error {
		for index := range molds {
			item := molds[index]
			if strings.TrimSpace(item.ID) == "" {
				item.ID = uuid.NewString()
			}
			var existing models.Mold
			err := tx.Where("id = ?", item.ID).First(&existing).Error
			operation := "CREATE"
			var before map[string]any
			if err == nil {
				operation = "BULK_SYNC"
				before = moldAuditSnapshot(existing)
				// Keep the legacy bulk-sync contract: GORM struct Updates skips
				// omitted zero values instead of clearing stored fields.
				item.UpdatedBy = operator
				if err := tx.Model(&models.Mold{}).
					Where("id = ?", item.ID).
					Omit("CreatedAt", "CreatedBy").
					Updates(&item).Error; err != nil {
					return err
				}
			} else if errors.Is(err, gorm.ErrRecordNotFound) {
				item.CreatedBy = operator
				item.UpdatedBy = operator
				if err := tx.Create(&item).Error; err != nil {
					return err
				}
			} else {
				return err
			}
			var saved models.Mold
			if err := tx.First(&saved, "id = ?", item.ID).Error; err != nil {
				return err
			}
			if err := writeEquipmentAudit(ctx, tx, AuditModuleMold, saved.ID, operation, before, moldAuditSnapshot(saved)); err != nil {
				return err
			}
		}
		return nil
	})
}

func furnaceSaveUpdates(input SaveFurnaceRequest, operator string) map[string]any {
	return map[string]any{
		"sn":           input.SN,
		"name":         input.Name,
		"type":         input.Type,
		"max_temp":     input.MaxTemp,
		"current_temp": input.CurrentTemp,
		"status":       input.Status,
		"location":     input.Location,
		"description":  input.Description,
		"updated_by":   operator,
	}
}

func (s *EquipmentAssetService) SaveFurnace(ctx context.Context, input SaveFurnaceRequest) (models.Furnace, error) {
	operator := equipmentOperator(ctx)
	var saved models.Furnace
	err := s.transaction(ctx, func(tx *gorm.DB) error {
		id := strings.TrimSpace(input.ID)
		isCreate := id == ""
		if isCreate {
			id = uuid.NewString()
		}
		var existing models.Furnace
		err := tx.Where("id = ?", id).First(&existing).Error
		if err == nil {
			before := furnaceAuditSnapshot(existing)
			if err := tx.Model(&existing).Updates(furnaceSaveUpdates(input, operator)).Error; err != nil {
				return err
			}
			if err := tx.First(&saved, "id = ?", id).Error; err != nil {
				return err
			}
			return writeEquipmentAudit(ctx, tx, AuditModuleFurnace, saved.ID, "UPDATE", before, furnaceAuditSnapshot(saved))
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		if !isCreate {
			return err
		}
		created := models.Furnace{ID: id, SN: input.SN, Name: input.Name, Type: input.Type, MaxTemp: input.MaxTemp, CurrentTemp: input.CurrentTemp, Status: input.Status, Location: input.Location, Description: input.Description, CreatedBy: operator, UpdatedBy: operator}
		if err := tx.Create(&created).Error; err != nil {
			return err
		}
		if err := tx.First(&saved, "id = ?", created.ID).Error; err != nil {
			return err
		}
		return writeEquipmentAudit(ctx, tx, AuditModuleFurnace, saved.ID, "CREATE", nil, furnaceAuditSnapshot(saved))
	})
	return saved, err
}

func parseFurnacePatch(delta map[string]json.RawMessage) (map[string]any, error) {
	if err := validateSupportedTopLevelDeltaKeys(delta, "sn", "name", "type", "status", "location", "description", "maxTemp", "currentTemp"); err != nil {
		return nil, err
	}
	updates := make(map[string]any, len(delta))
	for key, raw := range delta {
		valueRaw, err := extractDeltaNewValue(raw)
		if err != nil {
			return nil, err
		}
		switch key {
		case "sn", "name", "type", "status", "location", "description":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		case "maxTemp", "currentTemp":
			var value float64
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				return nil, err
			}
			updates[map[string]string{"maxTemp": "max_temp", "currentTemp": "current_temp"}[key]] = value
		}
	}
	return updates, nil
}

func (s *EquipmentAssetService) PatchFurnace(ctx context.Context, id string, delta map[string]json.RawMessage) (models.Furnace, error) {
	updates, err := parseFurnacePatch(delta)
	if err != nil {
		return models.Furnace{}, fmt.Errorf("[VALIDATION] invalid furnace delta: %w", err)
	}
	operator := equipmentOperator(ctx)
	var saved models.Furnace
	err = s.transaction(ctx, func(tx *gorm.DB) error {
		var existing models.Furnace
		if err := tx.Where("id = ?", strings.TrimSpace(id)).First(&existing).Error; err != nil {
			return err
		}
		before := furnaceAuditSnapshot(existing)
		updates["updated_by"] = operator
		updates["updated_at"] = time.Now()
		if err := tx.Model(&existing).Updates(updates).Error; err != nil {
			return err
		}
		if err := tx.First(&saved, "id = ?", id).Error; err != nil {
			return err
		}
		return writeEquipmentAudit(ctx, tx, AuditModuleFurnace, saved.ID, "PATCH", before, furnaceAuditSnapshot(saved))
	})
	return saved, err
}

func (s *EquipmentAssetService) UpdateFurnaceTelemetry(ctx context.Context, id string, temp float64) error {
	operator := equipmentOperator(ctx)
	return s.transaction(ctx, func(tx *gorm.DB) error {
		var existing models.Furnace
		if err := tx.Where("id = ?", strings.TrimSpace(id)).First(&existing).Error; err != nil {
			return err
		}
		before := furnaceAuditSnapshot(existing)
		if err := tx.Model(&existing).Updates(map[string]any{"current_temp": temp, "updated_at": time.Now(), "updated_by": operator}).Error; err != nil {
			return err
		}
		existing.CurrentTemp = temp
		existing.UpdatedBy = operator
		return writeEquipmentAudit(ctx, tx, AuditModuleFurnace, existing.ID, "TELEMETRY", before, furnaceAuditSnapshot(existing))
	})
}

func (s *EquipmentAssetService) BulkSyncFurnaces(ctx context.Context, furnaces []models.Furnace) error {
	operator := equipmentOperator(ctx)
	return s.transaction(ctx, func(tx *gorm.DB) error {
		for index := range furnaces {
			item := furnaces[index]
			if strings.TrimSpace(item.ID) == "" {
				item.ID = uuid.NewString()
			}
			var existing models.Furnace
			err := tx.Where("id = ?", item.ID).First(&existing).Error
			operation := "CREATE"
			var before map[string]any
			if err == nil {
				operation = "BULK_SYNC"
				before = furnaceAuditSnapshot(existing)
				// Match the old handler's struct Updates behavior so partial
				// recovery payloads do not overwrite fields with zero values.
				item.UpdatedBy = operator
				if err := tx.Model(&models.Furnace{}).
					Where("id = ?", item.ID).
					Omit("CreatedAt", "CreatedBy").
					Updates(&item).Error; err != nil {
					return err
				}
			} else if errors.Is(err, gorm.ErrRecordNotFound) {
				item.CreatedBy = operator
				item.UpdatedBy = operator
				if err := tx.Create(&item).Error; err != nil {
					return err
				}
			} else {
				return err
			}
			var saved models.Furnace
			if err := tx.First(&saved, "id = ?", item.ID).Error; err != nil {
				return err
			}
			if err := writeEquipmentAudit(ctx, tx, AuditModuleFurnace, saved.ID, operation, before, furnaceAuditSnapshot(saved)); err != nil {
				return err
			}
		}
		return nil
	})
}

func (s *EquipmentAssetService) SaveEquipmentPartner(ctx context.Context, input SaveEquipmentPartnerRequest) (models.EquipmentPartner, error) {
	var saved models.EquipmentPartner
	err := s.transaction(ctx, func(tx *gorm.DB) error {
		id := strings.TrimSpace(input.ID)
		isCreate := id == ""
		if isCreate {
			id = uuid.NewString()
		}
		var existing models.EquipmentPartner
		err := tx.Where("id = ?", id).First(&existing).Error
		if err == nil {
			before := partnerAuditSnapshot(existing)
			if err := tx.Model(&existing).Updates(map[string]any{"name": input.Name, "type": input.Type, "contact_person": input.ContactPerson, "phone": input.Phone, "address": input.Address, "updated_at": time.Now()}).Error; err != nil {
				return err
			}
			if err := tx.First(&saved, "id = ?", id).Error; err != nil {
				return err
			}
			return writeEquipmentAudit(ctx, tx, AuditModuleEquipmentPartner, saved.ID, "UPDATE", before, partnerAuditSnapshot(saved))
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		if !isCreate {
			return err
		}
		created := models.EquipmentPartner{ID: id, Name: input.Name, Type: input.Type, ContactPerson: input.ContactPerson, Phone: input.Phone, Address: input.Address}
		if err := tx.Create(&created).Error; err != nil {
			return err
		}
		if err := tx.First(&saved, "id = ?", created.ID).Error; err != nil {
			return err
		}
		return writeEquipmentAudit(ctx, tx, AuditModuleEquipmentPartner, saved.ID, "CREATE", nil, partnerAuditSnapshot(saved))
	})
	return saved, err
}

func parsePartnerPatch(delta map[string]json.RawMessage) (map[string]any, error) {
	if err := validateSupportedTopLevelDeltaKeys(delta, "name", "type", "contactPerson", "phone", "address"); err != nil {
		return nil, err
	}
	updates := make(map[string]any, len(delta))
	for key, raw := range delta {
		valueRaw, err := extractDeltaNewValue(raw)
		if err != nil {
			return nil, err
		}
		var value string
		if err := json.Unmarshal(valueRaw, &value); err != nil {
			return nil, err
		}
		updates[map[string]string{"name": "name", "type": "type", "contactPerson": "contact_person", "phone": "phone", "address": "address"}[key]] = value
	}
	return updates, nil
}

func (s *EquipmentAssetService) PatchEquipmentPartner(ctx context.Context, id string, delta map[string]json.RawMessage) (models.EquipmentPartner, error) {
	updates, err := parsePartnerPatch(delta)
	if err != nil {
		return models.EquipmentPartner{}, fmt.Errorf("[VALIDATION] invalid equipment partner delta: %w", err)
	}
	var saved models.EquipmentPartner
	err = s.transaction(ctx, func(tx *gorm.DB) error {
		var existing models.EquipmentPartner
		if err := tx.Where("id = ?", strings.TrimSpace(id)).First(&existing).Error; err != nil {
			return err
		}
		before := partnerAuditSnapshot(existing)
		updates["updated_at"] = time.Now()
		if err := tx.Model(&existing).Updates(updates).Error; err != nil {
			return err
		}
		if err := tx.First(&saved, "id = ?", id).Error; err != nil {
			return err
		}
		return writeEquipmentAudit(ctx, tx, AuditModuleEquipmentPartner, saved.ID, "PATCH", before, partnerAuditSnapshot(saved))
	})
	return saved, err
}

func (s *EquipmentAssetService) DeleteEquipmentPartner(ctx context.Context, id string) error {
	return s.transaction(ctx, func(tx *gorm.DB) error {
		var existing models.EquipmentPartner
		if err := tx.Where("id = ?", strings.TrimSpace(id)).First(&existing).Error; err != nil {
			return err
		}
		if err := tx.Delete(&existing).Error; err != nil {
			return err
		}
		return writeEquipmentAudit(ctx, tx, AuditModuleEquipmentPartner, existing.ID, "DELETE", partnerAuditSnapshot(existing), map[string]any{"deleted": true})
	})
}

func (s *EquipmentAssetService) SaveMoldDrawing(ctx context.Context, input SaveMoldDrawingRequest) (models.MoldDrawing, error) {
	operator := equipmentOperator(ctx)
	uploadedAt := time.Now()
	if strings.TrimSpace(input.UploadedAt) != "" {
		parsed, err := time.Parse(time.RFC3339, strings.TrimSpace(input.UploadedAt))
		if err != nil {
			return models.MoldDrawing{}, fmt.Errorf("[VALIDATION] uploadedAt format is invalid: %w", err)
		}
		uploadedAt = parsed
	}
	var saved models.MoldDrawing
	err := s.transaction(ctx, func(tx *gorm.DB) error {
		id := strings.TrimSpace(input.ID)
		isCreate := id == ""
		if isCreate {
			id = uuid.NewString()
		}
		var existing models.MoldDrawing
		err := tx.Where("id = ?", id).First(&existing).Error
		if err == nil {
			before := drawingAuditSnapshot(existing)
			if err := tx.Model(&existing).Updates(map[string]any{"mold_id": input.MoldID, "mold_sn": input.MoldSN, "name": input.Name, "type": input.Type, "file_url": input.FileURL, "version": input.Version, "status": input.Status, "uploaded_at": uploadedAt, "remarks": input.Remarks, "updated_at": time.Now()}).Error; err != nil {
				return err
			}
			if err := tx.First(&saved, "id = ?", id).Error; err != nil {
				return err
			}
			if err := tx.Create(&models.MoldDrawingLog{ID: uuid.NewString(), DrawingID: saved.ID, Action: "VERSION_UPDATE", Details: "drawing updated", Operator: operator, Timestamp: time.Now()}).Error; err != nil {
				return err
			}
			return writeEquipmentAudit(ctx, tx, AuditModuleMoldDrawing, saved.ID, "UPDATE", before, drawingAuditSnapshot(saved))
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		if !isCreate {
			return err
		}
		created := models.MoldDrawing{ID: id, MoldID: input.MoldID, MoldSN: input.MoldSN, Name: input.Name, Type: input.Type, FileURL: input.FileURL, Version: input.Version, Status: input.Status, UploadedAt: uploadedAt, Remarks: input.Remarks, CreatedAt: time.Now()}
		if err := tx.Create(&created).Error; err != nil {
			return err
		}
		if err := tx.First(&saved, "id = ?", created.ID).Error; err != nil {
			return err
		}
		if err := tx.Create(&models.MoldDrawingLog{ID: uuid.NewString(), DrawingID: saved.ID, Action: "CREATED", Details: "drawing created", Operator: operator, Timestamp: time.Now()}).Error; err != nil {
			return err
		}
		return writeEquipmentAudit(ctx, tx, AuditModuleMoldDrawing, saved.ID, "CREATE", nil, drawingAuditSnapshot(saved))
	})
	return saved, err
}

func parseDrawingPatch(delta map[string]json.RawMessage) (map[string]any, error) {
	if err := validateSupportedTopLevelDeltaKeys(delta, "moldId", "moldSn", "name", "type", "fileUrl", "version", "status", "remarks", "uploadedAt"); err != nil {
		return nil, err
	}
	updates := make(map[string]any, len(delta))
	for key, raw := range delta {
		valueRaw, err := extractDeltaNewValue(raw)
		if err != nil {
			return nil, err
		}
		if key == "uploadedAt" {
			value, err := parseEquipmentTime(valueRaw)
			if err != nil {
				return nil, err
			}
			updates["uploaded_at"] = value
			continue
		}
		var value string
		if err := json.Unmarshal(valueRaw, &value); err != nil {
			return nil, err
		}
		updates[map[string]string{"moldId": "mold_id", "moldSn": "mold_sn", "name": "name", "type": "type", "fileUrl": "file_url", "version": "version", "status": "status", "remarks": "remarks"}[key]] = value
	}
	return updates, nil
}

func (s *EquipmentAssetService) PatchMoldDrawing(ctx context.Context, id string, delta map[string]json.RawMessage) (models.MoldDrawing, error) {
	updates, err := parseDrawingPatch(delta)
	if err != nil {
		return models.MoldDrawing{}, fmt.Errorf("[VALIDATION] invalid mold drawing delta: %w", err)
	}
	operator := equipmentOperator(ctx)
	var saved models.MoldDrawing
	err = s.transaction(ctx, func(tx *gorm.DB) error {
		var existing models.MoldDrawing
		if err := tx.Where("id = ?", strings.TrimSpace(id)).First(&existing).Error; err != nil {
			return err
		}
		before := drawingAuditSnapshot(existing)
		updates["updated_at"] = time.Now()
		if err := tx.Model(&existing).Updates(updates).Error; err != nil {
			return err
		}
		if err := tx.First(&saved, "id = ?", id).Error; err != nil {
			return err
		}
		if err := tx.Create(&models.MoldDrawingLog{ID: uuid.NewString(), DrawingID: saved.ID, Action: "VERSION_UPDATE", Details: "drawing patched", Operator: operator, Timestamp: time.Now()}).Error; err != nil {
			return err
		}
		return writeEquipmentAudit(ctx, tx, AuditModuleMoldDrawing, saved.ID, "PATCH", before, drawingAuditSnapshot(saved))
	})
	return saved, err
}

func (s *EquipmentAssetService) DeleteMoldDrawing(ctx context.Context, id string) error {
	return s.transaction(ctx, func(tx *gorm.DB) error {
		var existing models.MoldDrawing
		if err := tx.Where("id = ?", strings.TrimSpace(id)).First(&existing).Error; err != nil {
			return err
		}
		if err := tx.Delete(&existing).Error; err != nil {
			return err
		}
		return writeEquipmentAudit(ctx, tx, AuditModuleMoldDrawing, existing.ID, "DELETE", drawingAuditSnapshot(existing), map[string]any{"deleted": true})
	})
}

func (s *EquipmentAssetService) CreateMoldLoan(ctx context.Context, loan models.MoldLoan, moldStatus string) (models.MoldLoan, error) {
	operator := equipmentOperator(ctx)
	moldStatus = strings.ToUpper(strings.TrimSpace(moldStatus))
	if moldStatus != "LENT_OUT" && moldStatus != "BORROWED" {
		return models.MoldLoan{}, fmt.Errorf("[VALIDATION] moldStatus must be LENT_OUT or BORROWED")
	}
	var saved models.MoldLoan
	err := s.transaction(ctx, func(tx *gorm.DB) error {
		var mold models.Mold
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ?", strings.TrimSpace(loan.MoldID)).First(&mold).Error; err != nil {
			return err
		}
		loan.ID = strings.TrimSpace(loan.ID)
		if loan.ID == "" {
			loan.ID = uuid.NewString()
		}
		if loan.LoanDate.IsZero() {
			loan.LoanDate = time.Now()
		}
		if strings.TrimSpace(loan.Status) == "" {
			loan.Status = "ACTIVE"
		}
		loan.CreatedAt = time.Now()
		loan.CreatedBy = operator
		if strings.TrimSpace(loan.MoldSN) == "" {
			loan.MoldSN = mold.SN
		}
		if strings.TrimSpace(loan.MoldName) == "" {
			loan.MoldName = mold.Name
		}
		if err := tx.Create(&loan).Error; err != nil {
			return err
		}
		if err := tx.First(&loan, "id = ?", loan.ID).Error; err != nil {
			return err
		}
		beforeMold := moldAuditSnapshot(mold)
		if err := tx.Model(&mold).Updates(map[string]any{"status": moldStatus, "updated_at": time.Now(), "updated_by": operator}).Error; err != nil {
			return err
		}
		mold.Status = moldStatus
		mold.UpdatedBy = operator
		saved = loan
		if err := writeEquipmentAudit(ctx, tx, AuditModuleMoldLoan, loan.ID, "CREATE", nil, loanAuditSnapshot(loan)); err != nil {
			return err
		}
		return writeEquipmentAudit(ctx, tx, AuditModuleMold, mold.ID, "STATUS", beforeMold, moldAuditSnapshot(mold))
	})
	return saved, err
}

func (s *EquipmentAssetService) ReturnMoldLoan(ctx context.Context, id string) (models.MoldLoan, error) {
	operator := equipmentOperator(ctx)
	var saved models.MoldLoan
	err := s.transaction(ctx, func(tx *gorm.DB) error {
		var loan models.MoldLoan
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ?", strings.TrimSpace(id)).First(&loan).Error; err != nil {
			return err
		}
		var mold models.Mold
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ?", loan.MoldID).First(&mold).Error; err != nil {
			return err
		}
		beforeLoan := loanAuditSnapshot(loan)
		beforeMold := moldAuditSnapshot(mold)
		now := time.Now()
		if err := tx.Model(&loan).Updates(map[string]any{"status": "RETURNED", "actual_return_date": now}).Error; err != nil {
			return err
		}
		if err := tx.Model(&mold).Updates(map[string]any{"status": "IDLE", "updated_at": now, "updated_by": operator}).Error; err != nil {
			return err
		}
		loan.Status = "RETURNED"
		loan.ActualReturnDate = &now
		mold.Status = "IDLE"
		mold.UpdatedBy = operator
		saved = loan
		if err := writeEquipmentAudit(ctx, tx, AuditModuleMoldLoan, loan.ID, "RETURN", beforeLoan, loanAuditSnapshot(loan)); err != nil {
			return err
		}
		return writeEquipmentAudit(ctx, tx, AuditModuleMold, mold.ID, "STATUS", beforeMold, moldAuditSnapshot(mold))
	})
	return saved, err
}
