package handlers

import (
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
)

func mapPackagingRuleResponse(rule models.PackagingRule) gin.H {
	return gin.H{
		"id":               rule.ID,
		"materialId":       rule.MaterialID,
		"packUnit":         rule.PackUnit,
		"baseUnit":         rule.BaseUnit,
		"conversionFactor": rule.ConversionFactor,
		"direction":        rule.Direction,
		"updatedAt":        rule.UpdatedAt,
	}
}

func mapPackagingRuleResponses(rules []models.PackagingRule) []gin.H {
	items := make([]gin.H, 0, len(rules))
	for _, rule := range rules {
		items = append(items, mapPackagingRuleResponse(rule))
	}
	return items
}
