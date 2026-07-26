package handlers

import (
	"errors"
	"net/http"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type packagingProfileTargetPayload struct {
	ID         string `json:"id"`
	EntityType string `json:"entityType"`
	EntityID   string `json:"entityId"`
	EntityCode string `json:"entityCode"`
	EntityName string `json:"entityName"`
	Spec       string `json:"spec"`
	IsDefault  bool   `json:"isDefault"`
	SortOrder  int    `json:"sortOrder"`
}

type packagingProfilePayload struct {
	ID                string                          `json:"id"`
	Code              string                          `json:"code"`
	Name              string                          `json:"name"`
	PackagingType     string                          `json:"packagingType"`
	Length            float64                         `json:"length"`
	Width             float64                         `json:"width"`
	Height            float64                         `json:"height"`
	DimensionUnitCode string                          `json:"dimensionUnitCode"`
	NetWeight         float64                         `json:"netWeight"`
	GrossWeight       float64                         `json:"grossWeight"`
	WeightUnitCode    string                          `json:"weightUnitCode"`
	Capacity          float64                         `json:"capacity"`
	CapacityUnitCode  string                          `json:"capacityUnitCode"`
	CanRotate         bool                            `json:"canRotate"`
	CanInvert         bool                            `json:"canInvert"`
	AssemblySource    string                          `json:"assemblySource"`
	IsActive          bool                            `json:"isActive"`
	Notes             string                          `json:"notes"`
	Targets           []packagingProfileTargetPayload `json:"targets"`
}

func validatePackagingUnitCode(tx *gorm.DB, unitCode string, categories ...string) error {
	trimmed := strings.TrimSpace(unitCode)
	if trimmed == "" {
		return nil
	}

	query := tx.Model(&models.Unit{}).Where("code = ?", trimmed)
	if len(categories) > 0 {
		query = query.Where("category IN ?", categories)
	}

	var count int64
	if err := query.Count(&count).Error; err != nil {
		return err
	}
	if count == 0 {
		return errors.New("unit not found")
	}
	return nil
}

func validatePackagingProfilePayload(tx *gorm.DB, payload packagingProfilePayload) error {
	if strings.TrimSpace(payload.Code) == "" || strings.TrimSpace(payload.Name) == "" {
		return errors.New("code/name required")
	}
	if len(payload.Targets) == 0 {
		return errors.New("targets required")
	}
	if payload.Capacity <= 0 {
		return errors.New("capacity must be positive")
	}
	if err := validatePackagingUnitCode(tx, payload.DimensionUnitCode, "LENGTH"); err != nil {
		return err
	}
	if err := validatePackagingUnitCode(tx, payload.WeightUnitCode, "WEIGHT"); err != nil {
		return err
	}
	if err := validatePackagingUnitCode(tx, payload.CapacityUnitCode, "QUANTITY", "OTHER"); err != nil {
		return err
	}
	defaultCount := 0
	for _, target := range payload.Targets {
		if strings.TrimSpace(target.EntityType) == "" || strings.TrimSpace(target.EntityID) == "" {
			return errors.New("target entity required")
		}
		if target.IsDefault {
			defaultCount++
		}
	}
	if defaultCount > 1 {
		return errors.New("multiple defaults")
	}
	return nil
}

func mapPackagingProfileModel(payload packagingProfilePayload) models.PackagingProfile {
	targets := make([]models.PackagingProfileTarget, 0, len(payload.Targets))
	for _, target := range payload.Targets {
		targets = append(targets, models.PackagingProfileTarget{
			BaseModel:  models.BaseModel{ID: target.ID},
			EntityType: strings.TrimSpace(target.EntityType),
			EntityID:   strings.TrimSpace(target.EntityID),
			EntityCode: strings.TrimSpace(target.EntityCode),
			EntityName: strings.TrimSpace(target.EntityName),
			Spec:       strings.TrimSpace(target.Spec),
			IsDefault:  target.IsDefault,
			SortOrder:  target.SortOrder,
		})
	}
	return models.PackagingProfile{
		BaseModel:         models.BaseModel{ID: payload.ID},
		Code:              strings.TrimSpace(payload.Code),
		Name:              strings.TrimSpace(payload.Name),
		PackagingType:     strings.TrimSpace(payload.PackagingType),
		Length:            payload.Length,
		Width:             payload.Width,
		Height:            payload.Height,
		DimensionUnitCode: strings.TrimSpace(payload.DimensionUnitCode),
		NetWeight:         payload.NetWeight,
		GrossWeight:       payload.GrossWeight,
		WeightUnitCode:    strings.TrimSpace(payload.WeightUnitCode),
		Capacity:          payload.Capacity,
		CapacityUnitCode:  strings.TrimSpace(payload.CapacityUnitCode),
		CanRotate:         payload.CanRotate,
		CanInvert:         payload.CanInvert,
		AssemblySource:    strings.TrimSpace(payload.AssemblySource),
		IsActive:          payload.IsActive,
		Notes:             strings.TrimSpace(payload.Notes),
		Targets:           targets,
	}
}

func GetPackagingProfilesHandler(c *gin.Context) {
	var profiles []models.PackagingProfile
	query := db.DB.Preload("Targets", func(tx *gorm.DB) *gorm.DB {
		return tx.Order("sort_order asc, created_at asc")
	}).Order("updated_at desc")
	if entityType := strings.TrimSpace(c.Query("entityType")); entityType != "" {
		entityID := strings.TrimSpace(c.Query("entityId"))
		query = query.Joins("JOIN packaging_profile_targets ppt ON ppt.packaging_profile_id = packaging_profiles.id").Where("ppt.entity_type = ?", entityType)
		if entityID != "" {
			query = query.Where("ppt.entity_id = ?", entityID)
		}
		query = query.Distinct("packaging_profiles.*")
	}
	if err := query.Find(&profiles).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取包装主数据失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, mapPackagingProfileResponses(profiles))
}

func SavePackagingProfileHandler(c *gin.Context) {
	var payload packagingProfilePayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 包装主数据格式错误: " + err.Error()})
		return
	}

	var saved models.PackagingProfile
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		if err := validatePackagingProfilePayload(tx, payload); err != nil {
			return err
		}
		model := mapPackagingProfileModel(payload)
		if model.ID != "" {
			var existing models.PackagingProfile
			if err := tx.Preload("Targets").First(&existing, "id = ?", model.ID).Error; err != nil {
				return err
			}
			existing.Code = model.Code
			existing.Name = model.Name
			existing.PackagingType = model.PackagingType
			existing.Length = model.Length
			existing.Width = model.Width
			existing.Height = model.Height
			existing.DimensionUnitCode = model.DimensionUnitCode
			existing.NetWeight = model.NetWeight
			existing.GrossWeight = model.GrossWeight
			existing.WeightUnitCode = model.WeightUnitCode
			existing.Capacity = model.Capacity
			existing.CapacityUnitCode = model.CapacityUnitCode
			existing.CanRotate = model.CanRotate
			existing.CanInvert = model.CanInvert
			existing.AssemblySource = model.AssemblySource
			existing.IsActive = model.IsActive
			existing.Notes = model.Notes
			if err := tx.Save(&existing).Error; err != nil {
				return err
			}
			if err := tx.Where("packaging_profile_id = ?", existing.ID).Delete(&models.PackagingProfileTarget{}).Error; err != nil {
				return err
			}
			for _, target := range model.Targets {
				target.PackagingProfileID = existing.ID
				if err := tx.Create(&target).Error; err != nil {
					return err
				}
			}
			return tx.Preload("Targets", func(inner *gorm.DB) *gorm.DB {
				return inner.Order("sort_order asc, created_at asc")
			}).First(&saved, "id = ?", existing.ID).Error
		}
		if err := tx.Create(&model).Error; err != nil {
			return err
		}
		return tx.Preload("Targets", func(inner *gorm.DB) *gorm.DB {
			return inner.Order("sort_order asc, created_at asc")
		}).First(&saved, "id = ?", model.ID).Error
	})
	if err != nil {
		switch {
		case strings.Contains(err.Error(), "required") || strings.Contains(err.Error(), "positive") || strings.Contains(err.Error(), "multiple defaults") || strings.Contains(err.Error(), "unit not found"):
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 保存包装主数据失败: " + err.Error()})
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "[NOT_FOUND] 包装主数据不存在"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 保存包装主数据失败: " + err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, mapPackagingProfileResponse(saved))
}

func DeletePackagingProfileHandler(c *gin.Context) {
	id := c.Param("id")
	if strings.TrimSpace(id) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 包装主数据 ID 不能为空"})
		return
	}
	if err := db.DB.Delete(&models.PackagingProfile{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 删除包装主数据失败: " + err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}
