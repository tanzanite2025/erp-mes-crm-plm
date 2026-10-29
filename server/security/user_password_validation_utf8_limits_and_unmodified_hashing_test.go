package security

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
)

func TestNewUserPasswordValidationEnforcesPolicyAndUTF8ByteLimit(t *testing.T) {
	for _, password := range []string{"", "short1", "PASSWORD123", "passwordonly", " password123", "password123\n", strings.Repeat("a", 72) + "1", "a1" + strings.Repeat("密", 24), "$2a$10$abcdef123456"} {
		require.ErrorIs(t, ValidateNewUserPassword(password), ErrNewUserPasswordInvalid)
	}
	for _, password := range []string{"password123", "pass word123", "a1" + strings.Repeat("密", 23), strings.Repeat("a", 71) + "1"} {
		require.NoError(t, ValidateNewUserPassword(password))
	}
}

func TestNewUserPasswordValidationMatchesBrowserUnicodeWhitespaceAndHashPrefixRules(t *testing.T) {
	for _, whitespace := range []string{"\u0085", "\uFEFF", "\u00A0", "\u2007", "\u202F", "\t", "\r\n"} {
		require.ErrorIs(t, ValidateNewUserPassword(whitespace+"password123"), ErrNewUserPasswordInvalid)
		require.ErrorIs(t, ValidateNewUserPassword("password123"+whitespace), ErrNewUserPasswordInvalid)
		require.NoError(t, ValidateNewUserPassword("pass"+whitespace+"word123"))
	}
	for _, prefix := range []string{"$2a$", "$2b$", "$2y$"} {
		require.ErrorIs(t, ValidateNewUserPassword(prefix+"password123"), ErrNewUserPasswordInvalid)
	}
	require.ErrorIs(t, ValidateNewUserPassword("password123\xff"), ErrNewUserPasswordInvalid)
}

func TestNewUserPasswordHashingPreservesValidPasswordAndRejectsWhitespace(t *testing.T) {
	hash, err := HashNewUserPasswordWithValidation("pass word123")
	require.NoError(t, err)
	require.NoError(t, bcrypt.CompareHashAndPassword([]byte(hash), []byte("pass word123")))
	_, err = HashNewUserPasswordWithValidation(" password123 ")
	require.ErrorIs(t, err, ErrNewUserPasswordInvalid)
}
