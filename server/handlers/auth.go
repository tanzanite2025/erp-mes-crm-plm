package handlers

import (
	"net/http"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/dependencies"
	"xdfc-server/middleware"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"golang.org/x/crypto/bcrypt"
)

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func maskLoginIdentity(raw string) string {
	value := strings.TrimSpace(raw)
	if value == "" {
		return "unknown"
	}

	if len(value) <= 3 {
		return value
	}

	return value[:2] + "***" + value[len(value)-1:]
}

func loginLogEvent(c *gin.Context) *zerolog.Event {
	return log.Info().
		Str("request_id", c.GetString("requestId")).
		Str("ip", c.ClientIP()).
		Str("origin", c.GetHeader("Origin")).
		Str("user_agent", c.Request.UserAgent())
}

func LoginHandler(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Warn().
			Str("request_id", c.GetString("requestId")).
			Str("ip", c.ClientIP()).
			Err(err).
			Msg("AUTH_LOGIN_INVALID_PAYLOAD")

		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request parameters",
			"code":  "auth_invalid_request",
		})
		return
	}

	loginLogEvent(c).
		Str("login_account", maskLoginIdentity(req.Username)).
		Msg("AUTH_LOGIN_ATTEMPT")

	var user models.User
	if err := db.DB.Where("username = ?", req.Username).First(&user).Error; err != nil {
		log.Warn().
			Str("request_id", c.GetString("requestId")).
			Str("ip", c.ClientIP()).
			Str("login_account", maskLoginIdentity(req.Username)).
			Err(err).
			Msg("AUTH_LOGIN_USER_NOT_FOUND")

		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Account or password incorrect",
			"code":  "auth_invalid_credentials",
		})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		log.Warn().
			Str("request_id", c.GetString("requestId")).
			Str("ip", c.ClientIP()).
			Str("login_account", maskLoginIdentity(req.Username)).
			Msg("AUTH_LOGIN_PASSWORD_MISMATCH")

		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Account or password incorrect",
			"code":  "auth_invalid_credentials",
		})
		return
	}

	accessProfile := dependencies.ResolveEffectiveAccessProfileForUser(user)
	primaryRoleID := strings.TrimSpace(accessProfile.PrimaryRoleID)
	effectiveRolePayload := make([]string, 0, len(accessProfile.EffectiveRoles))
	for _, roleID := range accessProfile.EffectiveRoles {
		normalizedRoleID := strings.TrimSpace(roleID)
		if normalizedRoleID != "" {
			effectiveRolePayload = append(effectiveRolePayload, normalizedRoleID)
		}
	}
	if primaryRoleID == "" && len(effectiveRolePayload) > 0 {
		primaryRoleID = effectiveRolePayload[0]
	}
	rolePayload := []string{}
	if primaryRoleID != "" {
		rolePayload = []string{primaryRoleID}
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":      user.ID,
		"username": user.Username,
		"role":     primaryRoleID,
		"exp":      time.Now().Add(time.Hour * 24).Unix(),
	})

	tokenString, err := token.SignedString(middleware.JwtSecret)
	if err != nil {
		log.Error().
			Str("request_id", c.GetString("requestId")).
			Str("ip", c.ClientIP()).
			Str("login_account", maskLoginIdentity(req.Username)).
			Err(err).
			Msg("AUTH_LOGIN_TOKEN_SIGN_FAILED")

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to generate token",
			"code":  "auth_token_issue",
		})
		return
	}

	loginLogEvent(c).
		Str("login_account", maskLoginIdentity(req.Username)).
		Str("user_id", user.ID).
		Str("role", primaryRoleID).
		Msg("AUTH_LOGIN_SUCCESS")

	c.JSON(http.StatusOK, gin.H{
		"accessToken": tokenString,
		"user": gin.H{
			"id":             user.ID,
			"username":       user.Username,
			"email":          user.Email,
			"employeeId":     user.EmployeeID,
			"role":           rolePayload,
			"effectiveRoles": effectiveRolePayload,
			"permissions":    []string{}, // 登录时不预载业务权限，由前端背景同步完成
		},
	})
}

func GetAuthSnapshotHandler(c *gin.Context) {
	userID, _ := c.Get("userId")
	username, _ := c.Get("username")
	role, _ := c.Get("role")
	effectiveRoles, _ := c.Get("effectiveRoles")
	status, _ := c.Get("status")
	permissions, _ := c.Get("permissions")

	type profileUserRecord struct {
		Email      string
		EmployeeID string
	}

	profileUser := profileUserRecord{}
	if normalizedUserID, ok := userID.(string); ok {
		normalizedUserID = strings.TrimSpace(normalizedUserID)
		if normalizedUserID != "" && db.DB != nil {
			_ = db.DB.Model(&profileUserRecord{}).
				Table("users").
				Select("email", "employee_id").
				Where("id = ?", normalizedUserID).
				Take(&profileUser).Error
		}
	}

	roleID, _ := role.(string)
	roleID = strings.TrimSpace(roleID)
	roleList := make([]string, 0, 1)
	if roleID != "" {
		roleList = append(roleList, roleID)
	}

	effectiveRoleList, ok := effectiveRoles.([]string)
	if !ok {
		effectiveRoleList = nil
	}

	permissionList, ok := permissions.([]string)
	if !ok {
		permissionList = []string{}
	}

	c.JSON(http.StatusOK, gin.H{
		"id":             userID,
		"username":       username,
		"email":          strings.TrimSpace(profileUser.Email),
		"employeeId":     strings.TrimSpace(profileUser.EmployeeID),
		"role":           roleList,
		"status":         status,
		"effectiveRoles": effectiveRoleList,
		"permissions":    permissionList,
	})
}
