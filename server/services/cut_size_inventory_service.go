package services

import (
	"errors"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type RecordCutSizeInventoryRequest struct {
	CutSizeUnitID string  `json:"cutSizeUnitId"`
	CutSizeCode   string  `json:"cutSizeCode"`
	CutSizeName   string  `json:"cutSizeName"`
	Quantity      float64 `json:"quantity"`
	Unit          string  `json:"unit"`
	Location      string  `json:"location"`
	Remarks       string  `json:"remarks"`
}

type CutSizeInventoryResponse struct {
	ID            string  `json:"id"`
	CutSizeUnitID string  `json:"cutSizeUnitId"`
	CutSizeCode   string  `json:"cutSizeCode"`
	CutSizeName   string  `json:"cutSizeName"`
	Quantity      float64 `json:"quantity"`
	Unit          string  `json:"unit"`
	Location      string  `json:"location"`
	Remarks       string  `json:"remarks"`
	CreatedAt     string  `json:"createdAt"`
	UpdatedAt     string  `json:"updatedAt"`
}

type CutSizeInventoryTransactionResponse struct {
	ID            string  `json:"id"`
	CutSizeUnitID string  `json:"cutSizeUnitId"`
	CutSizeCode   string  `json:"cutSizeCode"`
	CutSizeName   string  `json:"cutSizeName"`
	Type          string  `json:"type"`
	QuantityDelta float64 `json:"quantityDelta"`
	QuantityAfter float64 `json:"quantityAfter"`
	Unit          string  `json:"unit"`
	Location      string  `json:"location"`
	Operator      string  `json:"operator"`
	Remarks       string  `json:"remarks"`
	CreatedAt     string  `json:"createdAt"`
}

type RecordCutSizeInventoryResponse struct {
	Inventory   CutSizeInventoryResponse            `json:"inventory"`
	Transaction CutSizeInventoryTransactionResponse `json:"transaction"`
}

func ListCutSizeInventory() ([]CutSizeInventoryResponse, error) {
	var items []models.CutSizeInventory
	if err := db.DB.Order("updated_at desc").Find(&items).Error; err != nil {
		return nil, err
	}

	response := make([]CutSizeInventoryResponse, 0, len(items))
	for _, item := range items {
		response = append(response, MapCutSizeInventoryToResponse(item))
	}
	return response, nil
}

func RecordCutSizeInventory(input RecordCutSizeInventoryRequest, operator string) (RecordCutSizeInventoryResponse, error) {
	cutSizeUnitID := strings.TrimSpace(input.CutSizeUnitID)
	if cutSizeUnitID == "" {
		return RecordCutSizeInventoryResponse{}, errors.New("[VALIDATION] cut size unit is required")
	}
	if input.Quantity <= 0 {
		return RecordCutSizeInventoryResponse{}, errors.New("[VALIDATION] quantity must be greater than zero")
	}

	unit := strings.TrimSpace(input.Unit)
	if unit == "" {
		unit = "pcs"
	}

	var savedInventory models.CutSizeInventory
	var savedTransaction models.CutSizeInventoryTransaction

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var spec models.EngineeringSpec
		if err := tx.Select("id", "code", "name", "type").
			Where("id = ? AND type = ?", cutSizeUnitID, cutSizeLibrarySpecType).
			First(&spec).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("[CRITICAL_DATA_INTEGRITY] cut size unit not found")
			}
			return err
		}

		cutSizeCode := firstNonEmptyCutSizeInventoryValue(input.CutSizeCode, spec.Code)
		cutSizeName := firstNonEmptyCutSizeInventoryValue(input.CutSizeName, spec.Name)
		location := strings.TrimSpace(input.Location)
		remarks := strings.TrimSpace(input.Remarks)

		var inventory models.CutSizeInventory
		err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("cut_size_unit_id = ?", cutSizeUnitID).
			First(&inventory).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			inventory = models.CutSizeInventory{
				BaseModel:     models.BaseModel{ID: uuid.NewString()},
				CutSizeUnitID: cutSizeUnitID,
				CutSizeCode:   cutSizeCode,
				CutSizeName:   cutSizeName,
				Quantity:      input.Quantity,
				Unit:          unit,
				Location:      location,
				Remarks:       remarks,
			}
			if err := tx.Create(&inventory).Error; err != nil {
				return err
			}
		} else {
			if err != nil {
				return err
			}
			inventory.CutSizeCode = cutSizeCode
			inventory.CutSizeName = cutSizeName
			inventory.Quantity += input.Quantity
			inventory.Unit = unit
			inventory.Location = location
			inventory.Remarks = remarks
			if err := tx.Model(&inventory).Updates(map[string]any{
				"cut_size_code": inventory.CutSizeCode,
				"cut_size_name": inventory.CutSizeName,
				"quantity":      inventory.Quantity,
				"unit":          inventory.Unit,
				"location":      inventory.Location,
				"remarks":       inventory.Remarks,
			}).Error; err != nil {
				return err
			}
		}

		transaction := models.CutSizeInventoryTransaction{
			BaseModel:     models.BaseModel{ID: uuid.NewString()},
			CutSizeUnitID: cutSizeUnitID,
			CutSizeCode:   cutSizeCode,
			CutSizeName:   cutSizeName,
			Type:          "INBOUND",
			QuantityDelta: input.Quantity,
			QuantityAfter: inventory.Quantity,
			Unit:          unit,
			Location:      location,
			Operator:      strings.TrimSpace(operator),
			Remarks:       remarks,
		}
		if err := tx.Create(&transaction).Error; err != nil {
			return err
		}

		savedInventory = inventory
		savedTransaction = transaction
		return nil
	})
	if err != nil {
		return RecordCutSizeInventoryResponse{}, err
	}

	return RecordCutSizeInventoryResponse{
		Inventory:   MapCutSizeInventoryToResponse(savedInventory),
		Transaction: MapCutSizeInventoryTransactionToResponse(savedTransaction),
	}, nil
}

func MapCutSizeInventoryToResponse(item models.CutSizeInventory) CutSizeInventoryResponse {
	return CutSizeInventoryResponse{
		ID:            item.ID,
		CutSizeUnitID: item.CutSizeUnitID,
		CutSizeCode:   item.CutSizeCode,
		CutSizeName:   item.CutSizeName,
		Quantity:      item.Quantity,
		Unit:          item.Unit,
		Location:      item.Location,
		Remarks:       item.Remarks,
		CreatedAt:     item.CreatedAt.Format(time.RFC3339Nano),
		UpdatedAt:     item.UpdatedAt.Format(time.RFC3339Nano),
	}
}

func MapCutSizeInventoryTransactionToResponse(item models.CutSizeInventoryTransaction) CutSizeInventoryTransactionResponse {
	return CutSizeInventoryTransactionResponse{
		ID:            item.ID,
		CutSizeUnitID: item.CutSizeUnitID,
		CutSizeCode:   item.CutSizeCode,
		CutSizeName:   item.CutSizeName,
		Type:          item.Type,
		QuantityDelta: item.QuantityDelta,
		QuantityAfter: item.QuantityAfter,
		Unit:          item.Unit,
		Location:      item.Location,
		Operator:      item.Operator,
		Remarks:       item.Remarks,
		CreatedAt:     item.CreatedAt.Format(time.RFC3339Nano),
	}
}

func firstNonEmptyCutSizeInventoryValue(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}
