package handlers

import (
	"time"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
)

func mapMoldResponse(mold models.Mold) gin.H {
	return gin.H{
		"id":                   mold.ID,
		"sn":                   mold.SN,
		"name":                 mold.Name,
		"maxCycles":            mold.MaxCycles,
		"currentCycles":        mold.CurrentCycles,
		"maintenanceThreshold": mold.MaintenanceThreshold,
		"totalLifeCycles":      mold.TotalLifeCycles,
		"groupName":            mold.GroupName,
		"status":               mold.Status,
		"location":             mold.Location,
		"description":          mold.Description,
		"isAlerted":            mold.IsAlerted,
		"lastCheckedAt":        mold.LastCheckedAt,
		"imageUrl":             mold.ImageURL,
		"createdBy":            mold.CreatedBy,
		"updatedBy":            mold.UpdatedBy,
		"createdAt":            mold.CreatedAt,
		"updatedAt":            mold.UpdatedAt,
		"version":              optimisticVersionForResponse(mold.UpdatedAt, mold.CreatedAt),
	}
}

func mapMoldResponses(molds []models.Mold) []gin.H {
	items := make([]gin.H, 0, len(molds))
	for _, mold := range molds {
		items = append(items, mapMoldResponse(mold))
	}
	return items
}

func moldListVersion(molds []models.Mold) int64 {
	var latest time.Time
	for _, mold := range molds {
		candidate := mold.UpdatedAt
		if candidate.IsZero() {
			candidate = mold.CreatedAt
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
