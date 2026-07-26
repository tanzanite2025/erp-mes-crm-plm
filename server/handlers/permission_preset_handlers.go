package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"xdfc-server/authz"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

type PermissionPresetPayload struct {
	ID          string   `json:"id" binding:"required"`
	Label       string   `json:"label"`
	Color       string   `json:"color"`
	Permissions []string `json:"permissions"`
}

type PermissionPresetResponse struct {
	ID          string   `json:"id"`
	Label       string   `json:"label"`
	Color       string   `json:"color"`
	Permissions []string `json:"permissions"`
}

func normalizePermissionPresetPermissionIDs(permissionIDs []string) []string {
	return authz.DeduplicatePermissionIDs(permissionIDs)
}

func serializePermissionPresetPermissionIDs(permissionIDs []string) string {
	payload, err := json.Marshal(normalizePermissionPresetPermissionIDs(permissionIDs))
	if err != nil {
		return "[]"
	}
	return string(payload)
}

func buildPermissionPresetResponse(permissionPreset models.PermissionPreset) PermissionPresetResponse {
	return PermissionPresetResponse{
		ID:          strings.ToLower(strings.TrimSpace(permissionPreset.PermissionPresetID)),
		Label:       strings.TrimSpace(permissionPreset.Label),
		Color:       strings.TrimSpace(permissionPreset.Color),
		Permissions: authz.ParsePermissionIDs(permissionPreset.Permissions),
	}
}

func isProtectedPermissionPresetID(permissionPresetID string) bool {
	normalized := strings.ToLower(strings.TrimSpace(permissionPresetID))
	return normalized == "admin"
}

func GetPermissionPresetsHandler(c *gin.Context) {
	var permissionPresets []models.PermissionPreset
	if err := db.DB.Order("created_at asc").Find(&permissionPresets).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load permission presets"})
		return
	}

	response := make([]PermissionPresetResponse, 0, len(permissionPresets))
	for _, permissionPreset := range permissionPresets {
		response = append(response, buildPermissionPresetResponse(permissionPreset))
	}

	c.JSON(http.StatusOK, response)
}

func UpsertPermissionPresetHandler(c *gin.Context) {
	var input PermissionPresetPayload
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid permission preset payload: " + err.Error()})
		return
	}

	input.ID = strings.TrimSpace(input.ID)
	if input.ID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid permission preset payload: id is required"})
		return
	}

	normalizedPermissionPresetID := strings.ToLower(input.ID)
	payloadPermissions := normalizePermissionPresetPermissionIDs(input.Permissions)
	saved, err := services.UpsertPermissionPreset(auditContextFromGin(c), models.PermissionPreset{
		PermissionPresetID: normalizedPermissionPresetID,
		Label:              strings.TrimSpace(input.Label),
		Color:              strings.TrimSpace(input.Color),
		Permissions:        serializePermissionPresetPermissionIDs(payloadPermissions),
	})
	if err != nil {
		if errors.Is(err, services.ErrProtectedPermissionPresetMutation) {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		if errors.Is(err, services.ErrPermissionPresetInvalidPayload) {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save permission preset"})
		return
	}
	c.JSON(http.StatusOK, buildPermissionPresetResponse(saved))
}

func DeletePermissionPresetHandler(c *gin.Context) {
	normalizedID := strings.ToLower(strings.TrimSpace(c.Param("id")))
	if normalizedID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "permission preset id is required"})
		return
	}
	if isProtectedPermissionPresetID(normalizedID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "protected permission preset cannot be deleted"})
		return
	}

	if err := services.DeletePermissionPreset(auditContextFromGin(c), normalizedID); err != nil {
		if errors.Is(err, services.ErrProtectedPermissionPresetMutation) {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete permission preset"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "permission preset deleted"})
}
