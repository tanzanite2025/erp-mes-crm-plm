package services

import (
	"fmt"
	"strings"
	"xdfc-server/models"
)

func formatProductionMaterialRequirementProductName(product models.Product, bom *models.BOM, fallback string) string {
	parts := make([]string, 0, 3)
	for _, part := range []string{product.TechSeries, product.BrakeType, bom.VersionLevel} {
		if strings.TrimSpace(part) != "" {
			parts = append(parts, part)
		}
	}
	if product.Name != "" {
		if len(parts) > 0 {
			return fmt.Sprintf("%s (%s)", product.Name, strings.Join(parts, "/"))
		}
		return product.Name
	}
	return defaultProductionMaterialRequirementDisplayText(product.SKU, defaultProductionMaterialRequirementDisplayText(fallback, "UNNAMED"))
}

func defaultProductionMaterialRequirementDisplayText(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return strings.TrimSpace(value)
}
