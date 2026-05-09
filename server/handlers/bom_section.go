package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var errBOMSectionDeleteProtected = errors.New("bom section is system protected")
var errBOMSectionDeleteLinked = errors.New("bom section is linked by bom items")
var errBOMSectionIdentifierConflict = errors.New("bom section identifier conflict")
var errBOMSectionRequiresActive = errors.New("at least one active BOM section is required")

func GetBOMSectionsHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	query := db.DB.Model(&models.BOMSection{})

	var total int64
	if err := query.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to count BOM sections: " + err.Error()})
		return
	}

	var items []models.BOMSection
	if err := query.Order("sort_order asc, code asc").Limit(pageSize).Offset((page - 1) * pageSize).Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to load BOM sections: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, BOMSectionListResponse{
		Items:    mapBOMSectionsToResponse(items),
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	})
}

func GetBOMSectionOptionsHandler(c *gin.Context) {
	var items []models.BOMSection
	if err := db.DB.Order("sort_order asc, code asc").Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to load BOM section options: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, mapBOMSectionOptions(items))
}

func SaveBOMSectionHandler(c *gin.Context) {
	var input BOMSectionRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid BOM section payload"})
		return
	}

	section := mapBOMSectionRequestToModel(input)
	section.IsSystem = false
	normalizeBOMSectionConfig(&section)
	if err := validateBOMSection(section); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := db.DB.Transaction(func(tx *gorm.DB) error {
		lockedSections, err := loadLockedBOMSections(tx)
		if err != nil {
			return err
		}
		if err := validateBOMSectionUniqueness(section, lockedSections, ""); err != nil {
			return err
		}
		if err := tx.Create(&section).Error; err != nil {
			return err
		}
		return syncBOMSectionDefaults(tx, section.ID, section)
	}); err != nil {
		switch {
		case errors.Is(err, errBOMSectionIdentifierConflict), errors.Is(err, errBOMSectionRequiresActive):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to create BOM section: " + err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, mapBOMSectionToResponse(section))
}

func PatchBOMSectionHandler(c *gin.Context) {
	id := c.Param("id")

	var req services.SDRTSDeltaHandlerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid BOM section patch payload: " + err.Error()})
		return
	}
	if err := validateSupportedTopLevelDeltaKeys(
		req.Delta,
		"name",
		"description",
		"active",
		"sortOrder",
		"isDefault",
	); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid BOM section delta: " + err.Error()})
		return
	}

	var updated models.BOMSection
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var section models.BOMSection
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&section, "id = ?", id).Error; err != nil {
			return err
		}

		if int64(optimisticVersionForResponse(section.UpdatedAt, section.CreatedAt)) != req.Metadata.Version {
			return ErrVersionConflict
		}

		next := section
		for key, raw := range req.Delta {
			valueRaw, err := extractDeltaNewValue(raw)
			if err != nil {
				return errors.New("invalid BOM section delta item")
			}

			switch key {
			case "name":
				var value string
				if err := json.Unmarshal(valueRaw, &value); err != nil {
					return errors.New("invalid BOM section name payload")
				}
				legacyNames := parseBOMSectionStringSlice(next.LegacyNames)
				legacyNames = append(legacyNames, section.Name)
				next.LegacyNames = marshalBOMSectionStringSlice(legacyNames)
				next.Name = value
			case "description":
				var value string
				if err := json.Unmarshal(valueRaw, &value); err != nil {
					return errors.New("invalid BOM section description payload")
				}
				next.Description = value
			case "active":
				var value bool
				if err := json.Unmarshal(valueRaw, &value); err != nil {
					return errors.New("invalid BOM section active payload")
				}
				next.Active = value
			case "sortOrder":
				var value int
				if err := json.Unmarshal(valueRaw, &value); err != nil {
					return errors.New("invalid BOM section sortOrder payload")
				}
				next.SortOrder = value
			case "isDefault":
				var value bool
				if err := json.Unmarshal(valueRaw, &value); err != nil {
					return errors.New("invalid BOM section isDefault payload")
				}
				next.IsDefault = value
			}
		}

		normalizeBOMSectionConfig(&next)
		if err := validateBOMSection(next); err != nil {
			return err
		}
		lockedSections, err := loadLockedBOMSections(tx)
		if err != nil {
			return err
		}
		if err := validateBOMSectionUniqueness(next, lockedSections, section.ID); err != nil {
			return err
		}

		updates := diffBOMSectionFields(section, next)
		if len(updates) == 0 {
			updated = section
			return nil
		}

		if err := tx.Model(&section).Updates(updates).Error; err != nil {
			return err
		}
		if err := syncBOMSectionDefaults(tx, section.ID, next); err != nil {
			return err
		}
		return tx.First(&updated, "id = ?", id).Error
	})

	switch {
	case err == nil:
		c.JSON(http.StatusOK, mapBOMSectionToResponse(updated))
	case errors.Is(err, gorm.ErrRecordNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "bom section not found"})
	case errors.Is(err, ErrVersionConflict):
		respondVersionConflict(c)
	case errors.Is(err, errBOMSectionIdentifierConflict), errors.Is(err, errBOMSectionRequiresActive):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "[SERVER] failed to patch BOM section: " + err.Error()})
	}
}

func DeleteBOMSectionHandler(c *gin.Context) {
	id := c.Param("id")

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var section models.BOMSection
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ?", id).First(&section).Error; err != nil {
			return err
		}
		if section.IsSystem {
			return errBOMSectionDeleteProtected
		}

		candidates := buildBOMSectionReferenceCandidates(section)
		if len(candidates) > 0 {
			var linkedCount int64
			if err := tx.Model(&models.BOMItem{}).Where("section IN ?", candidates).Count(&linkedCount).Error; err != nil {
				return err
			}
			if linkedCount > 0 {
				return errBOMSectionDeleteLinked
			}
		}

		if err := tx.Delete(&section).Error; err != nil {
			return err
		}
		return ensureBOMSectionActiveSelection(tx)
	})

	switch {
	case err == nil:
		c.JSON(http.StatusOK, gin.H{"message": "bom section deleted"})
	case errors.Is(err, gorm.ErrRecordNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "bom section not found"})
	case errors.Is(err, errBOMSectionDeleteProtected):
		c.JSON(http.StatusForbidden, gin.H{"error": "系统 BOM section 不允许删除"})
	case errors.Is(err, errBOMSectionDeleteLinked):
		c.JSON(http.StatusBadRequest, gin.H{"error": "BOM section 已被配方引用，无法删除"})
	case errors.Is(err, errBOMSectionRequiresActive):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to delete BOM section: " + err.Error()})
	}
}

func normalizeBOMSectionToken(value string) string {
	return strings.ToUpper(strings.Join(strings.Fields(strings.TrimSpace(value)), ""))
}

func normalizeBOMSectionCode(value string) string {
	return normalizeBOMSectionToken(value)
}

func normalizeBOMSectionConfig(section *models.BOMSection) {
	section.Code = normalizeBOMSectionCode(section.Code)
	section.Name = strings.TrimSpace(section.Name)
	section.Description = strings.TrimSpace(section.Description)
	legacyNames := parseBOMSectionStringSlice(section.LegacyNames)
	legacyNames = append(legacyNames, section.Name)
	section.LegacyNames = marshalBOMSectionStringSlice(legacyNames)
	if !section.Active {
		section.IsDefault = false
	}
	if section.IsDefault {
		section.Active = true
	}
}

func validateBOMSection(section models.BOMSection) error {
	if section.Code == "" {
		return errors.New("bom section code is required")
	}
	if section.Name == "" {
		return errors.New("bom section name is required")
	}
	return nil
}

func loadLockedBOMSections(tx *gorm.DB) ([]models.BOMSection, error) {
	var sections []models.BOMSection
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Order("sort_order asc, code asc").Find(&sections).Error; err != nil {
		return nil, err
	}
	return sections, nil
}

func buildBOMSectionIdentityTokens(section models.BOMSection) map[string]string {
	tokens := map[string]string{}
	values := append([]string{section.Code, section.Name}, parseBOMSectionStringSlice(section.LegacyNames)...)
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		normalized := normalizeBOMSectionToken(trimmed)
		if normalized == "" {
			continue
		}
		if _, exists := tokens[normalized]; exists {
			continue
		}
		tokens[normalized] = trimmed
	}
	return tokens
}

func validateBOMSectionUniqueness(candidate models.BOMSection, sections []models.BOMSection, currentID string) error {
	candidateTokens := buildBOMSectionIdentityTokens(candidate)
	for _, existing := range sections {
		if currentID != "" && existing.ID == currentID {
			continue
		}
		existingTokens := buildBOMSectionIdentityTokens(existing)
		for normalized, candidateValue := range candidateTokens {
			if existingValue, exists := existingTokens[normalized]; exists {
				return fmt.Errorf("%w: %s conflicts with existing section %s (%s)", errBOMSectionIdentifierConflict, candidateValue, existing.Code, existingValue)
			}
		}
	}
	return nil
}

func diffBOMSectionFields(current models.BOMSection, next models.BOMSection) map[string]interface{} {
	updates := map[string]interface{}{}
	if current.Name != next.Name {
		updates["name"] = next.Name
	}
	if current.Description != next.Description {
		updates["description"] = next.Description
	}
	if current.Active != next.Active {
		updates["active"] = next.Active
	}
	if current.SortOrder != next.SortOrder {
		updates["sort_order"] = next.SortOrder
	}
	if current.IsDefault != next.IsDefault {
		updates["is_default"] = next.IsDefault
	}
	if string(current.LegacyNames) != string(next.LegacyNames) {
		updates["legacy_names"] = next.LegacyNames
	}
	return updates
}

func syncBOMSectionDefaults(tx *gorm.DB, currentID string, section models.BOMSection) error {
	if section.IsDefault {
		if err := tx.Model(&models.BOMSection{}).
			Where("id <> ?", currentID).
			Update("is_default", false).Error; err != nil {
			return err
		}
	}
	return ensureBOMSectionActiveSelection(tx)
}

func ensureBOMSectionActiveSelection(tx *gorm.DB) error {
	var activeCount int64
	if err := tx.Model(&models.BOMSection{}).Where("active = ?", true).Count(&activeCount).Error; err != nil {
		return err
	}
	if activeCount == 0 {
		return errBOMSectionRequiresActive
	}
	return ensureBOMSectionDefaultSelection(tx)
}

func ensureBOMSectionDefaultSelection(tx *gorm.DB) error {
	var count int64
	if err := tx.Model(&models.BOMSection{}).Where("is_default = ? AND active = ?", true, true).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	var fallback models.BOMSection
	if err := tx.Where("active = ?", true).Order("sort_order asc, code asc").First(&fallback).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errBOMSectionRequiresActive
		}
		return err
	}

	return tx.Model(&fallback).Updates(map[string]interface{}{"is_default": true, "active": true}).Error
}

func buildBOMSectionReferenceCandidates(section models.BOMSection) []string {
	candidates := []string{section.Code, section.Name}
	for _, legacyName := range parseBOMSectionStringSlice(section.LegacyNames) {
		candidates = append(candidates, legacyName)
	}
	return normalizeBOMSectionStringSlice(candidates)
}
