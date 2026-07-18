package handlers

import (
	"errors"
	"net/http"
	"strings"
	"xdfc-server/authz"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
)

type CreateUserRequest struct {
	Username       string `json:"username" binding:"required"`
	Password       string `json:"password" binding:"required"`
	Email          string `json:"email"`
	PhoneNumber    string `json:"phoneNumber"`
	FirstName      string `json:"firstName"`
	LastName       string `json:"lastName"`
	Status         string `json:"status"`
	Role           string `json:"role"`
	EmployeeID     string `json:"employeeId"`
	AdminChallenge string `json:"adminChallenge"`
}

func CreateUserHandler(c *gin.Context) {
	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	req.Username = strings.TrimSpace(req.Username)
	if req.Username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] username cannot be empty"})
		return
	}

	req.EmployeeID = strings.TrimSpace(req.EmployeeID)
	if req.EmployeeID != "" && !hasContextPermission(c, authz.PermissionManage) {
		c.JSON(http.StatusForbidden, gin.H{"error": "[SECURITY] Only permission administrators can bind employee identities"})
		return
	}
	isSeedAdmin := strings.EqualFold(req.Username, "admin")
	normalizedRole := strings.ToLower(strings.TrimSpace(req.Role))
	if isSeedAdmin {
		normalizedRole = "admin"
		req.Status = "active"
	}
	if isSeedAdmin || normalizedRole == "admin" {
		if !hasContextPermission(c, authz.PermissionManage) {
			c.JSON(http.StatusForbidden, gin.H{"error": "[SECURITY] Only permission administrators can create admin accounts"})
			return
		}
		if err := verifyCurrentUserAdminChallenge(c, req.AdminChallenge); err != nil {
			writeAdminChallengeError(c, err)
			return
		}
	}
	if normalizedRole != "" && !hasContextPermission(c, authz.PermissionManage) {
		c.JSON(http.StatusForbidden, gin.H{"error": "[SECURITY] Only admin can assign account roles during user creation"})
		return
	}

	hashedPassword, err := hashUserPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] password must be plain text and non-empty"})
		return
	}

	user := models.User{
		Username:    req.Username,
		Password:    hashedPassword,
		Email:       req.Email,
		PhoneNumber: req.PhoneNumber,
		FirstName:   req.FirstName,
		LastName:    req.LastName,
		Status:      req.Status,
		IsProtected: isSeedAdmin,
		Role:        normalizedRole,
		EmployeeID:  req.EmployeeID,
	}
	if strings.TrimSpace(user.ID) == "" {
		user.ID = uuid.NewString()
	}

	created, err := services.CreateUser(auditContextFromGin(c), user)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrUserUsernameConflict):
			c.JSON(http.StatusConflict, gin.H{"error": "[CONFLICT] username is already in use"})
		case errors.Is(err, services.ErrProtectedUserMutation):
			c.JSON(http.StatusForbidden, gin.H{"error": "[SECURITY] protected account cannot be replaced"})
		case errors.Is(err, services.ErrUserEmployeeBindingTargetNotFound):
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] employee does not exist"})
		case errors.Is(err, services.ErrUserEmployeeAlreadyBound):
			c.JSON(http.StatusConflict, gin.H{"error": "[CONFLICT] employee is already bound to another account"})
		case errors.Is(err, services.ErrUserRoleNotFound), errors.Is(err, services.ErrUserRoleInvalidPayload):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		default:
			log.Error().
				Err(err).
				Str("request_id", c.GetString("requestId")).
				Msg("USER_CREATE_FAILED")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		}
		return
	}
	c.JSON(http.StatusCreated, mapUserToResponse(created))
}
