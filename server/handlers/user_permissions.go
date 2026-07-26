package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type userPermissionItemResponse struct {
	PermissionID string `json:"permissionId"`
	Source       string `json:"source,omitempty"`
	GrantedBy    string `json:"grantedBy,omitempty"`
	UpdatedAt    string `json:"updatedAt,omitempty"`
}

type getUserPermissionsResponse struct {
	UserID               string                       `json:"userId"`
	Username             string                       `json:"username"`
	Status               string                       `json:"status"`
	EmployeeID           string                       `json:"employeeId,omitempty"`
	PermissionPresetID   string                       `json:"permissionPresetId,omitempty"`
	Permissions          []userPermissionItemResponse `json:"permissions"`
	PresetPermissions    []string                     `json:"presetPermissions"`
	EffectivePermissions []string                     `json:"effectivePermissions"`
	Total                int                          `json:"total"`
}

type replaceUserPermissionsRequest struct {
	Permissions []string `json:"permissions"`
	Reason      string   `json:"reason"`
}

type replaceUserPermissionsResponse struct {
	UserID        string   `json:"userId"`
	Permissions   []string `json:"permissions"`
	ChangeSummary struct {
		Added     int `json:"added"`
		Removed   int `json:"removed"`
		Unchanged int `json:"unchanged"`
	} `json:"changeSummary"`
}

func buildUserPermissionsResponse(view services.UserPermissionsView) getUserPermissionsResponse {
	permissions := make([]userPermissionItemResponse, 0, len(view.Permissions))
	for _, item := range view.Permissions {
		updatedAt := ""
		if !item.UpdatedAt.IsZero() {
			updatedAt = item.UpdatedAt.UTC().Format("2006-01-02T15:04:05Z")
		}
		permissions = append(permissions, userPermissionItemResponse{
			PermissionID: item.PermissionID,
			Source:       item.Source,
			GrantedBy:    item.GrantedBy,
			UpdatedAt:    updatedAt,
		})
	}

	return getUserPermissionsResponse{
		UserID:               view.UserID,
		Username:             view.Username,
		Status:               view.Status,
		EmployeeID:           view.EmployeeID,
		PermissionPresetID:   view.PermissionPresetID,
		Permissions:          permissions,
		PresetPermissions:    append([]string(nil), view.PresetPermissionIDs...),
		EffectivePermissions: append([]string(nil), view.EffectivePermissionIDs...),
		Total:                len(permissions),
	}
}

func GetUserPermissionsHandler(c *gin.Context) {
	userID := strings.TrimSpace(c.Param("id"))
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] user id is required"})
		return
	}

	view, err := services.GetUserPermissions(userID)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrUserPermissionsUserNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		case errors.Is(err, gorm.ErrInvalidDB):
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load user permissions"})
			return
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load user permissions"})
			return
		}
	}

	c.JSON(http.StatusOK, buildUserPermissionsResponse(view))
}

func ReplaceUserPermissionsHandler(c *gin.Context) {
	userID := strings.TrimSpace(c.Param("id"))
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] user id is required"})
		return
	}

	var input replaceUserPermissionsRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	grantedBy, _ := c.Get("userId")
	result, err := services.ReplaceUserPermissions(auditContextFromGin(c), userID, services.ReplaceUserPermissionsInput{
		PermissionIDs: input.Permissions,
		Source:        "manual",
		Reason:        input.Reason,
		GrantedBy:     strings.TrimSpace(toString(grantedBy)),
	})
	if err != nil {
		switch {
		case errors.Is(err, services.ErrUserPermissionsUserNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		case errors.Is(err, services.ErrUserPermissionsInvalidPayload):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		case errors.Is(err, services.ErrProtectedUserMutation):
			c.JSON(http.StatusForbidden, gin.H{"error": "Protected account permissions cannot be modified"})
			return
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to replace user permissions"})
			return
		}
	}

	response := replaceUserPermissionsResponse{
		UserID:      result.UserID,
		Permissions: result.Permissions,
	}
	response.ChangeSummary.Added = result.Added
	response.ChangeSummary.Removed = result.Removed
	response.ChangeSummary.Unchanged = result.Unchanged
	c.JSON(http.StatusOK, response)
}

func toString(value any) string {
	if value == nil {
		return ""
	}
	return strings.TrimSpace(fmt.Sprint(value))
}
