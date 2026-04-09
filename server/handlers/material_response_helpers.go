package handlers

import (
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
)

func mapMaterialResponse(material models.Material) gin.H {
	return gin.H{
		"id":                 material.ID,
		"code":               material.Code,
		"name":               material.Name,
		"category":           material.Category,
		"spec":               material.Spec,
		"internalDimensions": material.InternalDimensions,
		"externalDimensions": material.ExternalDimensions,
		"uom":                material.UOM,
		"minStock":           material.MinStock,
		"costPrice":          material.CostPrice,
		"supplierId":         material.SupplierID,
		"description":        material.Description,
		"images":             material.Images,
		"status":             material.Status,
		"revisionNo":         material.RevisionNo,
		"effectiveFrom":      material.EffectiveFrom,
		"effectiveTo":        material.EffectiveTo,
		"changeType":         material.ChangeType,
		"changeOrderNo":      material.ChangeOrderNo,
		"siteCode":           material.SiteCode,
		"isDefaultSite":      material.IsDefaultSite,
		"createdAt":          material.CreatedAt,
		"updatedAt":          material.UpdatedAt,
		"_v":                 material.Version,
		"version":            material.Version,
	}
}

func mapMaterialResponses(materials []models.Material) []gin.H {
	items := make([]gin.H, 0, len(materials))
	for _, material := range materials {
		items = append(items, mapMaterialResponse(material))
	}
	return items
}
