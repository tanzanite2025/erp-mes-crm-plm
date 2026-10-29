package services

import (
	"context"
	"os"
	"strings"
	"sync"
	"testing"
	"time"
	"xdfc-server/audit"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/security"

	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func openAuthenticatedUserPasswordChangeTestDatabase(t *testing.T, usePostgres bool) *gorm.DB {
	t.Helper()
	var database *gorm.DB
	var err error
	configuration := &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)}
	if usePostgres {
		dsn := os.Getenv("PASSWORD_CHANGE_TEST_POSTGRES_DSN")
		if dsn == "" {
			t.Skip("set PASSWORD_CHANGE_TEST_POSTGRES_DSN for concurrent PostgreSQL verification")
		}
		admin, err := gorm.Open(postgres.Open(dsn), configuration)
		require.NoError(t, err)
		adminConnection, err := admin.DB()
		require.NoError(t, err)
		t.Cleanup(func() { require.NoError(t, adminConnection.Close()) })
		schema := "password_change_" + strings.ReplaceAll(uuid.NewString(), "-", "")
		require.NoError(t, admin.Exec("CREATE SCHEMA "+schema).Error)
		t.Cleanup(func() { require.NoError(t, admin.Exec("DROP SCHEMA "+schema+" CASCADE").Error) })
		connectionConfig, err := pgx.ParseConfig(dsn)
		require.NoError(t, err)
		connectionConfig.RuntimeParams["search_path"] = schema
		connectionConfig.RuntimeParams["statement_timeout"] = "5000"
		connection := stdlib.OpenDB(*connectionConfig)
		connection.SetMaxOpenConns(6)
		database, err = gorm.Open(postgres.New(postgres.Config{Conn: connection}), configuration)
		require.NoError(t, err)
		require.NoError(t, database.AutoMigrate(&models.User{}))
	} else {
		database, err = gorm.Open(sqlite.Open(":memory:"), configuration)
		require.NoError(t, err)
		require.NoError(t, database.Exec(`CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT, password TEXT, password_version INTEGER NOT NULL DEFAULT 0, email TEXT, phone_number TEXT, first_name TEXT, last_name TEXT, status TEXT DEFAULT 'active', is_protected BOOLEAN DEFAULT false, permission_preset_id TEXT, employee_id TEXT, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME)`).Error)
	}
	connection, err := database.DB()
	require.NoError(t, err)
	if !usePostgres {
		connection.SetMaxOpenConns(1)
	}
	t.Cleanup(func() { require.NoError(t, connection.Close()) })
	require.NoError(t, database.AutoMigrate(&models.AuditLog{}))
	previousDatabase := db.DB
	db.DB = database
	t.Cleanup(func() { db.DB = previousDatabase })
	withCapturedAccountAccessRealtimePublisher(t)
	return database
}

func createAuthenticatedPasswordChangeTestUser(t *testing.T, database *gorm.DB, username string) models.User {
	t.Helper()
	hash, err := security.HashNewUserPasswordWithValidation("original-password1")
	require.NoError(t, err)
	user := models.User{ID: uuid.NewString(), Username: username, Password: hash, Status: "active", IsProtected: username == "admin"}
	require.NoError(t, database.Create(&user).Error)
	return user
}

func TestAuthenticatedPasswordChangeAllowsProtectedAccountAndRecordsOnlySanitizedAudit(t *testing.T) {
	database := openAuthenticatedUserPasswordChangeTestDatabase(t, false)
	user := createAuthenticatedPasswordChangeTestUser(t, database, "admin")
	ctx := audit.NewContextWithActor(context.Background(), audit.AuditActor{UserID: user.ID, Username: user.Username, IP: "127.0.0.1", Source: "http"})
	require.NoError(t, ChangeAuthenticatedUserPassword(ctx, database, user.ID, 0, "original-password1", "replacement-password2"))
	var updated models.User
	require.NoError(t, database.First(&updated, "id = ?", user.ID).Error)
	require.EqualValues(t, 1, updated.PasswordVersion)
	require.True(t, updated.IsProtected)
	require.NoError(t, bcrypt.CompareHashAndPassword([]byte(updated.Password), []byte("replacement-password2")))
	require.Error(t, bcrypt.CompareHashAndPassword([]byte(updated.Password), []byte("original-password1")))
	var entries []models.AuditLog
	require.NoError(t, database.Find(&entries).Error)
	require.Len(t, entries, 1)
	require.Equal(t, "PASSWORD_CHANGE", entries[0].Action)
	require.Equal(t, "admin", entries[0].Operator)
	require.Contains(t, string(entries[0].Diff), "passwordChanged")
	for _, secret := range []string{"original-password1", "replacement-password2", user.Password, updated.Password} {
		require.NotContains(t, string(entries[0].Diff), secret)
	}
	require.ErrorIs(t, ChangeAuthenticatedUserPassword(ctx, database, user.ID, 0, "replacement-password2", "third-password3"), ErrPasswordChangeCredentialsExpired)
	_, err := PatchUser(ctx, user.ID, map[string]interface{}{"password": updated.Password})
	require.ErrorIs(t, err, ErrProtectedUserMutation)
}

func TestAuthenticatedPasswordChangeRejectsWrongUnchangedWeakAndInactivePasswordsWithoutMutation(t *testing.T) {
	database := openAuthenticatedUserPasswordChangeTestDatabase(t, false)
	user := createAuthenticatedPasswordChangeTestUser(t, database, "operator")
	for _, scenario := range []struct {
		current, replacement string
		expected             error
	}{
		{"wrong-password1", "replacement-password2", ErrCurrentUserPasswordIncorrect},
		{"original-password1", "original-password1", ErrNewUserPasswordUnchanged},
		{"original-password1", "short1", security.ErrNewUserPasswordInvalid},
		{"original-password1", " replacement-password2", security.ErrNewUserPasswordInvalid},
	} {
		require.ErrorIs(t, ChangeAuthenticatedUserPassword(context.Background(), database, user.ID, 0, scenario.current, scenario.replacement), scenario.expected)
	}
	require.NoError(t, database.Model(&user).Update("status", "inactive").Error)
	require.ErrorIs(t, ChangeAuthenticatedUserPassword(context.Background(), database, user.ID, 0, "original-password1", "replacement-password2"), ErrPasswordChangeCredentialsExpired)
	var unchanged models.User
	require.NoError(t, database.First(&unchanged, "id = ?", user.ID).Error)
	require.Equal(t, user.Password, unchanged.Password)
	require.Zero(t, unchanged.PasswordVersion)
	var count int64
	require.NoError(t, database.Model(&models.AuditLog{}).Count(&count).Error)
	require.Zero(t, count)
}

func TestAuthenticatedPasswordChangeAuditFailureRollsBackPasswordAndVersion(t *testing.T) {
	database := openAuthenticatedUserPasswordChangeTestDatabase(t, false)
	user := createAuthenticatedPasswordChangeTestUser(t, database, "operator")
	require.NoError(t, database.Migrator().DropTable(&models.AuditLog{}))
	require.Error(t, ChangeAuthenticatedUserPassword(context.Background(), database, user.ID, 0, "original-password1", "replacement-password2"))
	var unchanged models.User
	require.NoError(t, database.First(&unchanged, "id = ?", user.ID).Error)
	require.Equal(t, user.Password, unchanged.Password)
	require.Zero(t, unchanged.PasswordVersion)
}

func TestAdministrativePasswordChangesAdvanceVersionWhileProfileChangesDoNot(t *testing.T) {
	database := openAuthenticatedUserPasswordChangeTestDatabase(t, false)
	user := createAuthenticatedPasswordChangeTestUser(t, database, "operator")
	updated, err := PatchUser(context.Background(), user.ID, map[string]interface{}{"first_name": "Updated"})
	require.NoError(t, err)
	require.Zero(t, updated.PasswordVersion)
	for _, mutate := range []func(context.Context, string, map[string]interface{}) (models.User, error){PatchUser, ReplaceUser} {
		hash, err := security.HashNewUserPasswordWithValidation("replacement-password2")
		require.NoError(t, err)
		updated, err = mutate(context.Background(), user.ID, map[string]interface{}{"password": hash})
		require.NoError(t, err)
	}
	require.EqualValues(t, 2, updated.PasswordVersion)
}

func TestAuthenticatedPasswordChangePostgresConcurrentRequestsAllowOneSuccess(t *testing.T) {
	database := openAuthenticatedUserPasswordChangeTestDatabase(t, true)
	user := createAuthenticatedPasswordChangeTestUser(t, database, "operator")
	var group sync.WaitGroup
	errors := make(chan error, 4)
	for range 4 {
		group.Go(func() {
			errors <- ChangeAuthenticatedUserPassword(context.Background(), database, user.ID, 0, "original-password1", "replacement-password2")
		})
	}
	group.Wait()
	close(errors)
	successes := 0
	for err := range errors {
		if err == nil {
			successes++
		} else {
			require.ErrorIs(t, err, ErrPasswordChangeCredentialsExpired)
		}
	}
	require.Equal(t, 1, successes)
	var updated models.User
	require.NoError(t, database.First(&updated, "id = ?", user.ID).Error)
	require.EqualValues(t, 1, updated.PasswordVersion)
	var count int64
	require.NoError(t, database.Model(&models.AuditLog{}).Count(&count).Error)
	require.EqualValues(t, 1, count)
	// Verify rollback against the production database engine, not only SQLite.
	require.NoError(t, database.Migrator().DropTable(&models.AuditLog{}))
	require.Error(t, ChangeAuthenticatedUserPassword(context.Background(), database, user.ID, 1, "replacement-password2", "third-password3"))
	require.NoError(t, database.First(&updated, "id = ?", user.ID).Error)
	require.EqualValues(t, 1, updated.PasswordVersion)
	require.NoError(t, bcrypt.CompareHashAndPassword([]byte(updated.Password), []byte("replacement-password2")))
}

func TestAuthenticatedPasswordChangePostgresMigrationBackfillsLegacyAccountVersion(t *testing.T) {
	database := openAuthenticatedUserPasswordChangeTestDatabase(t, true)
	user := createAuthenticatedPasswordChangeTestUser(t, database, "legacy-operator")
	require.NoError(t, database.Migrator().DropColumn(&models.User{}, "password_version"))
	require.NoError(t, database.AutoMigrate(&models.User{}))
	var migrated models.User
	require.NoError(t, database.First(&migrated, "id = ?", user.ID).Error)
	require.Zero(t, migrated.PasswordVersion)
	require.Equal(t, user.Password, migrated.Password)
	require.NoError(t, ChangeAuthenticatedUserPassword(context.Background(), database, user.ID, 0, "original-password1", "replacement-password2"))
}

func TestAuthenticatedPasswordChangePostgresCannotOverwriteAdministrativeResetAfterReadingOldPassword(t *testing.T) {
	database := openAuthenticatedUserPasswordChangeTestDatabase(t, true)
	user := createAuthenticatedPasswordChangeTestUser(t, database, "operator")
	type passwordChangeSnapshotPauseContextKey struct{}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	passwordChangeContext := context.WithValue(ctx, passwordChangeSnapshotPauseContextKey{}, true)
	snapshotRead := make(chan struct{})
	allowPasswordChangeToProceed := make(chan struct{})
	var releaseOnce, pauseOnce sync.Once
	releaseSnapshot := func() { releaseOnce.Do(func() { close(allowPasswordChangeToProceed) }) }
	defer releaseSnapshot()
	callbackName := "test_pause_authenticated_password_change_after_snapshot"
	require.NoError(t, database.Callback().Query().After("gorm:query").Register(callbackName, func(query *gorm.DB) {
		if query.Statement.Context.Value(passwordChangeSnapshotPauseContextKey{}) != true {
			return
		}
		pauseOnce.Do(func() {
			close(snapshotRead)
			select {
			case <-allowPasswordChangeToProceed:
			case <-ctx.Done():
			}
		})
	}))
	t.Cleanup(func() { _ = database.Callback().Query().Remove(callbackName) })
	result := make(chan error, 1)
	go func() {
		result <- ChangeAuthenticatedUserPassword(passwordChangeContext, database, user.ID, 0, "original-password1", "self-service-password2")
	}()
	select {
	case <-snapshotRead:
	case <-ctx.Done():
		t.Fatal("password change never read the initial account snapshot")
	}
	adminHash, err := security.HashNewUserPasswordWithValidation("administrator-reset-password3")
	require.NoError(t, err)
	_, err = PatchUser(ctx, user.ID, map[string]interface{}{"password": adminHash})
	require.NoError(t, err)
	releaseSnapshot()
	select {
	case err := <-result:
		require.ErrorIs(t, err, ErrPasswordChangeCredentialsExpired)
	case <-ctx.Done():
		t.Fatal("password change did not reject the obsolete snapshot")
	}
	var updated models.User
	require.NoError(t, database.First(&updated, "id = ?", user.ID).Error)
	require.EqualValues(t, 1, updated.PasswordVersion)
	require.NoError(t, bcrypt.CompareHashAndPassword([]byte(updated.Password), []byte("administrator-reset-password3")))
	var entries []models.AuditLog
	require.NoError(t, database.Find(&entries).Error)
	require.Len(t, entries, 1)
	require.Equal(t, "PATCH", entries[0].Action)
}
