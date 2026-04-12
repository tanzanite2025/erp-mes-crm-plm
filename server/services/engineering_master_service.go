package services

import (
	"errors"
	"fmt"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var (
	ErrEngineeringSpecVersionConflict = errors.New("engineering spec version conflict")
	ErrEngineeringSpecLinkedProducts  = errors.New("engineering spec linked by products")
	ErrEngineeringSpecLinkedBOM       = errors.New("engineering spec linked by bom")

	ErrChangeOrderVersionConflict = errors.New("change order version conflict")
	ErrChangeOrderLinkedToBOM     = errors.New("change order linked to bom")

	ErrBOMIDRequired         = errors.New("bom id is required")
	ErrBOMActiveConflict     = errors.New("active bom conflict")
	ErrBOMDeleteLockedActive = errors.New("active bom delete locked")
)

type EngineeringSpecListQuery struct {
	Page     int
	PageSize int
	Options  bool
	SpecType string
}

type ChangeOrderListQuery struct {
	Page       int
	PageSize   int
	Options    bool
	ProductID  string
	ChangeType string
	Status     string
}

type BOMListQuery struct {
	Page      int
	PageSize  int
	Options   bool
	ProductID string
}

type SaveEngineeringSpecInput models.EngineeringSpec
type BulkSyncEngineeringSpecInput models.EngineeringSpec

type SaveChangeOrderInput struct {
	ID            string     `json:"id"`
	ChangeOrderNo string     `json:"changeOrderNo"`
	Title         string     `json:"title"`
	ChangeType    string     `json:"changeType"`
	ProductID     *string    `json:"productId"`
	SiteCode      string     `json:"siteCode"`
	IsDefaultSite bool       `json:"isDefaultSite"`
	RevisionNo    string     `json:"revisionNo"`
	EffectiveFrom *time.Time `json:"effectiveFrom"`
	EffectiveTo   *time.Time `json:"effectiveTo"`
	Status        string     `json:"status"`
	Description   string     `json:"description"`
	Version       int        `json:"version"`
}

func toChangeOrderModel(input SaveChangeOrderInput) models.ChangeOrder {
	return models.ChangeOrder{
		BaseModel: models.BaseModel{
			ID: input.ID,
		},
		ChangeOrderNo: input.ChangeOrderNo,
		Title:         input.Title,
		ChangeType:    input.ChangeType,
		ProductID:     input.ProductID,
		SiteCode:      input.SiteCode,
		IsDefaultSite: input.IsDefaultSite,
		RevisionNo:    input.RevisionNo,
		EffectiveFrom: input.EffectiveFrom,
		EffectiveTo:   input.EffectiveTo,
		Status:        input.Status,
		Description:   input.Description,
		Version:       input.Version,
	}
}

type SaveBOMInput struct {
	ID            string           `json:"id"`
	BOMNo         string           `json:"bomNo"`
	ProductID     string           `json:"productId"`
	ChangeOrderID *string          `json:"changeOrderId"`
	VersionText   string           `json:"version"`
	Status        string           `json:"status"`
	Items         []models.BOMItem `json:"items"`
	Description   string           `json:"description"`
	Version       int              `json:"_v"`
	RevisionNo    string           `json:"revisionNo"`
	EffectiveFrom *time.Time       `json:"effectiveFrom"`
	EffectiveTo   *time.Time       `json:"effectiveTo"`
	ChangeType    string           `json:"changeType"`
	ChangeOrderNo string           `json:"changeOrderNo"`
	SiteCode      string           `json:"siteCode"`
	IsDefaultSite bool             `json:"isDefaultSite"`
}

func (input SaveBOMInput) toModel() models.BOM {
	model := models.BOM{
		BaseModel: models.BaseModel{
			ID: input.ID,
		},
		MasterDataControl: models.MasterDataControl{
			RevisionNo:    input.RevisionNo,
			EffectiveFrom: input.EffectiveFrom,
			EffectiveTo:   input.EffectiveTo,
			ChangeType:    input.ChangeType,
			ChangeOrderNo: input.ChangeOrderNo,
			SiteCode:      input.SiteCode,
			IsDefaultSite: input.IsDefaultSite,
		},
		BOMNo:         input.BOMNo,
		ProductID:     input.ProductID,
		ChangeOrderID: input.ChangeOrderID,
		VersionText:   input.VersionText,
		Status:        input.Status,
		Items:         input.Items,
		Description:   input.Description,
	}
	return model
}

func ListEngineeringSpecs(query EngineeringSpecListQuery) ([]models.EngineeringSpec, int64, error) {
	page := query.Page
	pageSize := query.PageSize
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	specType := strings.TrimSpace(query.SpecType)
	tx := db.DB.Model(&models.EngineeringSpec{})
	if specType != "" {
		tx = tx.Where("type = ?", specType)
	}

	if query.Options {
		var specs []models.EngineeringSpec
		if err := tx.Order("type asc, code asc").Find(&specs).Error; err != nil {
			return nil, 0, err
		}
		return specs, int64(len(specs)), nil
	}

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var items []models.EngineeringSpec
	if err := tx.Order("type asc, code asc").Limit(pageSize).Offset((page - 1) * pageSize).Find(&items).Error; err != nil {
		return nil, 0, err
	}

	return items, total, nil
}

func GetEngineeringSpecByID(id string) (models.EngineeringSpec, error) {
	var spec models.EngineeringSpec
	if err := db.DB.First(&spec, "id = ?", id).Error; err != nil {
		return models.EngineeringSpec{}, err
	}
	return spec, nil
}

func SaveEngineeringSpec(input SaveEngineeringSpecInput) (models.EngineeringSpec, error) {
	modelInput := models.EngineeringSpec(input)
	var saved models.EngineeringSpec

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		if modelInput.ID != "" {
			var existing models.EngineeringSpec
			if err := tx.Where("id = ?", modelInput.ID).First(&existing).Error; err != nil {
				return err
			}
			if modelInput.Version != existing.Version {
				return ErrEngineeringSpecVersionConflict
			}

			modelInput.MasterDataControl.MergeMissingFrom(existing.MasterDataControl, "R1")
			modelInput.Version = existing.Version + 1
			if err := tx.Model(&existing).Updates(modelInput).Error; err != nil {
				return err
			}
			return tx.First(&saved, "id = ?", existing.ID).Error
		}

		modelInput.MasterDataControl.Normalize("R1")
		modelInput.Version = 1
		if err := tx.Create(&modelInput).Error; err != nil {
			return err
		}
		saved = modelInput
		return nil
	})
	if err != nil {
		return models.EngineeringSpec{}, err
	}
	return saved, nil
}

func BulkSyncEngineeringSpecs(inputs []BulkSyncEngineeringSpecInput) error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		for _, in := range inputs {
			spec := models.EngineeringSpec(in)
			if strings.TrimSpace(spec.Name) == "" || strings.TrimSpace(spec.Code) == "" {
				return errors.New("name/code is required")
			}
			spec.MasterDataControl.Normalize("R1")

			if spec.ID != "" {
				if err := tx.Model(&models.EngineeringSpec{}).Where("id = ?", spec.ID).Omit("CreatedAt", "BaseModel.CreatedAt").Updates(&spec).Error; err != nil {
					return err
				}
				continue
			}

			if err := tx.Create(&spec).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func DeleteEngineeringSpec(id string) error {
	var pCount int64
	if err := db.DB.Model(&models.Product{}).Where("engineering_spec_id = ?", id).Count(&pCount).Error; err != nil {
		return err
	}
	if pCount > 0 {
		return ErrEngineeringSpecLinkedProducts
	}

	var bCount int64
	if err := db.DB.Model(&models.BOM{}).Where("description LIKE ?", "%"+id+"%").Count(&bCount).Error; err != nil {
		return err
	}
	if bCount > 0 {
		return ErrEngineeringSpecLinkedBOM
	}

	return db.DB.Delete(&models.EngineeringSpec{}, "id = ?", id).Error
}

func normalizeOptionalUUID(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func normalizeChangeOrder(input *models.ChangeOrder) {
	input.ProductID = normalizeOptionalUUID(input.ProductID)
	input.ChangeOrderNo = strings.TrimSpace(input.ChangeOrderNo)
	input.Title = strings.TrimSpace(input.Title)
	input.ChangeType = strings.ToUpper(strings.TrimSpace(input.ChangeType))
	input.SiteCode = strings.ToUpper(strings.TrimSpace(input.SiteCode))
	input.RevisionNo = strings.TrimSpace(input.RevisionNo)
	input.Status = strings.ToLower(strings.TrimSpace(input.Status))
	input.Description = strings.TrimSpace(input.Description)

	if input.ChangeType == "" {
		input.ChangeType = "ECO"
	}
	if input.RevisionNo == "" {
		input.RevisionNo = "R1"
	}
	if input.Status == "" {
		input.Status = "draft"
	}
	if input.SiteCode == "" {
		input.IsDefaultSite = true
	}
}

func validateChangeOrderReferences(tx *gorm.DB, input *models.ChangeOrder) error {
	if input.ProductID == nil {
		return nil
	}

	var product models.Product
	return tx.Where("id = ?", *input.ProductID).First(&product).Error
}

func ListChangeOrders(query ChangeOrderListQuery) ([]models.ChangeOrder, int64, error) {
	page := query.Page
	pageSize := query.PageSize
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	productID := strings.TrimSpace(query.ProductID)
	changeType := strings.ToUpper(strings.TrimSpace(query.ChangeType))
	status := strings.ToLower(strings.TrimSpace(query.Status))

	tx := db.DB.Model(&models.ChangeOrder{})
	if productID != "" {
		tx = tx.Where("(product_id = ? OR product_id IS NULL)", productID)
	}
	if changeType != "" && changeType != "ALL" {
		tx = tx.Where("change_type = ?", changeType)
	}
	if status != "" && status != "all" {
		tx = tx.Where("status = ?", status)
	}

	orderExpr := "effective_from desc nulls last, created_at desc"

	if query.Options {
		var items []models.ChangeOrder
		if err := tx.Order(orderExpr).Find(&items).Error; err != nil {
			return nil, 0, err
		}
		return items, int64(len(items)), nil
	}

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var items []models.ChangeOrder
	if err := tx.Preload("Product").Order(orderExpr).Limit(pageSize).Offset((page - 1) * pageSize).Find(&items).Error; err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func SaveChangeOrder(input SaveChangeOrderInput) (models.ChangeOrder, error) {
	modelInput := toChangeOrderModel(input)
	normalizeChangeOrder(&modelInput)
	var saved models.ChangeOrder

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		if err := validateChangeOrderReferences(tx, &modelInput); err != nil {
			return err
		}

		if modelInput.ID != "" {
			var existing models.ChangeOrder
			if err := tx.Where("id = ?", modelInput.ID).First(&existing).Error; err != nil {
				return err
			}
			if modelInput.Version != existing.Version {
				return ErrChangeOrderVersionConflict
			}

			updates := map[string]interface{}{
				"change_order_no": modelInput.ChangeOrderNo,
				"title":           modelInput.Title,
				"change_type":     modelInput.ChangeType,
				"product_id":      modelInput.ProductID,
				"site_code":       modelInput.SiteCode,
				"is_default_site": modelInput.IsDefaultSite,
				"revision_no":     modelInput.RevisionNo,
				"effective_from":  modelInput.EffectiveFrom,
				"effective_to":    modelInput.EffectiveTo,
				"status":          modelInput.Status,
				"description":     modelInput.Description,
				"version":         existing.Version + 1,
			}

			if err := tx.Model(&existing).Updates(updates).Error; err != nil {
				return err
			}
			return tx.Preload("Product").First(&saved, "id = ?", existing.ID).Error
		}

		modelInput.Version = 1
		if err := tx.Create(&modelInput).Error; err != nil {
			return err
		}
		return tx.Preload("Product").First(&saved, "id = ?", modelInput.ID).Error
	})
	if err != nil {
		return models.ChangeOrder{}, err
	}
	return saved, nil
}

func DeleteChangeOrder(id string) error {
	var linkedCount int64
	if err := db.DB.Model(&models.BOM{}).Where("change_order_id = ?", id).Count(&linkedCount).Error; err != nil {
		return err
	}
	if linkedCount > 0 {
		return ErrChangeOrderLinkedToBOM
	}

	return db.DB.Delete(&models.ChangeOrder{}, "id = ?", id).Error
}

func ListBOMs(query BOMListQuery) ([]models.BOM, int64, error) {
	page := query.Page
	pageSize := query.PageSize
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	productID := strings.TrimSpace(query.ProductID)
	tx := db.DB.Model(&models.BOM{})
	if productID != "" {
		tx = tx.Where("product_id = ?", productID)
	}

	if query.Options {
		var boms []models.BOM
		if err := tx.Order("created_at desc").Find(&boms).Error; err != nil {
			return nil, 0, err
		}
		hydrateBOMDerivedFields(boms)
		return boms, int64(len(boms)), nil
	}

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var items []models.BOM
	if err := tx.
		Preload("Product").
		Preload("ChangeOrder").
		Preload("Items").
		Preload("Items.Substitutes").
		Preload("Items.Substitutes.Material").
		Order("created_at desc").
		Limit(pageSize).
		Offset((page - 1) * pageSize).
		Find(&items).Error; err != nil {
		return nil, 0, err
	}
	hydrateBOMDerivedFields(items)
	return items, total, nil
}

func GetBOMByID(id string) (models.BOM, error) {
	var bom models.BOM
	if err := db.DB.
		Preload("Product").
		Preload("ChangeOrder").
		Preload("Items").
		Preload("Items.Substitutes").
		Preload("Items.Substitutes.Material").
		First(&bom, "id = ?", id).Error; err != nil {
		return models.BOM{}, err
	}
	bom.DisplayVersion = resolveBOMDisplayVersion(bom)
	return bom, nil
}

func resolveBOMDisplayVersion(bom models.BOM) string {
	if strings.TrimSpace(bom.VersionText) != "" {
		return bom.VersionText
	}
	return "V1.0"
}

func hydrateBOMDerivedFields(items []models.BOM) {
	for idx := range items {
		items[idx].DisplayVersion = resolveBOMDisplayVersion(items[idx])
	}
}

func validateBOMReferences(tx *gorm.DB, input *models.BOM) error {
	if input.ChangeOrderID != nil {
		changeOrderID := strings.TrimSpace(*input.ChangeOrderID)
		if changeOrderID == "" {
			input.ChangeOrderID = nil
		} else {
			var order models.ChangeOrder
			if err := tx.Where("id = ?", changeOrderID).First(&order).Error; err != nil {
				return err
			}
			if order.ProductID != nil && input.ProductID != "" && *order.ProductID != input.ProductID {
				return fmt.Errorf("[VALIDATION] selected change order is not valid for this product")
			}
			if order.Status == "obsolete" {
				return fmt.Errorf("[LOCKED_ASSET] selected change order is obsolete")
			}
		}
	}

	if input.ProductID != "" {
		var p models.Product
		if err := tx.Where("id = ?", input.ProductID).First(&p).Error; err != nil {
			return err
		}
	}

	for _, item := range input.Items {
		if item.MaterialID != "" {
			var m models.Material
			if err := tx.Where("id = ?", item.MaterialID).First(&m).Error; err != nil {
				return err
			}
			if m.Status == "Archived" || m.Status == "Inactive" {
				return fmt.Errorf("[LOCKED_ASSET] BOM contains disabled material (%s - %s)", m.Code, m.Name)
			}
		}

		for _, substitute := range item.Substitutes {
			if strings.TrimSpace(substitute.MaterialID) == "" {
				return fmt.Errorf("[VALIDATION] substitute material is required")
			}
			if substitute.MaterialID == item.MaterialID {
				return fmt.Errorf("[VALIDATION] substitute material cannot equal primary material")
			}

			var alt models.Material
			if err := tx.Where("id = ?", substitute.MaterialID).First(&alt).Error; err != nil {
				return err
			}
			if alt.Status == "Archived" || alt.Status == "Inactive" {
				return fmt.Errorf("[LOCKED_ASSET] substitute material is disabled (%s - %s)", alt.Code, alt.Name)
			}
		}
	}

	return nil
}

func mergeBOMFromChangeOrder(input *models.BOM, order *models.ChangeOrder, defaultRevision string) {
	if order == nil {
		input.MasterDataControl.Normalize(defaultRevision)
		return
	}

	input.ChangeOrderNo = order.ChangeOrderNo
	input.ChangeType = order.ChangeType
	input.SiteCode = order.SiteCode
	input.IsDefaultSite = order.IsDefaultSite
	input.RevisionNo = order.RevisionNo
	input.EffectiveFrom = order.EffectiveFrom
	input.EffectiveTo = order.EffectiveTo

	input.MasterDataControl.Normalize(defaultRevision)
}

func normalizeBOMItems(items []models.BOMItem) []models.BOMItem {
	for idx := range items {
		unitUsage := items[idx].UnitUsage
		wastagePercent := items[idx].WastagePercent
		items[idx].StandardUsage = unitUsage * (1 + wastagePercent/100)
		if items[idx].StandardUsage < 0 {
			items[idx].StandardUsage = 0
		}
	}
	return items
}

func validateUniqueActiveBOM(tx *gorm.DB, input *models.BOM) error {
	if strings.TrimSpace(input.ProductID) == "" || strings.TrimSpace(input.Status) != "active" {
		return nil
	}

	query := tx.Model(&models.BOM{}).
		Where("product_id = ? AND status = ?", input.ProductID, "active")
	if strings.TrimSpace(input.ID) != "" {
		query = query.Where("id <> ?", input.ID)
	}

	var activeCount int64
	if err := query.Count(&activeCount).Error; err != nil {
		return err
	}
	if activeCount > 0 {
		return fmt.Errorf("%w: product %s already has another active BOM", ErrBOMActiveConflict, input.ProductID)
	}
	return nil
}

func generateBOMNo(tx *gorm.DB) string {
	dateStr := time.Now().Format("20060102")
	var count int64
	tx.Model(&models.BOM{}).Where("bom_no LIKE ?", "BOM-"+dateStr+"-%").Count(&count)
	return fmt.Sprintf("BOM-%s-%03d", dateStr, count+1)
}

func saveBOMItems(tx *gorm.DB, bomID string, items []models.BOMItem) error {
	for idx := range items {
		if strings.TrimSpace(items[idx].ID) == "" {
			items[idx].ID = uuid.NewString()
		}
		items[idx].BOMID = bomID
		for subIdx := range items[idx].Substitutes {
			if strings.TrimSpace(items[idx].Substitutes[subIdx].ID) == "" {
				items[idx].Substitutes[subIdx].ID = uuid.NewString()
			}
			items[idx].Substitutes[subIdx].BOMItemID = items[idx].ID
			if items[idx].Substitutes[subIdx].ConversionRate == 0 {
				items[idx].Substitutes[subIdx].ConversionRate = 1
			}
			if items[idx].Substitutes[subIdx].Priority == 0 {
				items[idx].Substitutes[subIdx].Priority = subIdx + 1
			}
		}
		if err := tx.Session(&gorm.Session{FullSaveAssociations: true}).Create(&items[idx]).Error; err != nil {
			return err
		}
	}
	return nil
}

func SaveBOM(input SaveBOMInput) (models.BOM, error) {
	modelInput := input.toModel()
	var saved models.BOM

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		modelInput.Items = normalizeBOMItems(modelInput.Items)
		if err := validateBOMReferences(tx, &modelInput); err != nil {
			return err
		}
		if err := validateUniqueActiveBOM(tx, &modelInput); err != nil {
			return err
		}

		defaultRevision := modelInput.VersionText
		if strings.TrimSpace(defaultRevision) == "" {
			defaultRevision = "V1.0"
		}
		if strings.TrimSpace(modelInput.RevisionNo) == "" {
			modelInput.RevisionNo = "R1"
		}

		var linkedChangeOrder *models.ChangeOrder
		if modelInput.ChangeOrderID != nil && strings.TrimSpace(*modelInput.ChangeOrderID) != "" {
			linkedChangeOrder = &models.ChangeOrder{}
			if err := tx.Where("id = ?", *modelInput.ChangeOrderID).First(linkedChangeOrder).Error; err != nil {
				return err
			}
		}

		if modelInput.ID != "" {
			var existing models.BOM
			if err := tx.Preload("Items").Where("id = ?", modelInput.ID).First(&existing).Error; err != nil {
				return err
			}

			modelInput.MasterDataControl.MergeMissingFrom(existing.MasterDataControl, defaultRevision)
			mergeBOMFromChangeOrder(&modelInput, linkedChangeOrder, defaultRevision)
			if strings.TrimSpace(modelInput.VersionText) == "" {
				modelInput.VersionText = existing.VersionText
			}
			if err := tx.Model(&existing).Omit("Items").Updates(modelInput).Error; err != nil {
				return err
			}
			if err := tx.Where("bom_id = ?", existing.ID).Delete(&models.BOMItem{}).Error; err != nil {
				return err
			}
			if err := saveBOMItems(tx, existing.ID, modelInput.Items); err != nil {
				return err
			}
			return tx.
				Preload("ChangeOrder").
				Preload("Items").
				Preload("Items.Substitutes").
				Preload("Items.Substitutes.Material").
				First(&saved, "id = ?", existing.ID).Error
		}

		mergeBOMFromChangeOrder(&modelInput, linkedChangeOrder, defaultRevision)
		items := modelInput.Items
		modelInput.Items = nil
		if strings.TrimSpace(modelInput.BOMNo) == "" {
			modelInput.BOMNo = generateBOMNo(tx)
		}
		if err := tx.Create(&modelInput).Error; err != nil {
			return err
		}
		if err := saveBOMItems(tx, modelInput.ID, items); err != nil {
			return err
		}
		return tx.
			Preload("ChangeOrder").
			Preload("Items").
			Preload("Items.Substitutes").
			Preload("Items.Substitutes.Material").
			First(&saved, "id = ?", modelInput.ID).Error
	})
	if err != nil {
		return models.BOM{}, err
	}
	saved.DisplayVersion = resolveBOMDisplayVersion(saved)
	return saved, nil
}

func DeleteBOM(id string) error {
	if strings.TrimSpace(id) == "" {
		return ErrBOMIDRequired
	}

	return db.DB.Transaction(func(tx *gorm.DB) error {
		var bom models.BOM
		if err := tx.Where("id = ?", id).First(&bom).Error; err != nil {
			return err
		}
		if strings.TrimSpace(bom.Status) == "active" {
			var activeCount int64
			if err := tx.Model(&models.BOM{}).
				Where("product_id = ? AND status = ?", bom.ProductID, "active").
				Count(&activeCount).Error; err != nil {
				return err
			}
			if activeCount <= 1 {
				return fmt.Errorf("%w: cannot delete the only active BOM for product %s", ErrBOMDeleteLockedActive, bom.ProductID)
			}
		}
		if err := tx.Where("bom_id = ?", id).Delete(&models.BOMItem{}).Error; err != nil {
			return err
		}
		return tx.Delete(&bom).Error
	})
}
