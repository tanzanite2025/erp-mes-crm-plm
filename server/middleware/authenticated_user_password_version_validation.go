package middleware

import (
	"context"
	"encoding/json"
	"errors"
	"math"
	"strconv"
	"strings"
	"xdfc-server/models"

	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

var ErrAccountPasswordVersionInvalid = errors.New("account credentials have expired; please sign in again")

// PasswordVersionFromJWTClaims only accepts nonnegative integral JSON numbers.
// Legacy tokens without a version belong to version zero, never the current version.
func PasswordVersionFromJWTClaims(claims jwt.MapClaims) (int64, error) {
	raw, exists := claims["passwordVersion"]
	if !exists {
		return 0, nil
	}
	switch value := raw.(type) {
	case float64:
		if !math.IsNaN(value) && !math.IsInf(value, 0) && value >= 0 && value <= 9007199254740991 && math.Trunc(value) == value {
			return int64(value), nil
		}
	case json.Number:
		if version, err := strconv.ParseInt(string(value), 10, 64); err == nil && version >= 0 && version <= 9007199254740991 {
			return version, nil
		}
	}
	return 0, ErrAccountPasswordVersionInvalid
}

// ValidateAccountPasswordVersionWithDatabase is shared by WS handshakes and live connections.
func ValidateAccountPasswordVersionWithDatabase(ctx context.Context, database *gorm.DB, userID string, passwordVersion int64) error {
	if database == nil {
		return gorm.ErrInvalidDB
	}
	var user models.User
	if err := database.WithContext(ctx).Select("id", "status", "password_version").First(&user, "id = ?", strings.TrimSpace(userID)).Error; err != nil {
		return err
	}
	if passwordVersion < 0 || user.PasswordVersion != passwordVersion || !strings.EqualFold(strings.TrimSpace(user.Status), "active") {
		return ErrAccountPasswordVersionInvalid
	}
	return nil
}
