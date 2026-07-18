package handlers

import (
	"errors"
	"net/http"
	"strings"
	"xdfc-server/authz"
	"xdfc-server/db"
	"xdfc-server/middleware"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

type VerifyAdminChallengeRequest struct {
	Passcode string `json:"passcode" binding:"required"`
}

var (
	errAdminChallengeMissing      = errors.New("admin challenge is required")
	errAdminChallengeUnauthorized = errors.New("admin challenge user is unavailable")
	errAdminChallengeInactive     = errors.New("admin challenge user is inactive")
	errAdminChallengeInvalid      = errors.New("admin challenge is invalid")
)

func verifyCurrentUserAdminChallenge(c *gin.Context, rawPasscode string) error {
	passcode := strings.TrimSpace(rawPasscode)
	if passcode == "" {
		return errAdminChallengeMissing
	}

	currentUserID := strings.TrimSpace(middleware.GetSafeUserID(c))
	if currentUserID == "" {
		return errAdminChallengeUnauthorized
	}

	var currentUser models.User
	if err := db.DB.Select("id", "password", "status").First(&currentUser, "id = ?", currentUserID).Error; err != nil {
		return errAdminChallengeUnauthorized
	}
	if !strings.EqualFold(strings.TrimSpace(currentUser.Status), "active") {
		return errAdminChallengeInactive
	}
	if err := bcrypt.CompareHashAndPassword([]byte(currentUser.Password), []byte(passcode)); err != nil {
		return errAdminChallengeInvalid
	}
	return nil
}

func writeAdminChallengeError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, errAdminChallengeMissing):
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] passcode is required"})
	case errors.Is(err, errAdminChallengeInactive):
		c.JSON(http.StatusForbidden, gin.H{"error": "[SECURITY] Current user is not active"})
	case errors.Is(err, errAdminChallengeUnauthorized):
		c.JSON(http.StatusUnauthorized, gin.H{"error": "[SECURITY] Current user not found"})
	default:
		c.JSON(http.StatusForbidden, gin.H{"error": "[SECURITY] Invalid admin challenge"})
	}
}

func VerifyAdminChallengeHandler(c *gin.Context) {
	if !hasContextPermission(c, authz.PermissionManage) {
		c.JSON(http.StatusForbidden, gin.H{"error": "[SECURITY] Only admin can verify protected account actions"})
		return
	}

	var req VerifyAdminChallengeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] passcode is required"})
		return
	}
	if err := verifyCurrentUserAdminChallenge(c, req.Passcode); err != nil {
		writeAdminChallengeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
