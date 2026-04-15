package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

type VehicleContactBindingFilter struct {
	VehicleID string
	Category  string
	Enabled   string
	Keyword   string
}

type VehicleContactChannelUpsert struct {
	Type    models.ContactChannelType `json:"type"`
	Value   string                    `json:"value"`
	Primary bool                      `json:"primary,omitempty"`
}

type VehicleContactBindingUpsert struct {
	VehicleID      string                        `json:"vehicleId"`
	VehicleName    string                        `json:"vehicleName"`
	Category       string                        `json:"category"`
	SupplierName   string                        `json:"supplierName"`
	ContactName    string                        `json:"contactName"`
	PrimaryPhone   string                        `json:"primaryPhone"`
	Channels       []VehicleContactChannelUpsert `json:"channels"`
	Region         string                        `json:"region"`
	DispatchAdvice string                        `json:"dispatchAdvice"`
	Note           string                        `json:"note"`
	Enabled        bool                          `json:"enabled"`
}

func GetVehicleContactBindingByID(id string) (models.VehicleContactBinding, bool) {
	if db.DB == nil || strings.TrimSpace(id) == "" {
		return models.VehicleContactBinding{}, false
	}
	var item models.VehicleContactBinding
	if err := db.DB.Where("id = ? AND deleted_at IS NULL", id).First(&item).Error; err != nil {
		return models.VehicleContactBinding{}, false
	}
	return item, true
}

func ListVehicleContactBindings(filter VehicleContactBindingFilter) ([]models.VehicleContactBinding, error) {
	if db.DB == nil {
		return nil, errors.New("database not initialized")
	}

	query := db.DB.Model(&models.VehicleContactBinding{}).Where("deleted_at IS NULL")
	if filter.VehicleID != "" && filter.VehicleID != "all" {
		query = query.Where("vehicle_id = ?", filter.VehicleID)
	}
	if filter.Category != "" && filter.Category != "all" {
		query = query.Where("category = ?", filter.Category)
	}
	if filter.Enabled == "enabled" {
		query = query.Where("enabled = ?", true)
	} else if filter.Enabled == "disabled" {
		query = query.Where("enabled = ?", false)
	}
	if kw := strings.TrimSpace(filter.Keyword); kw != "" {
		pattern := "%" + strings.ToLower(kw) + "%"
		query = query.Where(
			"LOWER(vehicle_name) LIKE ? OR LOWER(contact_name) LIKE ? OR LOWER(COALESCE(supplier_name, '')) LIKE ? OR LOWER(COALESCE(region, '')) LIKE ? OR LOWER(COALESCE(dispatch_advice, '')) LIKE ? OR LOWER(COALESCE(note, '')) LIKE ? OR LOWER(primary_phone) LIKE ? OR LOWER(COALESCE(channels_json, '')) LIKE ?",
			pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern,
		)
	}

	var items []models.VehicleContactBinding
	if err := query.Order("updated_at DESC, created_at DESC, id ASC").Find(&items).Error; err != nil {
		return nil, fmt.Errorf("failed to list vehicle contact bindings: %w", err)
	}
	if items == nil {
		items = []models.VehicleContactBinding{}
	}
	return items, nil
}

func buildVehicleContactValidationError(message string) error {
	return fmt.Errorf("vehicle contact binding validation failed: %s", message)
}

func validateVehicleContactBindingUpsert(input VehicleContactBindingUpsert) error {
	if strings.TrimSpace(input.VehicleID) == "" {
		return buildVehicleContactValidationError("vehicleId is required")
	}
	if strings.TrimSpace(input.ContactName) == "" {
		return buildVehicleContactValidationError("contactName is required")
	}
	if len(input.Channels) == 0 {
		return buildVehicleContactValidationError("channels is required")
	}

	primaryPhoneCount := 0
	for _, channel := range input.Channels {
		if channel.Type == models.ContactChannelTypePhone && channel.Primary {
			primaryPhoneCount++
		}
	}
	if primaryPhoneCount != 1 {
		return buildVehicleContactValidationError("channels must have exactly one primary phone")
	}

	return nil
}

func resolveVehicleContactVehicleSpec(vehicleID string) (VehicleSpecResponse, error) {
	catalog, err := GetVehicleSpecsCatalog()
	if err != nil {
		return VehicleSpecResponse{}, fmt.Errorf("failed to resolve vehicle specs catalog: %w", err)
	}
	for _, spec := range catalog {
		if spec.ID == strings.TrimSpace(vehicleID) {
			return spec, nil
		}
	}
	return VehicleSpecResponse{}, buildVehicleContactValidationError("vehicleId not found in vehicle specs catalog")
}

func UpsertVehicleContactBinding(id string, input VehicleContactBindingUpsert) (models.VehicleContactBinding, error) {
	if db.DB == nil {
		return models.VehicleContactBinding{}, errors.New("database not initialized")
	}
	if err := validateVehicleContactBindingUpsert(input); err != nil {
		return models.VehicleContactBinding{}, err
	}

	vehicleSpec, err := resolveVehicleContactVehicleSpec(input.VehicleID)
	if err != nil {
		return models.VehicleContactBinding{}, err
	}

	var primaryPhone string
	for _, channel := range input.Channels {
		if channel.Type == models.ContactChannelTypePhone && channel.Primary {
			primaryPhone = strings.TrimSpace(channel.Value)
			break
		}
	}

	channelsJSON, err := json.Marshal(input.Channels)
	if err != nil {
		return models.VehicleContactBinding{}, fmt.Errorf("failed to marshal vehicle contact channels: %w", err)
	}

	now := time.Now().UTC().Format(time.RFC3339)
	binding := models.VehicleContactBinding{
		VehicleID:      strings.TrimSpace(input.VehicleID),
		VehicleName:    vehicleSpec.Name,
		Category:       vehicleSpec.Category,
		SupplierName:   strings.TrimSpace(input.SupplierName),
		ContactName:    strings.TrimSpace(input.ContactName),
		PrimaryPhone:   primaryPhone,
		ChannelsJSON:   string(channelsJSON),
		Region:         strings.TrimSpace(input.Region),
		DispatchAdvice: strings.TrimSpace(input.DispatchAdvice),
		Note:           strings.TrimSpace(input.Note),
		Enabled:        input.Enabled,
		UpdatedAt:      now,
	}

	if strings.TrimSpace(id) == "" {
		binding.ID = newVehicleContactBindingID()
		binding.CreatedAt = now
		if err := db.DB.Create(&binding).Error; err != nil {
			return models.VehicleContactBinding{}, fmt.Errorf("failed to create vehicle contact binding: %w", err)
		}
		return binding, nil
	}

	var existing models.VehicleContactBinding
	if err := db.DB.Where("id = ? AND deleted_at IS NULL", id).First(&existing).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			binding.ID = id
			binding.CreatedAt = now
			if createErr := db.DB.Create(&binding).Error; createErr != nil {
				return models.VehicleContactBinding{}, fmt.Errorf("failed to create vehicle contact binding: %w", createErr)
			}
			return binding, nil
		}
		return models.VehicleContactBinding{}, fmt.Errorf("failed to query vehicle contact binding: %w", err)
	}

	binding.ID = existing.ID
	binding.CreatedAt = existing.CreatedAt
	if updateErr := db.DB.Model(&existing).Updates(map[string]interface{}{
		"vehicle_id":      binding.VehicleID,
		"vehicle_name":    binding.VehicleName,
		"category":        binding.Category,
		"supplier_name":   binding.SupplierName,
		"contact_name":    binding.ContactName,
		"primary_phone":   binding.PrimaryPhone,
		"channels_json":   binding.ChannelsJSON,
		"region":          binding.Region,
		"dispatch_advice": binding.DispatchAdvice,
		"note":            binding.Note,
		"enabled":         binding.Enabled,
		"updated_at":      binding.UpdatedAt,
	}).Error; updateErr != nil {
		return models.VehicleContactBinding{}, fmt.Errorf("failed to update vehicle contact binding: %w", updateErr)
	}
	return binding, nil
}

func DeleteVehicleContactBinding(id string) bool {
	if db.DB == nil || strings.TrimSpace(id) == "" {
		return false
	}
	result := db.DB.Model(&models.VehicleContactBinding{}).Where("id = ? AND deleted_at IS NULL", id).Updates(map[string]interface{}{
		"deleted_at": time.Now().UTC().Format(time.RFC3339),
		"enabled":    false,
		"updated_at": time.Now().UTC().Format(time.RFC3339),
	})
	return result.Error == nil && result.RowsAffected > 0
}

func newVehicleContactBindingID() string {
	return "contact-" + strings.ReplaceAll(time.Now().UTC().Format("20060102150405.000000"), ".", "")
}
