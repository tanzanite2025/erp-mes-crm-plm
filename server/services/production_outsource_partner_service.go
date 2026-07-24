package services

import (
	"errors"
	"fmt"
	"strings"
	"xdfc-server/audit"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

const (
	OutsourcePartnerStatusActive   = "ACTIVE"
	OutsourcePartnerStatusInactive = "INACTIVE"
	OutsourcePartnerStatusOnReview = "ON_REVIEW"
)

var (
	ErrInvalidOutsourcePartner         = errors.New("invalid outsource partner")
	ErrOutsourcePartnerNotFound        = errors.New("outsource partner not found")
	ErrOutsourcePartnerDuplicateCode   = errors.New("outsource partner code already exists")
	ErrOutsourcePartnerVersionConflict = errors.New("outsource partner version conflict")
)

type SaveOutsourcePartnerRequest struct {
	Partner  OutsourcePartnerDTO
	ActorID  string
	Operator string
	IP       string
}

type UpdateOutsourcePartnerRequest struct {
	ID       string
	Partner  OutsourcePartnerDTO
	ActorID  string
	Operator string
	IP       string
}

type DeleteOutsourcePartnerRequest struct {
	ID       string
	ActorID  string
	Operator string
	IP       string
}

type ProductionOutsourcingService struct {
	txManager transactionManager
}

func NewProductionOutsourcingService(txManager transactionManager) *ProductionOutsourcingService {
	return &ProductionOutsourcingService{txManager: txManager}
}

var defaultProductionOutsourcingService = NewProductionOutsourcingService(defaultServiceRuntime().txManager)

func ListOutsourcePartners(query OutsourcePartnerListQuery) (OutsourcePartnerListResponse, error) {
	return defaultProductionOutsourcingService.ListOutsourcePartners(query)
}

func CreateOutsourcePartner(req SaveOutsourcePartnerRequest) (OutsourcePartnerDTO, error) {
	return defaultProductionOutsourcingService.CreateOutsourcePartner(req)
}

func UpdateOutsourcePartner(req UpdateOutsourcePartnerRequest) (OutsourcePartnerDTO, error) {
	return defaultProductionOutsourcingService.UpdateOutsourcePartner(req)
}

func DeleteOutsourcePartner(req DeleteOutsourcePartnerRequest) error {
	return defaultProductionOutsourcingService.DeleteOutsourcePartner(req)
}

func (s *ProductionOutsourcingService) ListOutsourcePartners(query OutsourcePartnerListQuery) (OutsourcePartnerListResponse, error) {
	normalized := normalizeOutsourcePartnerListQuery(query)
	dbQuery := s.txManager.DB().Model(&models.OutsourcePartner{})

	if normalized.Search != "" {
		searchPattern := "%" + strings.ToLower(normalized.Search) + "%"
		dbQuery = dbQuery.Where(
			"LOWER(code) LIKE ? OR LOWER(name) LIKE ? OR LOWER(contact_person) LIKE ? OR LOWER(supplier_name_snapshot) LIKE ?",
			searchPattern,
			searchPattern,
			searchPattern,
			searchPattern,
		)
	}
	if normalized.Status != "" {
		dbQuery = dbQuery.Where("status = ?", normalized.Status)
	}

	var partners []models.OutsourcePartner
	if err := dbQuery.Order("code asc").Find(&partners).Error; err != nil {
		return OutsourcePartnerListResponse{}, err
	}

	items := mapOutsourcePartnersToDTO(partners)
	return OutsourcePartnerListResponse{
		Items:    items,
		Metadata: buildOutsourcePartnerListStats(items),
	}, nil
}

func (s *ProductionOutsourcingService) CreateOutsourcePartner(req SaveOutsourcePartnerRequest) (OutsourcePartnerDTO, error) {
	normalized := normalizeOutsourcePartnerDTO(req.Partner)
	if err := validateOutsourcePartnerDTO(normalized); err != nil {
		return OutsourcePartnerDTO{}, err
	}

	partner := mapOutsourcePartnerDTOToModel(normalized)
	if partner.ID == "" || strings.HasPrefix(partner.ID, "temp-") {
		partner.ID = uuid.NewString()
	}
	partner.Version = 1
	partner.Operator = strings.TrimSpace(req.Operator)

	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		if err := ensureOutsourcePartnerCodeAvailable(tx, partner.Code, ""); err != nil {
			return err
		}
		if err := fillOutsourcePartnerSupplierSnapshot(tx, &partner); err != nil {
			return err
		}
		if err := tx.Create(&partner).Error; err != nil {
			return err
		}
		return recordAuditEventTx(tx, audit.NewAuditEvent(
			audit.AuditEntityOutsourcePartner,
			partner.ID,
			audit.AuditActionCreate,
			outsourcePartnerAuditActor(req.ActorID, req.Operator, req.IP),
		).WithMetadata("code", partner.Code).WithMetadata("name", partner.Name).Normalize())
	})
	return mapOutsourcePartnerToDTO(partner), err
}

func (s *ProductionOutsourcingService) UpdateOutsourcePartner(req UpdateOutsourcePartnerRequest) (OutsourcePartnerDTO, error) {
	id := strings.TrimSpace(req.ID)
	if id == "" {
		return OutsourcePartnerDTO{}, fmt.Errorf("%w: id is required", ErrInvalidOutsourcePartner)
	}

	normalized := normalizeOutsourcePartnerDTO(req.Partner)
	normalized.ID = id
	if err := validateOutsourcePartnerDTO(normalized); err != nil {
		return OutsourcePartnerDTO{}, err
	}

	var updated models.OutsourcePartner
	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		var existing models.OutsourcePartner
		if err := tx.First(&existing, "id = ?", id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrOutsourcePartnerNotFound
			}
			return err
		}
		if normalized.Version <= 0 || existing.Version != normalized.Version {
			return ErrOutsourcePartnerVersionConflict
		}
		if err := ensureOutsourcePartnerCodeAvailable(tx, normalized.Code, id); err != nil {
			return err
		}

		before := mapOutsourcePartnerToDTO(existing)
		updated = existing
		applyOutsourcePartnerDTO(&updated, normalized)
		updated.Operator = strings.TrimSpace(req.Operator)
		updated.Version = existing.Version + 1

		if err := fillOutsourcePartnerSupplierSnapshot(tx, &updated); err != nil {
			return err
		}
		if err := tx.Save(&updated).Error; err != nil {
			return err
		}

		after := mapOutsourcePartnerToDTO(updated)
		event := audit.NewAuditEvent(
			audit.AuditEntityOutsourcePartner,
			updated.ID,
			audit.AuditActionUpdate,
			outsourcePartnerAuditActor(req.ActorID, req.Operator, req.IP),
		).WithChanges(audit.DiffModelValues(before, after)...)
		return recordAuditEventTx(tx, event.Normalize())
	})
	return mapOutsourcePartnerToDTO(updated), err
}

func (s *ProductionOutsourcingService) DeleteOutsourcePartner(req DeleteOutsourcePartnerRequest) error {
	id := strings.TrimSpace(req.ID)
	if id == "" {
		return fmt.Errorf("%w: id is required", ErrInvalidOutsourcePartner)
	}

	return s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		var existing models.OutsourcePartner
		if err := tx.First(&existing, "id = ?", id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrOutsourcePartnerNotFound
			}
			return err
		}
		if err := tx.Delete(&models.OutsourcePartner{}, "id = ?", id).Error; err != nil {
			return err
		}
		return recordAuditEventTx(tx, audit.NewAuditEvent(
			audit.AuditEntityOutsourcePartner,
			id,
			audit.AuditActionDelete,
			outsourcePartnerAuditActor(req.ActorID, req.Operator, req.IP),
		).WithMetadata("code", existing.Code).WithMetadata("name", existing.Name).Normalize())
	})
}

func normalizeOutsourcePartnerListQuery(query OutsourcePartnerListQuery) OutsourcePartnerListQuery {
	return OutsourcePartnerListQuery{
		Search: strings.TrimSpace(query.Search),
		Status: normalizeOutsourcePartnerFilterStatus(query.Status),
	}
}

func normalizeOutsourcePartnerFilterStatus(status string) string {
	normalized := strings.ToUpper(strings.TrimSpace(status))
	if normalized == "" || normalized == "ALL" {
		return ""
	}
	return normalizeOutsourcePartnerStatus(normalized)
}

func normalizeOutsourcePartnerDTO(partner OutsourcePartnerDTO) OutsourcePartnerDTO {
	partner.ID = strings.TrimSpace(partner.ID)
	partner.Code = strings.ToUpper(strings.TrimSpace(partner.Code))
	partner.Name = strings.TrimSpace(partner.Name)
	partner.SupplierID = strings.TrimSpace(partner.SupplierID)
	partner.SupplierNameSnapshot = strings.TrimSpace(partner.SupplierNameSnapshot)
	partner.ContactPerson = strings.TrimSpace(partner.ContactPerson)
	partner.ContactPhone = strings.TrimSpace(partner.ContactPhone)
	partner.Email = strings.TrimSpace(partner.Email)
	partner.Address = strings.TrimSpace(partner.Address)
	partner.QualityGrade = strings.ToUpper(strings.TrimSpace(partner.QualityGrade))
	partner.Status = normalizeOutsourcePartnerStatus(partner.Status)
	partner.SettlementPolicy = strings.TrimSpace(partner.SettlementPolicy)
	partner.Notes = strings.TrimSpace(partner.Notes)
	partner.Operator = strings.TrimSpace(partner.Operator)
	return partner
}

func normalizeOutsourcePartnerStatus(status string) string {
	normalized := strings.ToUpper(strings.TrimSpace(status))
	switch normalized {
	case "":
		return OutsourcePartnerStatusActive
	case "ACTIVE", "ACTIVATED", "ENABLED":
		return OutsourcePartnerStatusActive
	case "INACTIVE", "DISABLED":
		return OutsourcePartnerStatusInactive
	case "ON_REVIEW", "ONREVIEW", "REVIEW":
		return OutsourcePartnerStatusOnReview
	default:
		return normalized
	}
}

func validateOutsourcePartnerDTO(partner OutsourcePartnerDTO) error {
	if partner.Code == "" {
		return fmt.Errorf("%w: code is required", ErrInvalidOutsourcePartner)
	}
	if partner.Name == "" {
		return fmt.Errorf("%w: name is required", ErrInvalidOutsourcePartner)
	}
	if partner.Status != OutsourcePartnerStatusActive &&
		partner.Status != OutsourcePartnerStatusInactive &&
		partner.Status != OutsourcePartnerStatusOnReview {
		return fmt.Errorf("%w: unsupported status %s", ErrInvalidOutsourcePartner, partner.Status)
	}
	if partner.QualityGrade != "" &&
		partner.QualityGrade != "A" &&
		partner.QualityGrade != "B" &&
		partner.QualityGrade != "C" {
		return fmt.Errorf("%w: unsupported quality grade %s", ErrInvalidOutsourcePartner, partner.QualityGrade)
	}
	if partner.LeadTimeDays < 0 {
		return fmt.Errorf("%w: leadTimeDays must not be negative", ErrInvalidOutsourcePartner)
	}
	return nil
}

func ensureOutsourcePartnerCodeAvailable(tx *gorm.DB, code string, excludingID string) error {
	var count int64
	query := tx.Model(&models.OutsourcePartner{}).Where("code = ?", strings.TrimSpace(code))
	if strings.TrimSpace(excludingID) != "" {
		query = query.Where("id <> ?", strings.TrimSpace(excludingID))
	}
	if err := query.Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return ErrOutsourcePartnerDuplicateCode
	}
	return nil
}

func fillOutsourcePartnerSupplierSnapshot(tx *gorm.DB, partner *models.OutsourcePartner) error {
	partner.SupplierID = strings.TrimSpace(partner.SupplierID)
	if partner.SupplierID == "" {
		partner.SupplierNameSnapshot = ""
		return nil
	}

	var supplier models.Supplier
	if err := tx.First(&supplier, "id = ?", partner.SupplierID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("%w: supplierId does not exist", ErrInvalidOutsourcePartner)
		}
		return err
	}
	partner.SupplierNameSnapshot = supplier.Name
	return nil
}

func outsourcePartnerAuditActor(actorID string, username string, ip string) audit.AuditActor {
	return audit.AuditActor{
		UserID:   strings.TrimSpace(actorID),
		Username: strings.TrimSpace(username),
		IP:       strings.TrimSpace(ip),
		Source:   "http",
	}
}
