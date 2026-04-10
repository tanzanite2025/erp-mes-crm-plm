package handlers

import (
	"time"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
)

func mapFurnaceResponse(furnace models.Furnace) gin.H {
	return gin.H{
		"id":          furnace.ID,
		"sn":          furnace.SN,
		"name":        furnace.Name,
		"type":        furnace.Type,
		"maxTemp":     furnace.MaxTemp,
		"currentTemp": furnace.CurrentTemp,
		"status":      furnace.Status,
		"location":    furnace.Location,
		"description": furnace.Description,
		"createdBy":   furnace.CreatedBy,
		"updatedBy":   furnace.UpdatedBy,
		"createdAt":   furnace.CreatedAt,
		"updatedAt":   furnace.UpdatedAt,
		"version":     optimisticVersionForResponse(furnace.UpdatedAt, furnace.CreatedAt),
	}
}

func mapFurnaceResponses(furnaces []models.Furnace) []gin.H {
	items := make([]gin.H, 0, len(furnaces))
	for _, furnace := range furnaces {
		items = append(items, mapFurnaceResponse(furnace))
	}
	return items
}

func furnaceListVersion(furnaces []models.Furnace) int64 {
	var latest time.Time
	for _, furnace := range furnaces {
		candidate := furnace.UpdatedAt
		if candidate.IsZero() {
			candidate = furnace.CreatedAt
		}
		if candidate.After(latest) {
			latest = candidate
		}
	}

	if latest.IsZero() {
		latest = time.Now()
	}
	return latest.UnixMilli()
}
