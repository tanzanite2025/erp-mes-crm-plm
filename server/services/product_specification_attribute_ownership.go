package services

import "xdfc-server/models"

// Product grades belong to BOMs. Legacy dynamic grade values must not be
// submitted as product specification attributes after that ownership cutover.
func filterProductSpecificationOwnedAttributeValues(items []models.ProductAttributeValue) []models.ProductAttributeValue {
	result := make([]models.ProductAttributeValue, 0, len(items))
	for _, item := range items {
		if sameProductAttributeCategoryKey(item.CategoryKey, "versionLevel") {
			continue
		}
		result = append(result, item)
	}
	return result
}
