package services

import (
	"encoding/json"
	"errors"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

var (
	ErrVehiclePhotoSpecNotFound    = errors.New("vehicle spec not found")
	ErrVehiclePhotoURLRequired     = errors.New("vehicle photo url is required")
	ErrVehiclePhotoViewTypeInvalid = errors.New("vehicle photo view type is invalid")
)

type VehiclePhotoAnnotationPayload struct {
	ID          string  `json:"id"`
	XPercent    float64 `json:"xPercent"`
	YPercent    float64 `json:"yPercent"`
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Tag         string  `json:"tag,omitempty"`
}

type SaveVehiclePhotoRequest struct {
	URL         string                          `json:"url"`
	ViewType    string                          `json:"viewType"`
	Alt         string                          `json:"alt"`
	Caption     string                          `json:"caption"`
	SortOrder   int                             `json:"sortOrder"`
	Annotations []VehiclePhotoAnnotationPayload `json:"annotations"`
}

type VehiclePhotoImageResponse struct {
	ID          string                          `json:"id"`
	Version     int                             `json:"version"`
	URL         string                          `json:"url"`
	Alt         string                          `json:"alt"`
	ViewType    string                          `json:"viewType"`
	Caption     string                          `json:"caption,omitempty"`
	Annotations []VehiclePhotoAnnotationPayload `json:"annotations"`
}

type VehiclePhotoEntryResponse struct {
	VehicleID     string                      `json:"vehicleId"`
	DisplayTitle  string                      `json:"displayTitle"`
	Description   string                      `json:"description,omitempty"`
	CoverImageURL string                      `json:"coverImageUrl,omitempty"`
	Tags          []string                    `json:"tags"`
	Images        []VehiclePhotoImageResponse `json:"images"`
}

func isSupportedVehiclePhotoViewType(viewType string) bool {
	switch strings.TrimSpace(viewType) {
	case "exterior", "sideDoorOpen", "rearDoorInterior":
		return true
	default:
		return false
	}
}

func findVehicleSpecCatalogBaseByID(vehicleID string) (VehicleSpecResponse, bool) {
	for _, item := range getVehicleSpecsCatalogBase() {
		if item.ID == vehicleID {
			return item, true
		}
	}
	return VehicleSpecResponse{}, false
}

func listVehiclePhotosByVehicleID(vehicleID string) ([]models.LogisticsVehiclePhoto, error) {
	var records []models.LogisticsVehiclePhoto
	if err := db.DB.Where("vehicle_id = ?", strings.TrimSpace(vehicleID)).Order("sort_order asc, created_at asc").Find(&records).Error; err != nil {
		return nil, err
	}
	return records, nil
}

func mapVehiclePhotoRecordToResponse(record models.LogisticsVehiclePhoto) VehiclePhotoImageResponse {
	annotations := make([]VehiclePhotoAnnotationPayload, 0)
	if len(record.Annotations) > 0 {
		_ = json.Unmarshal(record.Annotations, &annotations)
	}
	return VehiclePhotoImageResponse{
		ID:          record.ID,
		Version:     record.Version,
		URL:         record.URL,
		Alt:         record.Alt,
		ViewType:    record.ViewType,
		Caption:     record.Caption,
		Annotations: annotations,
	}
}

func buildEmptyVehiclePhotoEntryResponse(spec VehicleSpecResponse) VehiclePhotoEntryResponse {
	return VehiclePhotoEntryResponse{
		VehicleID:    spec.ID,
		DisplayTitle: spec.Name,
		Description:  spec.Notes,
		Tags:         []string{spec.Category},
		Images:       []VehiclePhotoImageResponse{},
	}
}

func BuildVehiclePhotoEntryForVehicleSpec(spec VehicleSpecResponse) (VehiclePhotoEntryResponse, error) {
	records, err := listVehiclePhotosByVehicleID(spec.ID)
	if err != nil {
		return VehiclePhotoEntryResponse{}, err
	}
	entry := buildEmptyVehiclePhotoEntryResponse(spec)
	entry.Images = make([]VehiclePhotoImageResponse, 0, len(records))
	for _, record := range records {
		image := mapVehiclePhotoRecordToResponse(record)
		if entry.CoverImageURL == "" {
			entry.CoverImageURL = image.URL
		}
		entry.Images = append(entry.Images, image)
	}
	return entry, nil
}

func SaveVehiclePhoto(vehicleID string, req SaveVehiclePhotoRequest) (VehiclePhotoEntryResponse, error) {
	vehicleID = strings.TrimSpace(vehicleID)
	if vehicleID == "" {
		return VehiclePhotoEntryResponse{}, ErrVehiclePhotoSpecNotFound
	}
	spec, exists := findVehicleSpecCatalogBaseByID(vehicleID)
	if !exists {
		return VehiclePhotoEntryResponse{}, ErrVehiclePhotoSpecNotFound
	}
	if strings.TrimSpace(req.URL) == "" {
		return VehiclePhotoEntryResponse{}, ErrVehiclePhotoURLRequired
	}
	if !isSupportedVehiclePhotoViewType(req.ViewType) {
		return VehiclePhotoEntryResponse{}, ErrVehiclePhotoViewTypeInvalid
	}

	annotations := req.Annotations
	if annotations == nil {
		annotations = []VehiclePhotoAnnotationPayload{}
	}
	annotationsJSON, err := json.Marshal(annotations)
	if err != nil {
		return VehiclePhotoEntryResponse{}, err
	}

	sortOrder := req.SortOrder
	if sortOrder == 0 {
		var count int64
		if err := db.DB.Model(&models.LogisticsVehiclePhoto{}).Where("vehicle_id = ?", vehicleID).Count(&count).Error; err != nil {
			return VehiclePhotoEntryResponse{}, err
		}
		sortOrder = int(count) + 1
	}

	record := models.LogisticsVehiclePhoto{
		VehicleID:   vehicleID,
		URL:         strings.TrimSpace(req.URL),
		ViewType:    strings.TrimSpace(req.ViewType),
		Alt:         strings.TrimSpace(req.Alt),
		Caption:     strings.TrimSpace(req.Caption),
		SortOrder:   sortOrder,
		Annotations: annotationsJSON,
	}
	if record.Alt == "" {
		record.Alt = spec.Name
	}

	if err := db.DB.Create(&record).Error; err != nil {
		return VehiclePhotoEntryResponse{}, err
	}
	return BuildVehiclePhotoEntryForVehicleSpec(spec)
}

func DeleteVehiclePhoto(photoID string) error {
	photoID = strings.TrimSpace(photoID)
	if photoID == "" {
		return nil
	}
	return db.DB.Where("id = ?", photoID).Delete(&models.LogisticsVehiclePhoto{}).Error
}

func GetVehiclePhotoByID(photoID string) (models.LogisticsVehiclePhoto, error) {
	var record models.LogisticsVehiclePhoto
	if err := db.DB.Where("id = ?", strings.TrimSpace(photoID)).First(&record).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return models.LogisticsVehiclePhoto{}, ErrVehiclePhotoSpecNotFound
		}
		return models.LogisticsVehiclePhoto{}, err
	}
	return record, nil
}
