package handlers

import (
	"net/http"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/middleware"
	"xdfc-server/models"
	access "xdfc-server/services/access"

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
	if !strings.EqualFold(strings.TrimSpace(user.Status), "active") {
		log.Warn().
			Str("request_id", c.GetString("requestId")).
			Str("ip", c.ClientIP()).
			Str("user_id", user.ID).
			Msg("AUTH_LOGIN_ACCOUNT_INACTIVE")

		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Account is inactive",
			"code":  "auth_account_inactive",
		})
		return
	}

	accessSnapshot, err := access.NewIdentityAccessServiceWithDB(db.DB).ResolveSnapshotForUser(user)
	if err != nil {
		log.Error().
			Str("request_id", c.GetString("requestId")).
			Str("ip", c.ClientIP()).
			Str("login_account", maskLoginIdentity(req.Username)).
			Err(err).
			Msg("AUTH_LOGIN_ACCESS_SNAPSHOT_FAILED")

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to resolve account access",
			"code":  "auth_access_snapshot_failed",
		})
		return
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":      user.ID,
		"username": user.Username,
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
		Int("permission_count", len(accessSnapshot.Permissions)).
		Msg("AUTH_LOGIN_SUCCESS")

	// 设置 CSRF Token
	if err := middleware.SetCSRFToken(c); err != nil {
		log.Error().
			Str("request_id", c.GetString("requestId")).
			Str("user_id", user.ID).
			Err(err).
			Msg("AUTH_LOGIN_CSRF_TOKEN_FAILED")
		// CSRF Token 设置失败不影响登录,继续返回
	}

	middleware.SetAuthTokenCookie(c, tokenString)
	c.JSON(http.StatusOK, gin.H{
		"accessToken": tokenString,
		"user": gin.H{
			"id":          user.ID,
			"username":    user.Username,
			"email":       user.Email,
			"employeeId":  user.EmployeeID,
			"permissions": accessSnapshot.Permissions,
		},
	})
}

func LogoutHandler(c *gin.Context) {
	middleware.ClearAuthTokenCookie(c)
	middleware.ClearCSRFToken(c)
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func GetAuthSnapshotHandler(c *gin.Context) {
	userID, _ := c.Get("userId")
	username, _ := c.Get("username")
	status, _ := c.Get("status")
	permissions, _ := c.Get("permissions")
	accessSnapshotRaw, hasAccessSnapshot := c.Get("accessSnapshot")

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

	permissionList, ok := permissions.([]string)
	if !ok {
		permissionList = []string{}
	}

	diagnostics := []string{}
	if hasAccessSnapshot {
		if snapshot, ok := accessSnapshotRaw.(access.IdentityAccessSnapshot); ok {
			if len(snapshot.Permissions) > 0 {
				permissionList = append([]string(nil), snapshot.Permissions...)
			}
			diagnostics = append(diagnostics, snapshot.Diagnostics...)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"id":          userID,
		"username":    username,
		"email":       strings.TrimSpace(profileUser.Email),
		"employeeId":  strings.TrimSpace(profileUser.EmployeeID),
		"status":      status,
		"permissions": permissionList,
		"diagnostics": diagnostics,
	})
}
