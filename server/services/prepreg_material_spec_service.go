package services

import (
	"errors"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

var ErrPrepregMaterialSpecVersionConflict = errors.New("prepreg material spec version conflict")

type PrepregMaterialSpecListQuery struct {
	Search   string
	Page     int
	PageSize int
}

type SavePrepregMaterialSpecRequest struct {
	ID                  string `json:"id"`
	Code                string `json:"code"`
	Name                string `json:"name"`
	SupplierProductCode string `json:"supplierProductCode"`
	FiberModel          string `json:"fiberModel"`
	ResinContentPercent string `json:"resinContentPercent"`
	WidthMM             string `json:"widthMm"`
	AreaWeightGSM       string `json:"areaWeightGsm"`
	NominalAreaM2       string `json:"nominalAreaM2"`
	SupplierBatchNo     string `json:"supplierBatchNo"`
	RollNo              string `json:"rollNo"`
	ProductionDate      string `json:"productionDate"`
	StorageRequirement  string `json:"storageRequirement"`
	Description         string `json:"description"`
	Status              string `json:"status"`
	Version             int    `json:"version"`
}

func trimPrepregMaterialSpecInput(input SavePrepregMaterialSpecRequest) SavePrepregMaterialSpecRequest {
	input.ID = strings.TrimSpace(input.ID)
	input.Code = strings.TrimSpace(input.Code)
	input.Name = strings.TrimSpace(input.Name)
	input.SupplierProductCode = strings.TrimSpace(input.SupplierProductCode)
	input.FiberModel = strings.TrimSpace(input.FiberModel)
	input.ResinContentPercent = strings.TrimSpace(input.ResinContentPercent)
	input.WidthMM = strings.TrimSpace(input.WidthMM)
	input.AreaWeightGSM = strings.TrimSpace(input.AreaWeightGSM)
	input.NominalAreaM2 = strings.TrimSpace(input.NominalAreaM2)
	input.SupplierBatchNo = strings.TrimSpace(input.SupplierBatchNo)
	input.RollNo = strings.TrimSpace(input.RollNo)
	input.ProductionDate = strings.TrimSpace(input.ProductionDate)
	input.StorageRequirement = strings.TrimSpace(input.StorageRequirement)
	input.Description = strings.TrimSpace(input.Description)
	input.Status = strings.TrimSpace(input.Status)
	if input.Status == "" {
		input.Status = "Active"
	}
	return input
}

func toPrepregMaterialSpecModel(input SavePrepregMaterialSpecRequest) models.PrepregMaterialSpec {
	input = trimPrepregMaterialSpecInput(input)
	return models.PrepregMaterialSpec{
		BaseModel:           models.BaseModel{ID: input.ID},
		Code:                input.Code,
		Name:                input.Name,
		SupplierProductCode: input.SupplierProductCode,
		FiberModel:          input.FiberModel,
		ResinContentPercent: input.ResinContentPercent,
		WidthMM:             input.WidthMM,
		AreaWeightGSM:       input.AreaWeightGSM,
		NominalAreaM2:       input.NominalAreaM2,
		SupplierBatchNo:     input.SupplierBatchNo,
		RollNo:              input.RollNo,
		ProductionDate:      input.ProductionDate,
		StorageRequirement:  input.StorageRequirement,
		Description:         input.Description,
		Status:              input.Status,
		Version:             input.Version,
	}
}

func ListPrepregMaterialSpecs(query PrepregMaterialSpecListQuery) ([]models.PrepregMaterialSpec, int64, error) {
	page := query.Page
	pageSize := query.PageSize
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	tx := db.DB.Model(&models.PrepregMaterialSpec{})
	search := strings.TrimSpace(query.Search)
	if search != "" {
		pattern := "%" + search + "%"
		tx = tx.Where(
			"code ILIKE ? OR name ILIKE ? OR supplier_product_code ILIKE ? OR fiber_model ILIKE ? OR supplier_batch_no ILIKE ? OR roll_no ILIKE ?",
			pattern,
			pattern,
			pattern,
			pattern,
			pattern,
			pattern,
		)
	}

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var specs []models.PrepregMaterialSpec
	if err := tx.Order("code asc").Limit(pageSize).Offset((page - 1) * pageSize).Find(&specs).Error; err != nil {
		return nil, 0, err
	}
	return specs, total, nil
}

func SavePrepregMaterialSpec(input SavePrepregMaterialSpecRequest) (models.PrepregMaterialSpec, error) {
	modelInput := toPrepregMaterialSpecModel(input)
	var saved models.PrepregMaterialSpec

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		if modelInput.ID != "" {
			var existing models.PrepregMaterialSpec
			if err := tx.Where("id = ?", modelInput.ID).First(&existing).Error; err == nil {
				if modelInput.Version != existing.Version {
					return ErrPrepregMaterialSpecVersionConflict
				}
				modelInput.Version = existing.Version + 1
				if err := tx.Model(&existing).Updates(modelInput).Error; err != nil {
					return err
				}
				return tx.Where("id = ?", existing.ID).First(&saved).Error
			} else if !errors.Is(err, gorm.ErrRecordNotFound) {
				return err
			}
		}

		modelInput.Version = 1
		if err := tx.Create(&modelInput).Error; err != nil {
			return err
		}
		saved = modelInput
		return nil
	})
	if err != nil {
		return models.PrepregMaterialSpec{}, err
	}
	return saved, nil
}

func DeletePrepregMaterialSpec(id string) error {
	return db.DB.Delete(&models.PrepregMaterialSpec{}, "id = ?", strings.TrimSpace(id)).Error
}
