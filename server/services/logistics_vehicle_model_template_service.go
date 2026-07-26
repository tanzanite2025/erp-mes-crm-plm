package services

import (
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
)

var (
	ErrVehicleModelTemplateSeedVehicleNotFound  = errors.New("seed vehicle spec not found")
	ErrVehicleModelTemplateNameRequired         = errors.New("template name is required")
	ErrVehicleModelTemplateSourceURLRequired    = errors.New("source asset url is required")
	ErrVehicleModelTemplateSourceURLInvalid     = errors.New("source asset url must be an internal upload path")
	ErrVehicleModelTemplateSourceNameRequired   = errors.New("source asset name is required")
	ErrVehicleModelTemplateSourceFormatInvalid  = errors.New("source format is invalid")
	ErrVehicleModelTemplateStatusInvalid        = errors.New("template status is invalid")
	ErrVehicleModelTemplateStatusParserOnly     = errors.New("normalized status can only be written by the geometry parser")
	ErrVehicleModelTemplateFootprintInvalid     = errors.New("normalized footprint must be positive")
	ErrVehicleModelTemplateDuplicate            = errors.New("template already exists for seed vehicle")
	ErrVehicleModelTemplateSeedVehicleImmutable = errors.New("template seed vehicle cannot be changed")
	ErrVehicleModelTemplateNotFound             = errors.New("vehicle model template not found")
	ErrVehicleModelTemplateVersionInvalid       = errors.New("vehicle model template version is invalid")
	ErrVehicleModelTemplateVersionNotFound      = errors.New("vehicle model template version not found")
)

type VehicleModelTemplateFootprint struct {
	LengthMm int `json:"lengthMm"`
	WidthMm  int `json:"widthMm"`
	HeightMm int `json:"heightMm"`
}

type SaveVehicleModelTemplateRequest struct {
	Name                string                        `json:"name"`
	SeedVehicleSpecID   string                        `json:"seedVehicleSpecId"`
	SourceAssetURL      string                        `json:"sourceAssetUrl"`
	SourceAssetName     string                        `json:"sourceAssetName"`
	SourceFormat        string                        `json:"sourceFormat"`
	Status              string                        `json:"status"`
	NormalizedFootprint VehicleModelTemplateFootprint `json:"normalizedFootprint"`
	Notes               []string                      `json:"notes"`
	ActorID             string                        `json:"-"`
	Operator            string                        `json:"-"`
	IP                  string                        `json:"-"`
}

type VehicleModelTemplateResponse struct {
	ID                  string                        `json:"id"`
	Name                string                        `json:"name"`
	SeedVehicleSpecID   string                        `json:"seedVehicleSpecId"`
	SeedVehicleName     string                        `json:"seedVehicleName"`
	SourceAssetURL      string                        `json:"sourceAssetUrl"`
	SourceAssetName     string                        `json:"sourceAssetName"`
	SourceFormat        string                        `json:"sourceFormat"`
	Status              string                        `json:"status"`
	NormalizedFootprint VehicleModelTemplateFootprint `json:"normalizedFootprint"`
	Version             int                           `json:"version"`
	VersionCount        int                           `json:"versionCount"`
	Notes               []string                      `json:"notes"`
	CreatedAt           time.Time                     `json:"createdAt"`
	UpdatedAt           time.Time                     `json:"updatedAt"`
}

type VehicleModelTemplateVersionResponse struct {
	ID                  string                        `json:"id"`
	TemplateID          string                        `json:"templateId"`
	Name                string                        `json:"name"`
	SeedVehicleSpecID   string                        `json:"seedVehicleSpecId"`
	SeedVehicleName     string                        `json:"seedVehicleName"`
	SourceAssetURL      string                        `json:"sourceAssetUrl"`
	SourceAssetName     string                        `json:"sourceAssetName"`
	SourceFormat        string                        `json:"sourceFormat"`
	Status              string                        `json:"status"`
	NormalizedFootprint VehicleModelTemplateFootprint `json:"normalizedFootprint"`
	Version             int                           `json:"version"`
	Notes               []string                      `json:"notes"`
	Snapshot            json.RawMessage               `json:"snapshot"`
	CreatedAt           time.Time                     `json:"createdAt"`
	UpdatedAt           time.Time                     `json:"updatedAt"`
}

type RestoreVehicleModelTemplateVersionRequest struct {
	ActorID  string
	Operator string
	IP       string
}

func findVehicleModelTemplateSeedVehicle(seedVehicleSpecID string) (VehicleSpecResponse, error) {
	trimmed := strings.TrimSpace(seedVehicleSpecID)
	if trimmed == "" {
		return VehicleSpecResponse{}, ErrVehicleModelTemplateSeedVehicleNotFound
	}
	spec, exists := findVehicleSpecCatalogBaseByID(trimmed)
	if !exists {
		return VehicleSpecResponse{}, ErrVehicleModelTemplateSeedVehicleNotFound
	}
	return spec, nil
}

func ListVehicleModelTemplates(seedVehicleSpecID string) ([]VehicleModelTemplateResponse, error) {
	query := db.DB.Order("updated_at desc")
	trimmedSeedID := strings.TrimSpace(seedVehicleSpecID)
	if trimmedSeedID != "" {
		query = query.Where("seed_vehicle_spec_id = ?", trimmedSeedID)
	}

	var records []models.LogisticsVehicleModelTemplate
	if err := query.Find(&records).Error; err != nil {
		return nil, err
	}

	templateIDs := make([]string, 0, len(records))
	for _, record := range records {
		templateIDs = append(templateIDs, record.ID)
	}
	versionCounts, err := countVehicleModelTemplateVersionsByTemplateID(db.DB, templateIDs)
	if err != nil {
		return nil, err
	}

	result := make([]VehicleModelTemplateResponse, 0, len(records))
	for _, record := range records {
		spec, err := findVehicleModelTemplateSeedVehicle(record.SeedVehicleSpecID)
		if err != nil {
			return nil, err
		}
		result = append(result, mapVehicleModelTemplateResponse(record, spec.Name, versionCounts[record.ID]))
	}
	return result, nil
}

func ListVehicleModelTemplateVersions(templateID string) ([]VehicleModelTemplateVersionResponse, error) {
	trimmedTemplateID := strings.TrimSpace(templateID)
	if trimmedTemplateID == "" {
		return nil, ErrVehicleModelTemplateNotFound
	}

	var template models.LogisticsVehicleModelTemplate
	if err := db.DB.First(&template, "id = ?", trimmedTemplateID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrVehicleModelTemplateNotFound
		}
		return nil, err
	}

	var records []models.LogisticsVehicleModelTemplateVersion
	if err := db.DB.Where("template_id = ?", trimmedTemplateID).
		Order("version desc").
		Find(&records).Error; err != nil {
		return nil, err
	}

	result := make([]VehicleModelTemplateVersionResponse, 0, len(records))
	for _, record := range records {
		spec, err := findVehicleModelTemplateSeedVehicle(record.SeedVehicleSpecID)
		if err != nil {
			return nil, err
		}
		result = append(result, mapVehicleModelTemplateVersionResponse(record, spec.Name))
	}
	return result, nil
}

func saveVehicleModelTemplateRecordTx(
	tx *gorm.DB,
	id string,
	request SaveVehicleModelTemplateRequest,
) (models.LogisticsVehicleModelTemplate, *models.LogisticsVehicleModelTemplate, error) {
	database := tx
	if database == nil {
		database = db.DB
	}

	request.Name = strings.TrimSpace(request.Name)
	request.SeedVehicleSpecID = strings.TrimSpace(request.SeedVehicleSpecID)
	request.SourceAssetURL = strings.TrimSpace(request.SourceAssetURL)
	request.SourceAssetName = strings.TrimSpace(request.SourceAssetName)
	request.SourceFormat = strings.ToLower(strings.TrimSpace(request.SourceFormat))
	request.Status = strings.ToLower(strings.TrimSpace(request.Status))
	request.Notes = normalizeVehicleModelTemplateNotes(request.Notes)

	if err := validateVehicleModelTemplateRequest(request); err != nil {
		return models.LogisticsVehicleModelTemplate{}, nil, err
	}
	if _, err := findVehicleModelTemplateSeedVehicle(request.SeedVehicleSpecID); err != nil {
		return models.LogisticsVehicleModelTemplate{}, nil, err
	}

	var duplicateCount int64
	duplicateQuery := database.Model(&models.LogisticsVehicleModelTemplate{}).
		Where("seed_vehicle_spec_id = ? AND name = ?", request.SeedVehicleSpecID, request.Name)
	if strings.TrimSpace(id) != "" {
		duplicateQuery = duplicateQuery.Where("id <> ?", strings.TrimSpace(id))
	}
	if err := duplicateQuery.Count(&duplicateCount).Error; err != nil {
		return models.LogisticsVehicleModelTemplate{}, nil, err
	}
	if duplicateCount > 0 {
		return models.LogisticsVehicleModelTemplate{}, nil, ErrVehicleModelTemplateDuplicate
	}

	notesJSON, err := json.Marshal(request.Notes)
	if err != nil {
		return models.LogisticsVehicleModelTemplate{}, nil, err
	}

	record := models.LogisticsVehicleModelTemplate{
		SeedVehicleSpecID:  request.SeedVehicleSpecID,
		Name:               request.Name,
		SourceAssetURL:     request.SourceAssetURL,
		SourceAssetName:    request.SourceAssetName,
		SourceFormat:       request.SourceFormat,
		Status:             request.Status,
		NormalizedLengthMm: request.NormalizedFootprint.LengthMm,
		NormalizedWidthMm:  request.NormalizedFootprint.WidthMm,
		NormalizedHeightMm: request.NormalizedFootprint.HeightMm,
		Version:            1,
		Notes:              notesJSON,
	}

	if strings.TrimSpace(id) == "" {
		record.ID = uuid.NewString()
		if err := database.Create(&record).Error; err != nil {
			return models.LogisticsVehicleModelTemplate{}, nil, err
		}
		return record, nil, nil
	}

	var existing models.LogisticsVehicleModelTemplate
	if err := database.First(&existing, "id = ?", strings.TrimSpace(id)).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return models.LogisticsVehicleModelTemplate{}, nil, ErrVehicleModelTemplateNotFound
		}
		return models.LogisticsVehicleModelTemplate{}, nil, err
	}

	previous := existing
	if existing.SeedVehicleSpecID != record.SeedVehicleSpecID {
		return models.LogisticsVehicleModelTemplate{}, nil, ErrVehicleModelTemplateSeedVehicleImmutable
	}
	existing.SeedVehicleSpecID = record.SeedVehicleSpecID
	existing.Name = record.Name
	existing.SourceAssetURL = record.SourceAssetURL
	existing.SourceAssetName = record.SourceAssetName
	existing.SourceFormat = record.SourceFormat
	existing.Status = record.Status
	existing.NormalizedLengthMm = record.NormalizedLengthMm
	existing.NormalizedWidthMm = record.NormalizedWidthMm
	existing.NormalizedHeightMm = record.NormalizedHeightMm
	existing.Notes = record.Notes
	existing.Version++

	if err := database.Save(&existing).Error; err != nil {
		return models.LogisticsVehicleModelTemplate{}, nil, err
	}
	return existing, &previous, nil
}

func SaveVehicleModelTemplate(
	request SaveVehicleModelTemplateRequest,
) (VehicleModelTemplateResponse, error) {
	var record models.LogisticsVehicleModelTemplate
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		saved, _, err := saveVehicleModelTemplateRecordTx(tx, "", request)
		if err != nil {
			return err
		}
		record = saved
		if err := createVehicleModelTemplateVersionSnapshotTx(tx, record); err != nil {
			return err
		}
		return recordVehicleModelTemplateAuditEventTx(
			tx,
			audit.AuditActionCreate,
			nil,
			record,
			request,
		)
	})
	if err != nil {
		return VehicleModelTemplateResponse{}, err
	}
	spec, err := findVehicleModelTemplateSeedVehicle(record.SeedVehicleSpecID)
	if err != nil {
		return VehicleModelTemplateResponse{}, err
	}
	versionCounts, err := countVehicleModelTemplateVersionsByTemplateID(db.DB, []string{record.ID})
	if err != nil {
		return VehicleModelTemplateResponse{}, err
	}
	return mapVehicleModelTemplateResponse(record, spec.Name, versionCounts[record.ID]), nil
}

func UpdateVehicleModelTemplate(
	id string,
	request SaveVehicleModelTemplateRequest,
) (VehicleModelTemplateResponse, error) {
	var record models.LogisticsVehicleModelTemplate
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		saved, previous, err := saveVehicleModelTemplateRecordTx(tx, id, request)
		if err != nil {
			return err
		}
		record = saved
		if err := createVehicleModelTemplateVersionSnapshotTx(tx, record); err != nil {
			return err
		}
		return recordVehicleModelTemplateAuditEventTx(
			tx,
			audit.AuditActionUpdate,
			previous,
			record,
			request,
		)
	})
	if err != nil {
		return VehicleModelTemplateResponse{}, err
	}
	spec, err := findVehicleModelTemplateSeedVehicle(record.SeedVehicleSpecID)
	if err != nil {
		return VehicleModelTemplateResponse{}, err
	}
	versionCounts, err := countVehicleModelTemplateVersionsByTemplateID(db.DB, []string{record.ID})
	if err != nil {
		return VehicleModelTemplateResponse{}, err
	}
	return mapVehicleModelTemplateResponse(record, spec.Name, versionCounts[record.ID]), nil
}

func RestoreVehicleModelTemplateVersion(
	templateID string,
	versionNumber int,
	request RestoreVehicleModelTemplateVersionRequest,
) (VehicleModelTemplateResponse, error) {
	trimmedTemplateID := strings.TrimSpace(templateID)
	if trimmedTemplateID == "" {
		return VehicleModelTemplateResponse{}, ErrVehicleModelTemplateNotFound
	}
	if versionNumber <= 0 {
		return VehicleModelTemplateResponse{}, ErrVehicleModelTemplateVersionInvalid
	}

	var record models.LogisticsVehicleModelTemplate
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var existing models.LogisticsVehicleModelTemplate
		if err := tx.First(&existing, "id = ?", trimmedTemplateID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrVehicleModelTemplateNotFound
			}
			return err
		}

		var versionRecord models.LogisticsVehicleModelTemplateVersion
		if err := tx.First(&versionRecord, "template_id = ? AND version = ?", trimmedTemplateID, versionNumber).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrVehicleModelTemplateVersionNotFound
			}
			return err
		}

		previous := existing
		existing.SeedVehicleSpecID = versionRecord.SeedVehicleSpecID
		existing.Name = versionRecord.Name
		existing.SourceAssetURL = versionRecord.SourceAssetURL
		existing.SourceAssetName = versionRecord.SourceAssetName
		existing.SourceFormat = versionRecord.SourceFormat
		existing.Status = versionRecord.Status
		existing.NormalizedLengthMm = versionRecord.NormalizedLengthMm
		existing.NormalizedWidthMm = versionRecord.NormalizedWidthMm
		existing.NormalizedHeightMm = versionRecord.NormalizedHeightMm
		existing.Notes = versionRecord.Notes

		nextVersion, err := nextVehicleModelTemplateVersionNumberTx(tx, existing.ID, existing.Version)
		if err != nil {
			return err
		}
		existing.Version = nextVersion

		if err := tx.Save(&existing).Error; err != nil {
			return err
		}
		if err := createVehicleModelTemplateVersionSnapshotWithGeometryTx(
			tx,
			existing,
			vehicleModelTemplateGeometryFromVersionSnapshot(versionRecord.Snapshot),
		); err != nil {
			return err
		}

		record = existing
		return recordVehicleModelTemplateAuditEventTx(
			tx,
			audit.AuditActionUpdate,
			&previous,
			record,
			SaveVehicleModelTemplateRequest{
				ActorID:  request.ActorID,
				Operator: request.Operator,
				IP:       request.IP,
			},
			map[string]string{
				"restoredFromVersion": fmt.Sprintf("%d", versionRecord.Version),
			},
		)
	})
	if err != nil {
		return VehicleModelTemplateResponse{}, err
	}

	spec, err := findVehicleModelTemplateSeedVehicle(record.SeedVehicleSpecID)
	if err != nil {
		return VehicleModelTemplateResponse{}, err
	}
	versionCounts, err := countVehicleModelTemplateVersionsByTemplateID(db.DB, []string{record.ID})
	if err != nil {
		return VehicleModelTemplateResponse{}, err
	}
	return mapVehicleModelTemplateResponse(record, spec.Name, versionCounts[record.ID]), nil
}
