package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"xdfc-server/authz"
	"xdfc-server/db"
	"xdfc-server/dependencies"
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
	return authz.ParsePermissionIDs(strings.Join(permissionIDs, ","))
}

func serializeRolePermissionIDs(permissionIDs []string) string {
	payload, err := json.Marshal(permissionIDs)
	if err != nil {
		return "[]"
	}
	return string(payload)
}

func buildRoleResponse(role models.Role) RoleResponse {
	return RoleResponse{
		ID:          strings.ToLower(strings.TrimSpace(role.RoleID)),
		Label:       role.Label,
		Color:       role.Color,
		Permissions: dependencies.ResolvePermissionsForRole(role.RoleID),
	}
}

func isProtectedRoleID(roleID string) bool {
	normalized := strings.ToLower(strings.TrimSpace(roleID))
	return normalized == "admin" || strings.HasPrefix(normalized, "org_")
}

// GetRolesHandler returns all roles.
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

// UpsertRoleHandler creates or updates a role.
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
	normalizedPermissions := normalizeRolePermissionIDs(input.Permissions)

	var existing models.Role
	result := db.DB.Unscoped().Where("LOWER(role_id) = ?", normalizedRoleID).First(&existing)

	if result.Error == nil {
		if !isProtectedRoleID(existing.RoleID) {
			existing.Label = input.Label
			existing.Color = input.Color
		}
		existing.Permissions = serializeRolePermissionIDs(normalizedPermissions)
		if err := db.DB.Unscoped().Model(&existing).Updates(map[string]interface{}{
			"label":       existing.Label,
			"color":       existing.Color,
			"permissions": existing.Permissions,
			"deleted_at":  nil, // 恢复软删除
		}).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update role"})
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
		Label:       input.Label,
		Color:       input.Color,
		Permissions: serializeRolePermissionIDs(normalizedPermissions),
	}

	if err := db.DB.Create(&created).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create role"})
		return
	}
	c.JSON(http.StatusOK, buildRoleResponse(created))
}

// DeleteRoleHandler deletes role by role id.
func DeleteRoleHandler(c *gin.Context) {
	id := c.Param("id")
	normalizedID := strings.ToLower(strings.TrimSpace(id))
	if isProtectedRoleID(normalizedID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "protected role cannot be deleted"})
		return
	}

	if err := db.DB.Transaction(func(tx *gorm.DB) error {
		return tx.Where("role_id = ?", normalizedID).Delete(&models.Role{}).Error
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete role"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "role deleted"})
}
