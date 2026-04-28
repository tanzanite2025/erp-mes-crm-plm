package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"xdfc-server/authz"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type RolePayload struct {
	ID          string   `json:"id" binding:"required"`
	Label       string   `json:"label"`
	Color       string   `json:"color"`
	Permissions []string `json:"permissions"`
}

type RoleResponse struct {
	ID          string   `json:"id"`
	Label       string   `json:"label"`
	Color       string   `json:"color"`
	Permissions []string `json:"permissions"`
}

func normalizeRolePermissionIDs(permissionIDs []string) []string {
	return authz.DeduplicatePermissionIDs(permissionIDs)
}

func serializeRolePermissionIDs(permissionIDs []string) string {
	payload, err := json.Marshal(normalizeRolePermissionIDs(permissionIDs))
	if err != nil {
		return "[]"
	}
	return string(payload)
}

func buildRoleResponse(role models.Role) RoleResponse {
	return RoleResponse{
		ID:          strings.ToLower(strings.TrimSpace(role.RoleID)),
		Label:       strings.TrimSpace(role.Label),
		Color:       strings.TrimSpace(role.Color),
		Permissions: authz.ParsePermissionIDs(role.Permissions),
	}
}

func isProtectedRoleID(roleID string) bool {
	normalized := strings.ToLower(strings.TrimSpace(roleID))
	return normalized == "admin"
}

func GetRolesHandler(c *gin.Context) {
	var roles []models.Role
	if err := db.DB.Order("created_at asc").Find(&roles).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load roles"})
		return
	}

	response := make([]RoleResponse, 0, len(roles))
	for _, role := range roles {
		response = append(response, buildRoleResponse(role))
	}

	c.JSON(http.StatusOK, response)
}

func UpsertRoleHandler(c *gin.Context) {
	var input RolePayload
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid role payload: " + err.Error()})
		return
	}

	input.ID = strings.TrimSpace(input.ID)
	if input.ID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid role payload: role id is required"})
		return
	}

	normalizedRoleID := strings.ToLower(input.ID)
	payloadPermissions := normalizeRolePermissionIDs(input.Permissions)

	var existing models.Role
	result := db.DB.Unscoped().Where("LOWER(role_id) = ?", normalizedRoleID).First(&existing)
	if result.Error == nil {
		updates := map[string]any{
			"permissions": serializeRolePermissionIDs(payloadPermissions),
			"deleted_at":  nil,
		}
		if !isProtectedRoleID(existing.RoleID) {
			updates["label"] = strings.TrimSpace(input.Label)
			updates["color"] = strings.TrimSpace(input.Color)
		}
		if err := db.DB.Unscoped().Model(&existing).Updates(updates).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update role"})
			return
		}
		if err := db.DB.Where("id = ?", existing.ID).First(&existing).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to reload role"})
			return
		}
		c.JSON(http.StatusOK, buildRoleResponse(existing))
		return
	}

	if !errors.Is(result.Error, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query role"})
		return
	}

	created := models.Role{
		RoleID:      normalizedRoleID,
		Label:       strings.TrimSpace(input.Label),
		Color:       strings.TrimSpace(input.Color),
		Permissions: serializeRolePermissionIDs(payloadPermissions),
	}
	if created.Color == "" {
		created.Color = "bg-slate-500/10 text-slate-600 border-slate-200"
	}

	if err := db.DB.Create(&created).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create role"})
		return
	}
	c.JSON(http.StatusOK, buildRoleResponse(created))
}

func DeleteRoleHandler(c *gin.Context) {
	normalizedID := strings.ToLower(strings.TrimSpace(c.Param("id")))
	if normalizedID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "role id is required"})
		return
	}
	if isProtectedRoleID(normalizedID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "protected role cannot be deleted"})
		return
	}

	if err := db.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.User{}).Where("LOWER(role) = ?", normalizedID).Update("role", "").Error; err != nil {
			return err
		}
		return tx.Where("LOWER(role_id) = ?", normalizedID).Delete(&models.Role{}).Error
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete role"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "role deleted"})
}
