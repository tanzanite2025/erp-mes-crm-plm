package services

import (
	"encoding/json"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func countVehicleModelTemplateVersionsByTemplateID(
	database *gorm.DB,
	templateIDs []string,
) (map[string]int, error) {
	result := make(map[string]int, len(templateIDs))
	if len(templateIDs) == 0 {
		return result, nil
	}

	type versionCountRow struct {
		TemplateID   string
		VersionCount int64
	}

	rows := make([]versionCountRow, 0)
	if err := database.Model(&models.LogisticsVehicleModelTemplateVersion{}).
		Select("template_id, COUNT(*) as version_count").
		Where("template_id IN ?", templateIDs).
		Group("template_id").
		Scan(&rows).Error; err != nil {
		return nil, err
	}

	for _, row := range rows {
		result[row.TemplateID] = int(row.VersionCount)
	}
	return result, nil
}

func createVehicleModelTemplateVersionSnapshotTx(
	tx *gorm.DB,
	record models.LogisticsVehicleModelTemplate,
) error {
	return createVehicleModelTemplateVersionSnapshotWithGeometryTx(tx, record, nil)
}

func createVehicleModelTemplateVersionSnapshotWithGeometryTx(
	tx *gorm.DB,
	record models.LogisticsVehicleModelTemplate,
	geometry json.RawMessage,
) error {
	snapshot, err := buildVehicleModelTemplateVersionSnapshot(record, geometry)
	if err != nil {
		return err
	}

	versionRecord := models.LogisticsVehicleModelTemplateVersion{
		BaseModel:          models.BaseModel{ID: uuid.NewString()},
		TemplateID:         record.ID,
		Version:            record.Version,
		SeedVehicleSpecID:  record.SeedVehicleSpecID,
		Name:               record.Name,
		SourceAssetURL:     record.SourceAssetURL,
		SourceAssetName:    record.SourceAssetName,
		SourceFormat:       record.SourceFormat,
		Status:             record.Status,
		NormalizedLengthMm: record.NormalizedLengthMm,
		NormalizedWidthMm:  record.NormalizedWidthMm,
		NormalizedHeightMm: record.NormalizedHeightMm,
		Notes:              record.Notes,
		Snapshot:           snapshot,
	}
	return tx.Create(&versionRecord).Error
}

func buildVehicleModelTemplateVersionSnapshot(
	record models.LogisticsVehicleModelTemplate,
	geometry json.RawMessage,
) (json.RawMessage, error) {
	snapshot := map[string]any{
		"templateId":        record.ID,
		"version":           record.Version,
		"seedVehicleSpecId": record.SeedVehicleSpecID,
		"name":              record.Name,
		"sourceAsset": map[string]string{
			"url":      record.SourceAssetURL,
			"fileName": record.SourceAssetName,
			"format":   record.SourceFormat,
		},
		"status": record.Status,
		"normalizedFootprint": map[string]int{
			"lengthMm": record.NormalizedLengthMm,
			"widthMm":  record.NormalizedWidthMm,
			"heightMm": record.NormalizedHeightMm,
		},
		"notes": json.RawMessage(record.Notes),
	}
	if len(geometry) > 0 {
		if !json.Valid(geometry) {
			return nil, ErrVehicleModelTemplateParsedGeometryInvalid
		}
		snapshot["geometry"] = json.RawMessage(geometry)
	}
	return json.Marshal(snapshot)
}

func vehicleModelTemplateGeometryFromVersionSnapshot(
	snapshot json.RawMessage,
) json.RawMessage {
	if len(snapshot) == 0 || !json.Valid(snapshot) {
		return nil
	}

	var values map[string]json.RawMessage
	if err := json.Unmarshal(snapshot, &values); err != nil {
		return nil
	}
	geometry := values["geometry"]
	if len(geometry) == 0 || string(geometry) == "null" || !json.Valid(geometry) {
		return nil
	}

	result := make([]byte, len(geometry))
	copy(result, geometry)
	return result
}

func nextVehicleModelTemplateVersionNumberTx(
	tx *gorm.DB,
	templateID string,
	currentVersion int,
) (int, error) {
	var latestVersion int
	if err := tx.Model(&models.LogisticsVehicleModelTemplateVersion{}).
		Where("template_id = ?", templateID).
		Select("COALESCE(MAX(version), 0)").
		Scan(&latestVersion).Error; err != nil {
		return 0, err
	}
	if currentVersion > latestVersion {
		latestVersion = currentVersion
	}
	return latestVersion + 1, nil
}
