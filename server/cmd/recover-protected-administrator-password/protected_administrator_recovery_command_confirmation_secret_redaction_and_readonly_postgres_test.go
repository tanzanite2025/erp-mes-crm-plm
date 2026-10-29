package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"
	"xdfc-server/db"
	"xdfc-server/handlers"
	"xdfc-server/middleware"
	"xdfc-server/models"
	"xdfc-server/security"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func openProtectedAdministratorRecoveryCommandTestDatabase(t *testing.T, usePostgres bool) (*gorm.DB, models.User) {
	t.Helper()
	var database *gorm.DB
	var err error
	configuration := &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)}
	if usePostgres {
		dsn := os.Getenv("PASSWORD_CHANGE_TEST_POSTGRES_DSN")
		if dsn == "" {
			t.Skip("set PASSWORD_CHANGE_TEST_POSTGRES_DSN for the read-only recovery command verification")
		}
		admin, err := gorm.Open(postgres.Open(dsn), configuration)
		require.NoError(t, err)
		adminConnection, err := admin.DB()
		require.NoError(t, err)
		t.Cleanup(func() { _ = adminConnection.Close() })
		schema := "protected_admin_recovery_" + strings.ReplaceAll(uuid.NewString(), "-", "")
		require.NoError(t, admin.Exec("CREATE SCHEMA "+schema).Error)
		t.Cleanup(func() { require.NoError(t, admin.Exec("DROP SCHEMA "+schema+" CASCADE").Error) })
		pgxConfiguration, err := pgx.ParseConfig(dsn)
		require.NoError(t, err)
		pgxConfiguration.RuntimeParams["search_path"] = schema
		connection := stdlib.OpenDB(*pgxConfiguration)
		database, err = gorm.Open(postgres.New(postgres.Config{Conn: connection}), configuration)
		require.NoError(t, err)
		if strings.Contains(dsn, "://") {
			t.Setenv("DATABASE_URL", dsn+map[bool]string{true: "&", false: "?"}[strings.Contains(dsn, "?")]+"search_path="+schema)
		} else {
			t.Setenv("DATABASE_URL", dsn+" search_path="+schema)
		}
		require.NoError(t, database.AutoMigrate(&models.User{}))
	} else {
		database, err = gorm.Open(sqlite.Open(":memory:"), configuration)
		require.NoError(t, err)
		require.NoError(t, database.Exec(`CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT, password TEXT, password_version INTEGER NOT NULL DEFAULT 0, status TEXT, is_protected BOOLEAN, permission_preset_id TEXT, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME)`).Error)
	}
	connection, err := database.DB()
	require.NoError(t, err)
	connection.SetMaxOpenConns(1)
	t.Cleanup(func() { _ = connection.Close() })
	require.NoError(t, database.AutoMigrate(&models.AuditLog{}))
	hash, err := security.HashNewUserPasswordWithValidation("original-admin-password1")
	require.NoError(t, err)
	account := models.User{ID: uuid.NewString(), Username: "admin", Password: hash, Status: "active", IsProtected: true, PermissionPresetID: "admin"}
	// Omit profile columns absent in the minimal SQLite schema.
	require.NoError(t, database.Select("id", "username", "password", "password_version", "status", "is_protected", "permission_preset_id", "created_at", "updated_at").Create(&account).Error)
	return database, account
}

func TestProtectedAdministratorRecoveryCommandRejectsSecretArgumentsWithoutEchoingTheirValues(t *testing.T) {
	for _, arguments := range [][]string{
		{"--new-password=must-not-appear-password1"},
		{"--password", "must-not-appear-password1"},
		{"--apply", "--user-id", uuid.NewString()},
		{"--user-id", uuid.NewString(), "must-not-appear-password1"},
	} {
		_, err := parseProtectedAdministratorPasswordRecoveryCommandOptions(arguments)
		require.Error(t, err)
		require.NotContains(t, err.Error(), "must-not-appear-password1")
	}
	_, err := parseProtectedAdministratorPasswordRecoveryCommandOptions([]string{"--user-id", uuid.NewString(), "--apply", "--expected-password-version", "-1", "--operator", "operator", "--reason", "INC"})
	require.ErrorIs(t, err, services.ErrProtectedAdministratorRecoveryInputInvalid)
}

func TestProtectedAdministratorRecoveryCommandRequiresExplicitDatabaseAndInteractiveApply(t *testing.T) {
	t.Setenv("DATABASE_URL", "")
	var output bytes.Buffer
	require.NoError(t, runProtectedAdministratorPasswordRecoveryCommand([]string{"--help"}, os.Stdin, &output))
	require.Contains(t, output.String(), "read-only")
	err := runProtectedAdministratorPasswordRecoveryCommand([]string{"--user-id", uuid.NewString()}, os.Stdin, io.Discard)
	require.ErrorContains(t, err, "DATABASE_URL must be supplied explicitly")
	pipeReader, pipeWriter, err := os.Pipe()
	require.NoError(t, err)
	defer pipeReader.Close()
	defer pipeWriter.Close()
	err = runProtectedAdministratorPasswordRecoveryCommand([]string{"--user-id", uuid.NewString(), "--apply", "--expected-password-version", "0", "--operator", "operator", "--reason", "INC"}, pipeReader, io.Discard)
	require.ErrorContains(t, err, "real interactive terminal")
	_, _, _, err = openProtectedAdministratorRecoveryDatabase("postgres://user:do-not-print-this-credential@%invalid", true)
	require.Error(t, err)
	require.NotContains(t, err.Error(), "do-not-print-this-credential")
}

func TestProtectedAdministratorRecoveryConfirmationDoesNotConsumeTheFollowingPassword(t *testing.T) {
	input := strings.NewReader("RECOVER exact-target VERSION 0\r\nnext-secret-password2\n")
	confirmation, err := readProtectedAdministratorRecoveryConfirmationLine(input)
	require.NoError(t, err)
	require.Equal(t, "RECOVER exact-target VERSION 0", confirmation)
	remaining, err := io.ReadAll(input)
	require.NoError(t, err)
	require.Equal(t, "next-secret-password2\n", string(remaining))
}

func TestProtectedAdministratorRecoveryCommandRejectsMismatchesWithoutWritingAccountOrAudit(t *testing.T) {
	for _, scenario := range []string{"confirmation_mismatch", "password_mismatch", "invalid_password", "input_interrupted"} {
		t.Run(scenario, func(t *testing.T) {
			database, account := openProtectedAdministratorRecoveryCommandTestDatabase(t, false)
			passwordReads := 0
			interaction := protectedAdministratorPasswordRecoveryInteraction{
				readConfirmation: func(string) (string, error) {
					if scenario == "confirmation_mismatch" {
						return "wrong target", nil
					}
					return "RECOVER " + account.ID + " VERSION 0", nil
				},
				readHiddenPassword: func(string) ([]byte, error) {
					passwordReads++
					if scenario == "input_interrupted" {
						return nil, io.EOF
					}
					if scenario == "invalid_password" {
						return []byte("weak"), nil
					}
					if scenario == "password_mismatch" && passwordReads == 2 {
						return []byte("different-password3"), nil
					}
					return []byte("new-admin-password2"), nil
				},
			}
			err := applyProtectedAdministratorRecoveryAfterExactInteractiveConfirmation(database, services.ProtectedAdministratorPasswordRecoveryInput{UserID: account.ID, Operator: "operator", Reason: "INC verified owner"}, interaction, io.Discard)
			require.Error(t, err)
			if scenario == "confirmation_mismatch" {
				require.Zero(t, passwordReads)
			}
			var unchanged models.User
			require.NoError(t, database.First(&unchanged, "id = ?", account.ID).Error)
			require.Zero(t, unchanged.PasswordVersion)
			require.Equal(t, account.Password, unchanged.Password)
			var count int64
			require.NoError(t, database.Model(&models.AuditLog{}).Count(&count).Error)
			require.Zero(t, count)
		})
	}
}

func TestProtectedAdministratorRecoveryCommandPostgresPreviewAndConfirmedApplyAreSanitizedAndVersioned(t *testing.T) {
	database, account := openProtectedAdministratorRecoveryCommandTestDatabase(t, true)
	require.NoError(t, database.AutoMigrate(&models.PermissionPreset{}, &models.UserPermission{}))
	previousDatabase, previousSecret := db.DB, middleware.JwtSecret
	db.DB, middleware.JwtSecret = database, []byte("isolated-offline-recovery-http-verification-secret")
	t.Cleanup(func() { db.DB, middleware.JwtSecret = previousDatabase, previousSecret })
	router := gin.New()
	router.POST("/login", handlers.LoginHandler)
	router.GET("/protected", middleware.AuthMiddleware(), func(c *gin.Context) { c.Status(http.StatusNoContent) })
	oldToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"sub": account.ID, "passwordVersion": 0, "exp": time.Now().Add(time.Hour).Unix()}).SignedString(middleware.JwtSecret)
	require.NoError(t, err)
	checkAuthenticatedRequest := func(token string, useCookie bool) int {
		request := httptest.NewRequest(http.MethodGet, "/protected", nil)
		if useCookie {
			request.AddCookie(&http.Cookie{Name: "xdfc_access_token", Value: token})
		} else {
			request.Header.Set("Authorization", "Bearer "+token)
		}
		response := httptest.NewRecorder()
		router.ServeHTTP(response, request)
		return response.Code
	}
	require.Equal(t, http.StatusNoContent, checkAuthenticatedRequest(oldToken, false))
	var output bytes.Buffer
	require.NoError(t, runProtectedAdministratorPasswordRecoveryCommand([]string{"--user-id", account.ID}, os.Stdin, &output))
	require.Contains(t, output.String(), "READ ONLY")
	require.NotContains(t, output.String(), account.Password)
	var before models.User
	require.NoError(t, database.First(&before, "id = ?", account.ID).Error)
	require.Equal(t, account.Password, before.Password)
	var auditCount int64
	require.NoError(t, database.Model(&models.AuditLog{}).Count(&auditCount).Error)
	require.Zero(t, auditCount)
	readOnlyDatabase, closeReadOnlyDatabase, _, err := openProtectedAdministratorRecoveryDatabase(os.Getenv("DATABASE_URL"), true)
	require.NoError(t, err)
	readOnlyWrite := readOnlyDatabase.Exec("UPDATE users SET password_version = password_version + 1 WHERE id = ?", account.ID)
	require.Error(t, readOnlyWrite.Error, "preview connections must reject writes at the database level")
	closeReadOnlyDatabase()
	firstPassword, confirmationPassword := []byte("new-admin-password2"), []byte("new-admin-password2")
	reads := 0
	interaction := protectedAdministratorPasswordRecoveryInteraction{
		readConfirmation: func(string) (string, error) { return "RECOVER " + account.ID + " VERSION 0", nil },
		readHiddenPassword: func(string) ([]byte, error) {
			reads++
			if reads == 1 {
				return firstPassword, nil
			}
			return confirmationPassword, nil
		},
	}
	require.NoError(t, applyProtectedAdministratorRecoveryAfterExactInteractiveConfirmation(database, services.ProtectedAdministratorPasswordRecoveryInput{UserID: account.ID, Operator: "operator", Reason: "INC verified owner"}, interaction, &output))
	require.Contains(t, output.String(), "RECOVERY COMMITTED")
	require.Contains(t, output.String(), "passwordVersion=1")
	require.NotContains(t, output.String(), "new-admin-password2")
	require.Equal(t, make([]byte, len(firstPassword)), firstPassword)
	require.Equal(t, make([]byte, len(confirmationPassword)), confirmationPassword)
	var updated models.User
	require.NoError(t, database.First(&updated, "id = ?", account.ID).Error)
	require.NoError(t, bcrypt.CompareHashAndPassword([]byte(updated.Password), []byte("new-admin-password2")))
	_, err = services.InspectProtectedAdministratorPasswordRecoveryTarget(context.Background(), database, account.ID)
	require.NoError(t, err)
	for _, useCookie := range []bool{false, true} {
		require.Equal(t, http.StatusUnauthorized, checkAuthenticatedRequest(oldToken, useCookie))
	}
	for _, password := range []string{"original-admin-password1", "new-admin-password2"} {
		body, err := json.Marshal(map[string]string{"username": "admin", "password": password})
		require.NoError(t, err)
		request := httptest.NewRequest(http.MethodPost, "/login", bytes.NewReader(body))
		request.Header.Set("Content-Type", "application/json")
		response := httptest.NewRecorder()
		router.ServeHTTP(response, request)
		if password == "original-admin-password1" {
			require.Equal(t, http.StatusUnauthorized, response.Code)
			continue
		}
		require.Equal(t, http.StatusOK, response.Code, response.Body.String())
		var credentials struct {
			AccessToken string `json:"accessToken"`
		}
		require.NoError(t, json.Unmarshal(response.Body.Bytes(), &credentials))
		require.Equal(t, http.StatusNoContent, checkAuthenticatedRequest(credentials.AccessToken, false))
	}
}

func TestProtectedAdministratorRecoveryDatabaseErrorsCannotLeakConnectionOrPasswordDetails(t *testing.T) {
	err := sanitizeProtectedAdministratorRecoveryFailure(errors.New("db rejected DSN-password and bcrypt-hash"))
	require.NotContains(t, err.Error(), "DSN-password")
	require.NotContains(t, err.Error(), "bcrypt-hash")
}
