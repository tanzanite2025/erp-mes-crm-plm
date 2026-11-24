package services

import (
	"encoding/json"
	"fmt"
	"strings"
	"unicode"

	"xdfc-server/audit"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const productionTopologyTemplateAuditEntity audit.AuditEntityKey = "production-topology-template"

func DefaultProductionTopologyTemplateSnapshotService() *ProductionService {
	return defaultProductionService
}

func (service *ProductionService) ListProductionTopologyTemplateSnapshots() ([]ProductionTopologyTemplateDTO, error) {
	var templates []models.ProductionTopologyTemplate
	if err := service.txManager.DB().Order("updated_at desc, id asc").Find(&templates).Error; err != nil {
		return nil, err
	}
	items := make([]ProductionTopologyTemplateDTO, 0, len(templates))
	for _, template := range templates {
		item, err := mapProductionTopologyTemplateSnapshotToDTO(template)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}

func (service *ProductionService) CaptureProductionTopologyTemplateFromLine(request CaptureProductionTopologyTemplateFromLineRequest, operator, ip string) (ProductionTopologyTemplateDTO, error) {
	var result ProductionTopologyTemplateDTO
	err := service.txManager.WithinTransaction(func(transaction *gorm.DB) error {
		line, err := service.repository.GetProductionLineByID(transaction.Clauses(clause.Locking{Strength: "UPDATE"}), request.SourceLineID)
		if err != nil {
			return err
		}
		if line.Version != request.SourceLineVersion {
			return ErrProductionLineVersionConflict
		}
		lines := []models.ProductionLine{line}
		if err := attachProductionBOMBranchOperations(transaction, lines); err != nil {
			return err
		}
		lineDTO := mapProductionLineToDTO(lines[0])
		snapshot := ProductionTopologyTemplateSnapshot{ProductTemplateID: lineDTO.ProductTemplateID, ProductTemplateName: lineDTO.Name,
			SourceLineCode: line.Code, LineDescription: line.Description, Branches: make([]ProductionTopologyTemplateBranchSnapshot, 0, len(line.Segments))}
		for _, segment := range lines[0].Segments {
			snapshot.Branches = append(snapshot.Branches, captureProductionTopologyTemplateBranchReferenceSnapshot(segment))
		}
		if err := validateProductionTopologyTemplateSnapshot(request.Name, &snapshot); err != nil {
			return err
		}
		content, err := json.Marshal(snapshot)
		if err != nil {
			return err
		}
		template := models.ProductionTopologyTemplate{BaseModel: models.BaseModel{ID: uuid.NewString()}, Name: strings.TrimSpace(request.Name),
			Description: strings.TrimSpace(request.Description), Version: 1, Snapshot: content}
		if err := transaction.Create(&template).Error; err != nil {
			return err
		}
		if err := transaction.First(&template, "id = ?", template.ID).Error; err != nil {
			return err
		}
		result, err = mapProductionTopologyTemplateSnapshotToDTO(template)
		if err != nil {
			return err
		}
		return recordAuditEventTx(transaction, audit.NewAuditEvent(productionTopologyTemplateAuditEntity, template.ID, audit.AuditActionCreate,
			audit.AuditActor{Username: operator, IP: ip, Source: "http"}).Normalize())
	})
	return result, err
}

func (service *ProductionService) SaveProductionTopologyTemplateSnapshot(id string, request SaveProductionTopologyTemplateSnapshotRequest, operator, ip string) (ProductionTopologyTemplateDTO, error) {
	var result ProductionTopologyTemplateDTO
	if err := validateProductionTopologyTemplateSnapshot(request.Name, &request.Snapshot); err != nil {
		return result, err
	}
	err := service.txManager.WithinTransaction(func(transaction *gorm.DB) error {
		var template models.ProductionTopologyTemplate
		if err := transaction.Clauses(clause.Locking{Strength: "UPDATE"}).First(&template, "id = ?", id).Error; err != nil {
			return err
		}
		if template.Version != request.Version {
			return ErrProductionTopologyTemplateVersionConflict
		}
		before, err := mapProductionTopologyTemplateSnapshotToDTO(template)
		if err != nil {
			return err
		}
		template.Name, template.Description = strings.TrimSpace(request.Name), strings.TrimSpace(request.Description)
		// Source and product-template metadata are capture-time values, not an editable live association.
		request.Snapshot.SourceLineCode = before.Snapshot.SourceLineCode
		request.Snapshot.ProductTemplateID = before.Snapshot.ProductTemplateID
		request.Snapshot.ProductTemplateName = before.Snapshot.ProductTemplateName
		if err := preserveExistingAndCaptureNewProductionTopologyTemplateBranchReferencesTx(transaction, before.Snapshot, &request.Snapshot); err != nil {
			return err
		}
		template.Snapshot, err = json.Marshal(request.Snapshot)
		if err != nil {
			return err
		}
		template.Version++
		if err := transaction.Model(&template).Select("Name", "Description", "Version", "Snapshot", "UpdatedAt").Updates(&template).Error; err != nil {
			return err
		}
		if err := transaction.First(&template, "id = ?", id).Error; err != nil {
			return err
		}
		result, err = mapProductionTopologyTemplateSnapshotToDTO(template)
		if err != nil {
			return err
		}
		return recordAuditEventTx(transaction, audit.NewAuditEvent(productionTopologyTemplateAuditEntity, id, audit.AuditActionUpdate,
			audit.AuditActor{Username: operator, IP: ip, Source: "http"}).WithChanges(audit.DiffModelValues(before, result)...).Normalize())
	})
	return result, err
}

func (service *ProductionService) ApplyProductionTopologyTemplateToNewLine(id string, request ApplyProductionTopologyTemplateToNewLineRequest, operator, ip string) (ProductionLineDTO, error) {
	var result ProductionLineDTO
	code := strings.ToUpper(strings.Map(func(character rune) rune {
		if unicode.IsSpace(character) || character == '\uFEFF' {
			return -1
		}
		return character
	}, request.Code))
	if code == "" || len([]rune(code)) > 50 {
		return result, fmt.Errorf("%w: 新 L1 编码不能为空且不能超过 50 个字符", ErrInvalidProductionTopologyTemplate)
	}
	err := service.txManager.WithinTransaction(func(transaction *gorm.DB) error {
		var template models.ProductionTopologyTemplate
		if err := transaction.Clauses(clause.Locking{Strength: "UPDATE"}).First(&template, "id = ?", id).Error; err != nil {
			return err
		}
		if template.Version != request.Version {
			return ErrProductionTopologyTemplateVersionConflict
		}
		item, err := mapProductionTopologyTemplateSnapshotToDTO(template)
		if err != nil {
			return err
		}
		var codeCount int64
		if err := transaction.Unscoped().Model(&models.ProductionLine{}).Where("code = ?", code).Count(&codeCount).Error; err != nil {
			return err
		}
		if codeCount != 0 {
			return ErrProductionTopologyTemplateLineCodeConflict
		}
		line := ProductionLineDTO{Code: code, ProductTemplateID: item.Snapshot.ProductTemplateID, Description: item.Snapshot.LineDescription,
			IsActive: true, Segments: make([]LineSegmentDTO, 0, len(item.Snapshot.Branches))}
		if request.Description != nil {
			line.Description = *request.Description
		}
		for index, branch := range item.Snapshot.Branches {
			line.Segments = append(line.Segments, LineSegmentDTO{ProductID: branch.ProductID, BOMOwnerType: branch.BOMOwnerType,
				BOMOwnerCustomerID: branch.BOMOwnerCustomerID, BOMVersionLevel: branch.BOMVersionLevel,
				Description: branch.Description, Attributes: cloneRawMessage(branch.Attributes), SortOrder: index})
		}
		result, err = service.saveProductionLineWithBOMBranchAssociationsTx(transaction, SaveProductionLineRequest{Line: line, Operator: operator, IP: ip})
		if err != nil {
			if isDatabaseUniqueViolation(err) {
				return ErrProductionTopologyTemplateLineCodeConflict
			}
			return err
		}
		if err := recordAuditEventTx(transaction, audit.NewAuditEvent(productionTopologyTemplateAuditEntity, id, audit.AuditAction("Apply"),
			audit.AuditActor{Username: operator, IP: ip, Source: "http"}).WithChanges(audit.AuditChange{Field: "createdLineId", NewValue: result.ID}).Normalize()); err != nil {
			return err
		}
		lines := []models.ProductionLine{mapProductionLineDTOToModel(result)}
		if err := attachProductionBOMBranchOperations(transaction, lines); err != nil {
			return err
		}
		result = mapProductionLineToDTO(lines[0])
		return nil
	})
	return result, err
}

func (service *ProductionService) DeleteProductionTopologyTemplateSnapshot(id string, version int64, operator, ip string) error {
	return service.txManager.WithinTransaction(func(transaction *gorm.DB) error {
		var template models.ProductionTopologyTemplate
		if err := transaction.Clauses(clause.Locking{Strength: "UPDATE"}).First(&template, "id = ?", id).Error; err != nil {
			return err
		}
		if template.Version != version {
			return ErrProductionTopologyTemplateVersionConflict
		}
		if err := transaction.Delete(&template).Error; err != nil {
			return err
		}
		return recordAuditEventTx(transaction, audit.NewAuditEvent(productionTopologyTemplateAuditEntity, id, audit.AuditActionDelete,
			audit.AuditActor{Username: operator, IP: ip, Source: "http"}).Normalize())
	})
}
