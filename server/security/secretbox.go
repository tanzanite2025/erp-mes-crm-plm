package security

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"os"
	"strings"
)

const (
	AttendanceSecretEncryptionKeyEnv       = "ATTENDANCE_SECRET_ENCRYPTION_KEY"
	AttendanceSecretCiphertextPrefix       = "att-secret:v1:"
	AttendanceSecretCiphertextFamilyPrefix = "att-secret:"
	attendanceSecretMinEncryptionKeyBytes  = 32
	attendanceSecretAssociatedData         = "xdfc:attendance-device-secret:v1"
)

var (
	ErrAttendanceSecretEncryptionKeyMissing  = errors.New("attendance device secret encryption key is not configured")
	ErrAttendanceSecretEncryptionKeyTooShort = errors.New("attendance device secret encryption key is too short")
	ErrAttendanceSecretCiphertextUnsupported = errors.New("attendance device secret ciphertext version is unsupported")
	ErrAttendanceSecretCiphertextMalformed   = errors.New("attendance device secret ciphertext is malformed")
)

func ValidateAttendanceSecretEncryptionKeyFromEnv() error {
	_, err := resolveAttendanceSecretAES256Key()
	return err
}

func IsAttendanceSecretCiphertext(value string) bool {
	return strings.HasPrefix(strings.TrimSpace(value), AttendanceSecretCiphertextPrefix)
}

func LooksLikeAttendanceSecretCiphertext(value string) bool {
	return strings.HasPrefix(strings.TrimSpace(value), AttendanceSecretCiphertextFamilyPrefix)
}

func EncryptAttendanceSecret(plaintext string) (string, error) {
	key, err := resolveAttendanceSecretAES256Key()
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	sealed := gcm.Seal(nonce, nonce, []byte(plaintext), []byte(attendanceSecretAssociatedData))
	return AttendanceSecretCiphertextPrefix + base64.RawURLEncoding.EncodeToString(sealed), nil
}

func DecryptAttendanceSecret(ciphertext string) (string, error) {
	trimmed := strings.TrimSpace(ciphertext)
	if !strings.HasPrefix(trimmed, AttendanceSecretCiphertextFamilyPrefix) {
		return "", ErrAttendanceSecretCiphertextMalformed
	}
	if !strings.HasPrefix(trimmed, AttendanceSecretCiphertextPrefix) {
		return "", ErrAttendanceSecretCiphertextUnsupported
	}

	key, err := resolveAttendanceSecretAES256Key()
	if err != nil {
		return "", err
	}

	encoded := strings.TrimPrefix(trimmed, AttendanceSecretCiphertextPrefix)
	raw, err := base64.RawURLEncoding.DecodeString(encoded)
	if err != nil {
		return "", fmt.Errorf("%w: %v", ErrAttendanceSecretCiphertextMalformed, err)
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonceSize := gcm.NonceSize()
	if len(raw) <= nonceSize {
		return "", ErrAttendanceSecretCiphertextMalformed
	}

	nonce := raw[:nonceSize]
	sealed := raw[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, sealed, []byte(attendanceSecretAssociatedData))
	if err != nil {
		return "", err
	}
	return string(plaintext), nil
}

func AttendanceSecretForRuntime(value string) (string, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return "", nil
	}
	if !LooksLikeAttendanceSecretCiphertext(trimmed) {
		return value, nil
	}
	return DecryptAttendanceSecret(trimmed)
}

func resolveAttendanceSecretAES256Key() ([]byte, error) {
	seed := strings.TrimSpace(os.Getenv(AttendanceSecretEncryptionKeyEnv))
	if seed == "" {
		return nil, ErrAttendanceSecretEncryptionKeyMissing
	}
	if len([]byte(seed)) < attendanceSecretMinEncryptionKeyBytes {
		return nil, fmt.Errorf(
			"%w: %s must be at least %d bytes and stable across restarts, replicas, and restores",
			ErrAttendanceSecretEncryptionKeyTooShort,
			AttendanceSecretEncryptionKeyEnv,
			attendanceSecretMinEncryptionKeyBytes,
		)
	}

	sum := sha256.Sum256([]byte(seed))
	key := make([]byte, len(sum))
	copy(key, sum[:])
	return key, nil
}
