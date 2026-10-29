package handlers

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"xdfc-server/db"
	"xdfc-server/middleware"
	"xdfc-server/security"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"
)

type ChangeAuthenticatedUserPasswordRequest struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

func ChangeAuthenticatedUserPasswordHandler(c *gin.Context) {
	c.Header("Cache-Control", "no-store")
	userID := middleware.GetSafeUserID(c)
	passwordVersion, hasVersion := c.Get("passwordVersion")
	expectedVersion, validVersion := passwordVersion.(int64)
	if userID == "" || !hasVersion || !validVersion {
		writeAuthenticatedUserPasswordChangeFailureResponse(c, http.StatusUnauthorized, "auth_required", "Authentication required")
		return
	}
	var request ChangeAuthenticatedUserPasswordRequest
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 4096)
	decoder := json.NewDecoder(c.Request.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&request); err != nil || request.CurrentPassword == "" || request.NewPassword == "" {
		writeAuthenticatedUserPasswordChangeFailureResponse(c, http.StatusBadRequest, "auth_password_change_invalid_request", "Current and new passwords are required")
		return
	}
	if err := decoder.Decode(new(any)); err != io.EOF {
		writeAuthenticatedUserPasswordChangeFailureResponse(c, http.StatusBadRequest, "auth_password_change_invalid_request", "Invalid password change request")
		return
	}
	err := services.ChangeAuthenticatedUserPassword(auditContextFromGin(c), db.DB, userID, expectedVersion, request.CurrentPassword, request.NewPassword)
	switch {
	case err == nil:
		middleware.ClearAuthTokenCookie(c)
		middleware.ClearCSRFToken(c)
		log.Info().Str("request_id", c.GetString("requestId")).Str("user_id", userID).Msg("AUTH_PASSWORD_CHANGE_SUCCEEDED")
		c.JSON(http.StatusOK, gin.H{"status": "ok", "requiresSignIn": true})
	case errors.Is(err, services.ErrCurrentUserPasswordIncorrect):
		writeAuthenticatedUserPasswordChangeFailureResponse(c, http.StatusUnprocessableEntity, "auth_current_password_incorrect", "Current password is incorrect")
	case errors.Is(err, services.ErrNewUserPasswordUnchanged):
		writeAuthenticatedUserPasswordChangeFailureResponse(c, http.StatusUnprocessableEntity, "auth_new_password_unchanged", "New password must differ from the current password")
	case errors.Is(err, security.ErrNewUserPasswordInvalid):
		writeAuthenticatedUserPasswordChangeFailureResponse(c, http.StatusUnprocessableEntity, "auth_new_password_invalid", security.ErrNewUserPasswordInvalid.Error())
	case errors.Is(err, services.ErrPasswordChangeCredentialsExpired):
		writeAuthenticatedUserPasswordChangeFailureResponse(c, http.StatusUnauthorized, "auth_password_version_expired", "Account credentials have expired; please sign in again")
	default:
		writeAuthenticatedUserPasswordChangeFailureResponse(c, http.StatusInternalServerError, "auth_password_change_failed", "Unable to change password")
	}
}

// Log only stable outcome codes: database errors may include password hash parameters.
func writeAuthenticatedUserPasswordChangeFailureResponse(c *gin.Context, status int, code, message string) {
	event := log.Warn()
	if status >= http.StatusInternalServerError {
		event = log.Error()
	}
	event.Str("request_id", c.GetString("requestId")).Str("user_id", middleware.GetSafeUserID(c)).Str("ip", c.ClientIP()).Int("status", status).Str("code", code).Msg("AUTH_PASSWORD_CHANGE_REJECTED")
	c.JSON(status, gin.H{"error": message, "code": code})
}
