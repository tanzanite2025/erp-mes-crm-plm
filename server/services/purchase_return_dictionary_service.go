package services

import (
	"errors"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

const (
	PurchaseReturnDictionaryTypeReason        = "return_reason"
	PurchaseReturnDictionaryTypeIssueCategory = "issue_category"
)

var defaultPurchaseReturnDictionaries = []models.PurchaseReturnDictionary{
	{DictType: PurchaseReturnDictionaryTypeReason, Code: "APPEARANCE_DEFECT", Name: "外观不良", Description: "表面划伤、污渍、破损等外观缺陷", SortOrder: 10, IsDefault: true, IsSystem: true, Status: "Active"},
	{DictType: PurchaseReturnDictionaryTypeReason, Code: "SPEC_MISMATCH", Name: "规格不符", Description: "来料规格、型号或参数与采购要求不一致", SortOrder: 20, IsSystem: true, Status: "Active"},
	{DictType: PurchaseReturnDictionaryTypeReason, Code: "QTY_EXCEPTION", Name: "数量异常", Description: "到货数量短缺、超送或配比异常", SortOrder: 30, IsSystem: true, Status: "Active"},
	{DictType: PurchaseReturnDictionaryTypeReason, Code: "PACKAGE_DAMAGE", Name: "包装破损", Description: "包装受损导致来料不满足入库条件", SortOrder: 40, IsSystem: true, Status: "Active"},
	{DictType: PurchaseReturnDictionaryTypeReason, Code: "WRONG_MATERIAL", Name: "送错物料", Description: "供应商送错料号、版本或批次", SortOrder: 50, IsSystem: true, Status: "Active"},
	{DictType: PurchaseReturnDictionaryTypeReason, Code: "CONTAMINATION", Name: "来料污染", Description: "来料存在污染、异物或清洁度不达标", SortOrder: 60, IsSystem: true, Status: "Active"},

	{DictType: PurchaseReturnDictionaryTypeIssueCategory, Code: "APPEARANCE", Name: "外观异常", Description: "颜色、表面、印刷、破损等外观异常", SortOrder: 10, IsDefault: true, IsSystem: true, Status: "Active"},
	{DictType: PurchaseReturnDictionaryTypeIssueCategory, Code: "DIMENSION", Name: "尺寸异常", Description: "尺寸、厚度、公差等不符合要求", SortOrder: 20, IsSystem: true, Status: "Active"},
	{DictType: PurchaseReturnDictionaryTypeIssueCategory, Code: "PERFORMANCE", Name: "性能异常", Description: "性能、功能、物理特性不达标", SortOrder: 30, IsSystem: true, Status: "Active"},
	{DictType: PurchaseReturnDictionaryTypeIssueCategory, Code: "PACKAGING", Name: "包装异常", Description: "包装、封装、防护异常", SortOrder: 40, IsSystem: true, Status: "Active"},
	{DictType: PurchaseReturnDictionaryTypeIssueCategory, Code: "IDENTIFICATION", Name: "标识异常", Description: "标签、条码、批次标识错误或缺失", SortOrder: 50, IsSystem: true, Status: "Active"},
	{DictType: PurchaseReturnDictionaryTypeIssueCategory, Code: "QUANTITY", Name: "数量异常", Description: "数量、配套件或齐套性异常", SortOrder: 60, IsSystem: true, Status: "Active"},
}

func ensureDefaultPurchaseReturnDictionaries() error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		for _, item := range defaultPurchaseReturnDictionaries {
			var existing models.PurchaseReturnDictionary
			err := tx.Where("dict_type = ? AND code = ?", item.DictType, item.Code).First(&existing).Error
			switch {
			case errors.Is(err, gorm.ErrRecordNotFound):
				entry := item
				if err := tx.Create(&entry).Error; err != nil {
					return err
				}
			case err != nil:
				return err
			default:
				updates := map[string]any{}
				if existing.Name == "" {
					updates["name"] = item.Name
				}
				if existing.Description == "" {
					updates["description"] = item.Description
				}
				if existing.SortOrder == 0 {
					updates["sort_order"] = item.SortOrder
				}
				if !existing.IsSystem {
					updates["is_system"] = item.IsSystem
				}
				if existing.Status == "" {
					updates["status"] = item.Status
				}
				if len(updates) > 0 {
					if err := tx.Model(&existing).Updates(updates).Error; err != nil {
						return err
					}
				}
			}
		}
		return nil
	})
}

func ListPurchaseReturnDictionaries(dictType string) ([]models.PurchaseReturnDictionary, error) {
	normalizedType := strings.TrimSpace(dictType)
	if normalizedType == "" {
		return nil, errors.New("dictionary type is required")
	}
	if normalizedType != PurchaseReturnDictionaryTypeReason && normalizedType != PurchaseReturnDictionaryTypeIssueCategory {
		return nil, errors.New("unsupported purchase return dictionary type")
	}
	if err := ensureDefaultPurchaseReturnDictionaries(); err != nil {
		return nil, err
	}

	var items []models.PurchaseReturnDictionary
	if err := db.DB.
		Where("dict_type = ?", normalizedType).
		Order("sort_order asc, code asc").
		Find(&items).Error; err != nil {
		return nil, err
	}
	return items, nil
}

