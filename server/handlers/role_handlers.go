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
	saved, err := services.UpsertRole(auditContextFromGin(c), models.Role{
		RoleID:      normalizedRoleID,
		Label:       strings.TrimSpace(input.Label),
		Color:       strings.TrimSpace(input.Color),
		Permissions: serializeRolePermissionIDs(payloadPermissions),
	})
	if err != nil {
		if errors.Is(err, services.ErrProtectedRoleMutation) {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		if errors.Is(err, services.ErrRoleInvalidPayload) {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create role"})
		return
	}
	c.JSON(http.StatusOK, buildRoleResponse(saved))
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

	if err := services.DeleteRole(auditContextFromGin(c), normalizedID); err != nil {
		if errors.Is(err, services.ErrProtectedRoleMutation) {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete role"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "role deleted"})
}
