package services

import (
	"errors"
	"math"
	"regexp"
	"strconv"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

var ErrPrepregMaterialSpecVersionConflict = errors.New("prepreg material spec version conflict")

type PrepregMaterialSpecValidationError struct {
	Message string
}

func (e *PrepregMaterialSpecValidationError) Error() string {
	return e.Message
}

type PrepregMaterialSpecListQuery struct {
	Search   string
	Page     int
	PageSize int
}

type SavePrepregMaterialSpecRequest struct {
	ID                  string `json:"id"`
	Code                string `json:"code"`
	Name                string `json:"name"`
	DisplayAlias        string `json:"displayAlias"`
	SupplierID          string `json:"supplierId"`
	SupplierProductCode string `json:"supplierProductCode"`
	FiberModel          string `json:"fiberModel"`
	ResinContentPercent string `json:"resinContentPercent"`
	WidthMM             string `json:"widthMm"`
	LengthM             string `json:"lengthM"`
	NominalAreaM2       string `json:"nominalAreaM2"`
	SupplierBatchNo     string `json:"supplierBatchNo"`
	Inspector           string `json:"inspector"`
	BoxNo               string `json:"boxNo"`
	ProductionDate      string `json:"productionDate"`
	Description         string `json:"description"`
	Status              string `json:"status"`
	Version             int    `json:"version"`
}

func trimPrepregMaterialSpecInput(input SavePrepregMaterialSpecRequest) SavePrepregMaterialSpecRequest {
	input.ID = strings.TrimSpace(input.ID)
	input.Code = strings.TrimSpace(input.Code)
	input.Name = strings.TrimSpace(input.Name)
	input.DisplayAlias = strings.TrimSpace(input.DisplayAlias)
	input.SupplierID = strings.TrimSpace(input.SupplierID)
	input.SupplierProductCode = strings.TrimSpace(input.SupplierProductCode)
	input.FiberModel = strings.TrimSpace(input.FiberModel)
	input.ResinContentPercent = strings.TrimSpace(input.ResinContentPercent)
	input.WidthMM = strings.TrimSpace(input.WidthMM)
	input.LengthM = strings.TrimSpace(input.LengthM)
	input.NominalAreaM2 = strings.TrimSpace(input.NominalAreaM2)
	input.SupplierBatchNo = strings.TrimSpace(input.SupplierBatchNo)
	input.Inspector = strings.TrimSpace(input.Inspector)
	input.BoxNo = strings.TrimSpace(input.BoxNo)
	input.ProductionDate = strings.TrimSpace(input.ProductionDate)
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
		DisplayAlias:        input.DisplayAlias,
		SupplierID:          input.SupplierID,
		SupplierProductCode: input.SupplierProductCode,
		FiberModel:          input.FiberModel,
		ResinContentPercent: input.ResinContentPercent,
		WidthMM:             input.WidthMM,
		LengthM:             input.LengthM,
		NominalAreaM2:       input.NominalAreaM2,
		SupplierBatchNo:     input.SupplierBatchNo,
		Inspector:           input.Inspector,
		BoxNo:               input.BoxNo,
		ProductionDate:      input.ProductionDate,
		Description:         input.Description,
		Status:              input.Status,
		Version:             input.Version,
	}
}

var prepregNumberPattern = regexp.MustCompile(`-?\d+(?:\.\d+)?`)

func parsePositiveNumber(raw string) float64 {
	value := strings.TrimSpace(raw)
	if value == "" {
		return 0
	}
	matched := prepregNumberPattern.FindString(value)
	if matched == "" {
		return 0
	}
	parsed, err := strconv.ParseFloat(matched, 64)
	if err != nil || parsed <= 0 {
		return 0
	}
	return parsed
}

func formatPositiveNumber(value float64, digits int) string {
	if value <= 0 {
		return ""
	}
	factor := math.Pow(10, float64(digits))
	rounded := math.Round(value*factor) / factor
	return strconv.FormatFloat(rounded, 'f', -1, 64)
}

func normalizePrepregDimensionFields(input *models.PrepregMaterialSpec) {
	widthMM := parsePositiveNumber(input.WidthMM)
	lengthM := parsePositiveNumber(input.LengthM)
	nominalAreaM2 := parsePositiveNumber(input.NominalAreaM2)

	if lengthM == 0 && widthMM > 0 && nominalAreaM2 > 0 {
		lengthM = nominalAreaM2 / (widthMM / 1000)
	}
	if nominalAreaM2 == 0 && widthMM > 0 && lengthM > 0 {
		nominalAreaM2 = (widthMM / 1000) * lengthM
	}
	if widthMM == 0 && nominalAreaM2 > 0 && lengthM > 0 {
		widthMM = (nominalAreaM2 / lengthM) * 1000
	}

	input.WidthMM = formatPositiveNumber(widthMM, 1)
	input.LengthM = formatPositiveNumber(lengthM, 3)
	input.NominalAreaM2 = formatPositiveNumber(nominalAreaM2, 3)
}

func normalizePrepregSupplierReference(input *models.PrepregMaterialSpec) error {
	input.SupplierID = strings.TrimSpace(input.SupplierID)
	input.SupplierProductCode = strings.TrimSpace(input.SupplierProductCode)
	if input.SupplierID == "" {
		return nil
	}

	var supplier models.Supplier
	err := db.DB.
		Select("id", "code", "name", "is_deleted").
		Where("id = ? AND is_deleted = ?", input.SupplierID, false).
		First(&supplier).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return &PrepregMaterialSpecValidationError{Message: "供应商不存在，请重新选择"}
	}
	if err != nil {
		return err
	}

	snapshotCode := strings.TrimSpace(supplier.Code)
	if snapshotCode == "" {
		snapshotCode = strings.TrimSpace(supplier.Name)
	}
	input.SupplierProductCode = snapshotCode
	return nil
}

func validatePrepregMaterialSpecModel(input models.PrepregMaterialSpec) error {
	if input.Code == "" {
		return &PrepregMaterialSpecValidationError{Message: "产品编号不能为空"}
	}
	if input.Name == "" {
		return &PrepregMaterialSpecValidationError{Message: "产品名称不能为空"}
	}

	if input.Status == "Active" {
		if input.WidthMM == "" {
			return &PrepregMaterialSpecValidationError{Message: "启用状态必须填写宽度"}
		}
		if input.LengthM == "" {
			return &PrepregMaterialSpecValidationError{Message: "启用状态必须填写卷长"}
		}
		if input.NominalAreaM2 == "" {
			return &PrepregMaterialSpecValidationError{Message: "启用状态必须填写合格面积"}
		}
		if input.ResinContentPercent == "" {
			return &PrepregMaterialSpecValidationError{Message: "启用状态必须填写树脂含量"}
		}
		if input.SupplierBatchNo == "" {
			return &PrepregMaterialSpecValidationError{Message: "启用状态必须填写批号"}
		}
	}
	return nil
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
			"code ILIKE ? OR name ILIKE ? OR display_alias ILIKE ? OR supplier_id ILIKE ? OR supplier_product_code ILIKE ? OR fiber_model ILIKE ? OR supplier_batch_no ILIKE ? OR inspector ILIKE ? OR box_no ILIKE ?",
			pattern,
			pattern,
			pattern,
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
	if err := normalizePrepregSupplierReference(&modelInput); err != nil {
		return models.PrepregMaterialSpec{}, err
	}
	normalizePrepregDimensionFields(&modelInput)
	if err := validatePrepregMaterialSpecModel(modelInput); err != nil {
		return models.PrepregMaterialSpec{}, err
	}
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
