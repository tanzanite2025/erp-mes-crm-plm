package services

import (
	"encoding/json"
	"xdfc-server/models"
)

func mapVehicleModelTemplateResponse(
	record models.LogisticsVehicleModelTemplate,
	seedVehicleName string,
	versionCount int,
) VehicleModelTemplateResponse {
	notes := make([]string, 0)
	if len(record.Notes) > 0 {
		_ = json.Unmarshal(record.Notes, &notes)
	}
	if notes == nil {
		notes = []string{}
	}

	return VehicleModelTemplateResponse{
		ID:                record.ID,
		Name:              record.Name,
		SeedVehicleSpecID: record.SeedVehicleSpecID,
		SeedVehicleName:   seedVehicleName,
		SourceAssetURL:    record.SourceAssetURL,
		SourceAssetName:   record.SourceAssetName,
		SourceFormat:      record.SourceFormat,
		Status:            record.Status,
		NormalizedFootprint: VehicleModelTemplateFootprint{
			LengthMm: record.NormalizedLengthMm,
			WidthMm:  record.NormalizedWidthMm,
			HeightMm: record.NormalizedHeightMm,
		},
		Version:      record.Version,
		VersionCount: versionCount,
		Notes:        notes,
		CreatedAt:    record.CreatedAt,
		UpdatedAt:    record.UpdatedAt,
	}
}

func mapVehicleModelTemplateVersionResponse(
	record models.LogisticsVehicleModelTemplateVersion,
	seedVehicleName string,
) VehicleModelTemplateVersionResponse {
	notes := make([]string, 0)
	if len(record.Notes) > 0 {
		_ = json.Unmarshal(record.Notes, &notes)
	}
	if notes == nil {
		notes = []string{}
	}
	snapshot := record.Snapshot
	if len(snapshot) == 0 {
		snapshot = json.RawMessage(`{}`)
	}

	return VehicleModelTemplateVersionResponse{
		ID:                record.ID,
		TemplateID:        record.TemplateID,
		Name:              record.Name,
		SeedVehicleSpecID: record.SeedVehicleSpecID,
		SeedVehicleName:   seedVehicleName,
		SourceAssetURL:    record.SourceAssetURL,
		SourceAssetName:   record.SourceAssetName,
		SourceFormat:      record.SourceFormat,
		Status:            record.Status,
		NormalizedFootprint: VehicleModelTemplateFootprint{
			LengthMm: record.NormalizedLengthMm,
			WidthMm:  record.NormalizedWidthMm,
			HeightMm: record.NormalizedHeightMm,
		},
		Version:   record.Version,
		Notes:     notes,
		Snapshot:  snapshot,
		CreatedAt: record.CreatedAt,
		UpdatedAt: record.UpdatedAt,
	}
}

func mapVehicleModelTemplateAuditSnapshot(
	record models.LogisticsVehicleModelTemplate,
) map[string]any {
	return map[string]any{
		"seedVehicleSpecId":  record.SeedVehicleSpecID,
		"name":               record.Name,
		"sourceAssetUrl":     record.SourceAssetURL,
		"sourceAssetName":    record.SourceAssetName,
		"sourceFormat":       record.SourceFormat,
		"status":             record.Status,
		"normalizedLengthMm": record.NormalizedLengthMm,
		"normalizedWidthMm":  record.NormalizedWidthMm,
		"normalizedHeightMm": record.NormalizedHeightMm,
		"version":            record.Version,
		"notes":              string(record.Notes),
	}
}
