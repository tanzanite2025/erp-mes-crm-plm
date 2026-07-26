package services

import (
	"errors"
	"math"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

func normalizeLoadingUnitCode(code string) string {
	return strings.ToLower(strings.TrimSpace(code))
}

func convertLoadingLengthToMillimeters(value float64, unitCode string) float64 {
	switch normalizeLoadingUnitCode(unitCode) {
	case "mm", "毫米":
		return value
	case "cm", "厘米":
		return value * 10
	case "m", "米":
		return value * 1000
	default:
		return 0
	}
}

func convertLoadingWeightToKilograms(value float64, unitCode string) float64 {
	switch normalizeLoadingUnitCode(unitCode) {
	case "kg", "千克":
		return value
	case "g", "克":
		return value / 1000
	case "t", "ton", "tonne", "吨":
		return value * 1000
	default:
		return 0
	}
}

func resolveVehicleLoadingPackageProfile(
	profileID string,
	quantity int,
) (vehicleLoadingPackageProfile, error) {
	trimmedProfileID := strings.TrimSpace(profileID)
	if trimmedProfileID == "" {
		return vehicleLoadingPackageProfile{}, ErrVehicleLoadingPackageInputRequired
	}

	var profile models.PackagingProfile
	if err := db.DB.Where("id = ? AND is_active = ?", trimmedProfileID, true).First(&profile).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return vehicleLoadingPackageProfile{}, ErrVehicleLoadingPackageProfileNotFound
		}
		return vehicleLoadingPackageProfile{}, err
	}

	lengthMm := convertLoadingLengthToMillimeters(profile.Length, profile.DimensionUnitCode)
	widthMm := convertLoadingLengthToMillimeters(profile.Width, profile.DimensionUnitCode)
	heightMm := convertLoadingLengthToMillimeters(profile.Height, profile.DimensionUnitCode)
	weightValue := profile.GrossWeight
	if weightValue <= 0 {
		weightValue = profile.NetWeight
	}
	unitWeightKg := convertLoadingWeightToKilograms(weightValue, profile.WeightUnitCode)
	if quantity <= 0 || lengthMm <= 0 || widthMm <= 0 || heightMm <= 0 || unitWeightKg <= 0 {
		return vehicleLoadingPackageProfile{}, ErrVehicleLoadingPackageProfileInvalid
	}

	return vehicleLoadingPackageProfile{
		PackageID: profile.ID,
		Name:      strings.TrimSpace(profile.Name),
		Quantity:  quantity,
		Dimension: VehiclePackageDimensionResponse{
			LengthMm:  int(math.Round(lengthMm)),
			WidthMm:   int(math.Round(widthMm)),
			HeightMm:  int(math.Round(heightMm)),
			CanRotate: profile.CanRotate,
			CanInvert: profile.CanInvert,
		},
		UnitWeightKg: unitWeightKg,
	}, nil
}

func resolveVehicleLoadingSpecs(
	vehicleSpecIDs []string,
) ([]VehicleSpecResponse, error) {
	normalizedIDs := make([]string, 0, len(vehicleSpecIDs))
	seenIDs := make(map[string]struct{}, len(vehicleSpecIDs))
	for _, id := range vehicleSpecIDs {
		trimmedID := strings.TrimSpace(id)
		if trimmedID == "" {
			continue
		}
		if _, exists := seenIDs[trimmedID]; exists {
			continue
		}
		seenIDs[trimmedID] = struct{}{}
		normalizedIDs = append(normalizedIDs, trimmedID)
	}
	if len(normalizedIDs) == 0 {
		return nil, ErrVehicleLoadingVehicleSpecsRequired
	}

	// Packing is a geometry calculation. Do not call GetVehicleSpecsCatalog
	// here: that presentation-oriented API also loads vehicle photos and would
	// couple a recommendation to an unrelated photo table/query.
	catalog := getVehicleSpecsCatalogForCalculation()
	catalogByID := make(map[string]VehicleSpecResponse, len(catalog))
	for _, spec := range catalog {
		catalogByID[spec.ID] = spec
	}

	result := make([]VehicleSpecResponse, 0, len(normalizedIDs))
	for _, id := range normalizedIDs {
		spec, exists := catalogByID[id]
		if !exists || !spec.Enabled {
			return nil, ErrVehicleLoadingVehicleSpecNotFound
		}
		result = append(result, spec)
	}
	return result, nil
}
