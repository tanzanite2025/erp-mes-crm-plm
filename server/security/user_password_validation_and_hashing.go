package security

import (
	"errors"
	"strings"
	"unicode"
	"unicode/utf8"

	"golang.org/x/crypto/bcrypt"
)

var ErrNewUserPasswordInvalid = errors.New("password must contain at least 8 characters, a lowercase letter and a digit, be at most 72 UTF-8 bytes, and have no surrounding whitespace")

// ValidateNewUserPassword applies the same policy to self-service and account administration.
// Passwords are never silently trimmed; existing passwords are verified verbatim.
func ValidateNewUserPassword(password string) error {
	if !utf8.ValidString(password) || utf8.RuneCountInString(password) < 8 || len(password) > 72 || strings.TrimFunc(password, isUserPasswordBoundaryWhitespace) != password {
		return ErrNewUserPasswordInvalid
	}
	hasLowercase, hasDigit := false, false
	for _, character := range password {
		hasLowercase = hasLowercase || (character >= 'a' && character <= 'z')
		hasDigit = hasDigit || (character >= '0' && character <= '9')
	}
	if !hasLowercase || !hasDigit || strings.HasPrefix(password, "$2a$") || strings.HasPrefix(password, "$2b$") || strings.HasPrefix(password, "$2y$") {
		return ErrNewUserPasswordInvalid
	}
	return nil
}

// Include the BOM recognized by JavaScript trim as well as Unicode White_Space.
func isUserPasswordBoundaryWhitespace(character rune) bool {
	return unicode.IsSpace(character) || character == '\uFEFF'
}

func HashNewUserPasswordWithValidation(password string) (string, error) {
	if err := ValidateNewUserPassword(password); err != nil {
		return "", err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), 11)
	return string(hash), err
}
