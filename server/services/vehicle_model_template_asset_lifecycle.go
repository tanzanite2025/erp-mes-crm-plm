package services

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"
)

const VehicleModelTemplateSourceAssetFilePrefix = "vehicle-model-template-"

type VehicleModelTemplateSourceAssetCleanupResult struct {
	Scanned int
	Kept    int
	Deleted int
}

func isVehicleModelTemplateSourceAssetExtension(fileName string) bool {
	return strings.EqualFold(filepath.Ext(fileName), ".glb")
}

func IsVehicleModelTemplateSourceAssetFileName(fileName string) bool {
	cleanFileName := filepath.Base(strings.TrimSpace(fileName))
	return cleanFileName == strings.TrimSpace(fileName) &&
		strings.HasPrefix(cleanFileName, VehicleModelTemplateSourceAssetFilePrefix) &&
		isVehicleModelTemplateSourceAssetExtension(cleanFileName)
}

func vehicleModelTemplateSourceFileNameFromURL(sourceURL string) (string, bool) {
	trimmedURL := strings.TrimSpace(sourceURL)
	if !strings.HasPrefix(trimmedURL, "/uploads/") ||
		strings.Contains(trimmedURL, "\\") ||
		strings.Contains(trimmedURL, "..") ||
		strings.Contains(trimmedURL, "?") ||
		strings.Contains(trimmedURL, "#") {
		return "", false
	}

	fileName := strings.TrimPrefix(trimmedURL, "/uploads/")
	if !IsVehicleModelTemplateSourceAssetFileName(fileName) {
		return "", false
	}
	return fileName, true
}

func loadReferencedVehicleModelTemplateSourceAssetFileNames() (map[string]struct{}, error) {
	referenced := map[string]struct{}{}

	var currentTemplates []models.LogisticsVehicleModelTemplate
	if err := db.DB.Select("source_asset_url").Find(&currentTemplates).Error; err != nil {
		return nil, err
	}
	for _, template := range currentTemplates {
		if fileName, ok := vehicleModelTemplateSourceFileNameFromURL(template.SourceAssetURL); ok {
			referenced[fileName] = struct{}{}
		}
	}

	var templateVersions []models.LogisticsVehicleModelTemplateVersion
	if err := db.DB.Select("source_asset_url").Find(&templateVersions).Error; err != nil {
		return nil, err
	}
	for _, version := range templateVersions {
		if fileName, ok := vehicleModelTemplateSourceFileNameFromURL(version.SourceAssetURL); ok {
			referenced[fileName] = struct{}{}
		}
	}

	return referenced, nil
}

func CleanupUnboundVehicleModelTemplateSourceAssets(
	uploadDir string,
	olderThan time.Duration,
) (VehicleModelTemplateSourceAssetCleanupResult, error) {
	result := VehicleModelTemplateSourceAssetCleanupResult{}
	if db.DB == nil {
		return result, errors.New("database is not initialized")
	}
	if olderThan <= 0 {
		return result, errors.New("cleanup age threshold must be positive")
	}

	entries, err := os.ReadDir(uploadDir)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return result, nil
		}
		return result, err
	}

	referenced, err := loadReferencedVehicleModelTemplateSourceAssetFileNames()
	if err != nil {
		return result, err
	}

	cutoff := time.Now().Add(-olderThan)
	for _, entry := range entries {
		if entry.IsDir() || !IsVehicleModelTemplateSourceAssetFileName(entry.Name()) {
			continue
		}
		result.Scanned++

		if _, exists := referenced[entry.Name()]; exists {
			result.Kept++
			continue
		}

		info, err := entry.Info()
		if err != nil {
			return result, err
		}
		if info.ModTime().After(cutoff) {
			result.Kept++
			continue
		}

		if err := os.Remove(filepath.Join(uploadDir, entry.Name())); err != nil {
			return result, err
		}
		result.Deleted++
	}

	return result, nil
}
