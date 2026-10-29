package services

import (
	"context"
	"strings"
	"sync"
	"testing"
	"xdfc-server/models"
	"xdfc-server/security"

	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
)

func TestProtectedAdministratorRecoveryPreviewIsReadOnlyAndRecoveryInvalidatesOldPasswordVersion(t *testing.T) {
	database := openAuthenticatedUserPasswordChangeTestDatabase(t, false)
	account := createAuthenticatedPasswordChangeTestUser(t, database, "admin")
	target, err := InspectProtectedAdministratorPasswordRecoveryTarget(context.Background(), database, account.ID)
	require.NoError(t, err)
	require.Equal(t, account.ID, target.UserID)
	require.Zero(t, target.PasswordVersion)
	var before models.User
	require.NoError(t, database.First(&before, "id = ?", account.ID).Error)
	require.Equal(t, account.Password, before.Password)
	var auditCount int64
	require.NoError(t, database.Model(&models.AuditLog{}).Count(&auditCount).Error)
	require.Zero(t, auditCount)
	result, err := RecoverProtectedAdministratorPasswordWithAtomicAudit(context.Background(), database, ProtectedAdministratorPasswordRecoveryInput{
		UserID: account.ID, ExpectedPasswordVersion: 0, Operator: "maintenance.operator", Reason: "INC-2026-1028 verified account owner", NewPassword: "recovered-admin-password2",
	})
	require.NoError(t, err)
	require.EqualValues(t, 1, result.PasswordVersion)
	require.NotEmpty(t, result.RecoveryOperationID)
	var after models.User
	require.NoError(t, database.First(&after, "id = ?", account.ID).Error)
	require.NoError(t, bcrypt.CompareHashAndPassword([]byte(after.Password), []byte("recovered-admin-password2")))
	require.Error(t, bcrypt.CompareHashAndPassword([]byte(after.Password), []byte("original-password1")))
	require.Equal(t, account.Status, after.Status)
	require.Equal(t, account.PermissionPresetID, after.PermissionPresetID)
	require.True(t, after.IsProtected)
	var entries []models.AuditLog
	require.NoError(t, database.Find(&entries).Error)
	require.Len(t, entries, 1)
	require.Equal(t, "PASSWORD_RECOVERY", entries[0].Action)
	require.Equal(t, "maintenance.operator", entries[0].Operator)
	require.Equal(t, account.ID, entries[0].TargetID)
	for _, metadata := range []string{result.RecoveryOperationID, "INC-2026-1028", "offline_protected_administrator_recovery"} {
		require.Contains(t, string(entries[0].Diff), metadata)
	}
	for _, secret := range []string{account.Password, after.Password, "original-password1", "recovered-admin-password2"} {
		require.NotContains(t, string(entries[0].Diff), secret)
	}
	_, err = RecoverProtectedAdministratorPasswordWithAtomicAudit(context.Background(), database, ProtectedAdministratorPasswordRecoveryInput{
		UserID: account.ID, ExpectedPasswordVersion: 0, Operator: "maintenance.operator", Reason: "INC stale retry", NewPassword: "stale-recovery-password3",
	})
	require.ErrorIs(t, err, ErrProtectedAdministratorRecoveryVersionChanged)
}

func TestProtectedAdministratorRecoveryRejectsInvalidScopeCredentialsAndAuditMetadataWithoutMutation(t *testing.T) {
	database := openAuthenticatedUserPasswordChangeTestDatabase(t, false)
	account := createAuthenticatedPasswordChangeTestUser(t, database, "admin")
	ordinaryAccount := createAuthenticatedPasswordChangeTestUser(t, database, "operator")
	for _, scenario := range []struct {
		name        string
		changeInput func(*ProtectedAdministratorPasswordRecoveryInput)
		expected    error
	}{
		{"ordinary_account", func(input *ProtectedAdministratorPasswordRecoveryInput) { input.UserID = ordinaryAccount.ID }, ErrProtectedAdministratorRecoveryTargetIneligible},
		{"unknown_account", func(input *ProtectedAdministratorPasswordRecoveryInput) {
			input.UserID = "00000000-0000-4000-8000-000000000001"
		}, ErrProtectedAdministratorRecoveryTargetIneligible},
		{"invalid_account_id", func(input *ProtectedAdministratorPasswordRecoveryInput) { input.UserID = "admin" }, ErrProtectedAdministratorRecoveryInputInvalid},
		{"missing_operator", func(input *ProtectedAdministratorPasswordRecoveryInput) { input.Operator = " " }, ErrProtectedAdministratorRecoveryInputInvalid},
		{"missing_reason", func(input *ProtectedAdministratorPasswordRecoveryInput) { input.Reason = "" }, ErrProtectedAdministratorRecoveryInputInvalid},
		{"operator_line_break", func(input *ProtectedAdministratorPasswordRecoveryInput) { input.Operator = "operator\nforged" }, ErrProtectedAdministratorRecoveryInputInvalid},
		{"excessive_reason", func(input *ProtectedAdministratorPasswordRecoveryInput) { input.Reason = strings.Repeat("x", 501) }, ErrProtectedAdministratorRecoveryInputInvalid},
		{"negative_version", func(input *ProtectedAdministratorPasswordRecoveryInput) { input.ExpectedPasswordVersion = -1 }, ErrProtectedAdministratorRecoveryInputInvalid},
		{"unsafe_version_increment", func(input *ProtectedAdministratorPasswordRecoveryInput) {
			input.ExpectedPasswordVersion = 9007199254740991
		}, ErrProtectedAdministratorRecoveryInputInvalid},
		{"stale_preview", func(input *ProtectedAdministratorPasswordRecoveryInput) { input.ExpectedPasswordVersion = 1 }, ErrProtectedAdministratorRecoveryVersionChanged},
		{"unchanged_password", func(input *ProtectedAdministratorPasswordRecoveryInput) { input.NewPassword = "original-password1" }, ErrNewUserPasswordUnchanged},
		{"invalid_password", func(input *ProtectedAdministratorPasswordRecoveryInput) { input.NewPassword = "weak" }, security.ErrNewUserPasswordInvalid},
	} {
		t.Run(scenario.name, func(t *testing.T) {
			input := ProtectedAdministratorPasswordRecoveryInput{UserID: account.ID, Operator: "maintenance.operator", Reason: "INC verified recovery", NewPassword: "recovered-admin-password2"}
			scenario.changeInput(&input)
			_, err := RecoverProtectedAdministratorPasswordWithAtomicAudit(context.Background(), database, input)
			require.ErrorIs(t, err, scenario.expected)
		})
	}
	for _, mutateAccount := range []map[string]any{{"status": "inactive"}, {"status": "active", "username": "protected-operator", "is_protected": true}, {"username": "delegated-administrator", "is_protected": false, "permission_preset_id": "admin"}} {
		require.NoError(t, database.Model(&models.User{}).Where("id = ?", account.ID).Updates(mutateAccount).Error)
		_, err := InspectProtectedAdministratorPasswordRecoveryTarget(context.Background(), database, account.ID)
		require.ErrorIs(t, err, ErrProtectedAdministratorRecoveryTargetIneligible)
		_, err = RecoverProtectedAdministratorPasswordWithAtomicAudit(context.Background(), database, ProtectedAdministratorPasswordRecoveryInput{UserID: account.ID, Operator: "maintenance.operator", Reason: "INC verified recovery", NewPassword: "recovered-admin-password2"})
		require.ErrorIs(t, err, ErrProtectedAdministratorRecoveryTargetIneligible)
	}
	require.NoError(t, database.Delete(&models.User{}, "id = ?", account.ID).Error)
	_, err := InspectProtectedAdministratorPasswordRecoveryTarget(context.Background(), database, account.ID)
	require.ErrorIs(t, err, ErrProtectedAdministratorRecoveryTargetIneligible)
	var unchanged models.User
	require.NoError(t, database.Unscoped().First(&unchanged, "id = ?", account.ID).Error)
	require.Equal(t, account.Password, unchanged.Password)
	require.Zero(t, unchanged.PasswordVersion)
	var count int64
	require.NoError(t, database.Model(&models.AuditLog{}).Count(&count).Error)
	require.Zero(t, count)
}

func TestProtectedAdministratorRecoveryPostgresConcurrentCommandsCommitOnceAndAuditFailureRollsBack(t *testing.T) {
	database := openAuthenticatedUserPasswordChangeTestDatabase(t, true)
	account := createAuthenticatedPasswordChangeTestUser(t, database, "admin")
	var requests sync.WaitGroup
	results := make(chan error, 2)
	for range 2 {
		requests.Go(func() {
			_, err := RecoverProtectedAdministratorPasswordWithAtomicAudit(context.Background(), database, ProtectedAdministratorPasswordRecoveryInput{UserID: account.ID, Operator: "maintenance.operator", Reason: "INC concurrent recovery", NewPassword: "recovered-admin-password2"})
			results <- err
		})
	}
	requests.Wait()
	close(results)
	committed := 0
	for err := range results {
		if err == nil {
			committed++
		} else {
			require.ErrorIs(t, err, ErrProtectedAdministratorRecoveryVersionChanged)
		}
	}
	require.Equal(t, 1, committed)
	var entries []models.AuditLog
	require.NoError(t, database.Find(&entries).Error)
	require.Len(t, entries, 1)
	require.NoError(t, database.Migrator().DropTable(&models.AuditLog{}))
	_, err := RecoverProtectedAdministratorPasswordWithAtomicAudit(context.Background(), database, ProtectedAdministratorPasswordRecoveryInput{UserID: account.ID, ExpectedPasswordVersion: 1, Operator: "maintenance.operator", Reason: "INC audit unavailable", NewPassword: "must-not-be-saved-password3"})
	require.Error(t, err)
	var afterFailure models.User
	require.NoError(t, database.First(&afterFailure, "id = ?", account.ID).Error)
	require.EqualValues(t, 1, afterFailure.PasswordVersion)
	require.NoError(t, bcrypt.CompareHashAndPassword([]byte(afterFailure.Password), []byte("recovered-admin-password2")))
}
