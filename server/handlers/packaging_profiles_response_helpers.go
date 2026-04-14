package handlers

import (
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
)

func mapPackagingProfileTargetResponse(target models.PackagingProfileTarget) gin.H {
	return gin.H{
		"id":                 target.ID,
		"packagingProfileId": target.PackagingProfileID,
		"entityType":         target.EntityType,
		"entityId":           target.EntityID,
		"entityCode":         target.EntityCode,
		"entityName":         target.EntityName,
		"spec":               target.Spec,
		"isDefault":          target.IsDefault,
		"sortOrder":          target.SortOrder,
	}
}

func mapPackagingProfileResponse(profile models.PackagingProfile) gin.H {
	targets := make([]gin.H, 0, len(profile.Targets))
	for _, target := range profile.Targets {
		targets = append(targets, mapPackagingProfileTargetResponse(target))
	}
	return gin.H{
		"id":                profile.ID,
		"code":              profile.Code,
		"name":              profile.Name,
		"packagingType":     profile.PackagingType,
		"length":            profile.Length,
		"width":             profile.Width,
		"height":            profile.Height,
		"dimensionUnitCode": profile.DimensionUnitCode,
		"netWeight":         profile.NetWeight,
		"grossWeight":       profile.GrossWeight,
		"weightUnitCode":    profile.WeightUnitCode,
		"capacity":          profile.Capacity,
		"capacityUnitCode":  profile.CapacityUnitCode,
		"assemblySource":    profile.AssemblySource,
		"isActive":          profile.IsActive,
		"notes":             profile.Notes,
		"targets":           targets,
		"createdAt":         profile.CreatedAt,
		"updatedAt":         profile.UpdatedAt,
	}
}

func mapPackagingProfileResponses(profiles []models.PackagingProfile) []gin.H {
	items := make([]gin.H, 0, len(profiles))
	for _, profile := range profiles {
		items = append(items, mapPackagingProfileResponse(profile))
	}
	return items
}
