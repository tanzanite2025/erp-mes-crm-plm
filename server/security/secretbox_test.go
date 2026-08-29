package security

import (
	"strings"
	"testing"
)

func TestAttendanceSecretEncryptionRoundTrip(t *testing.T) {
	t.Setenv(AttendanceSecretEncryptionKeyEnv, "local-attendance-secret-key-20260813-strong")
	plaintext := "现场设备密码/ISUP-Key-含中文"

	ciphertext, err := EncryptAttendanceSecret(plaintext)
	if err != nil {
		t.Fatalf("encrypt attendance secret: %v", err)
	}
	if !IsAttendanceSecretCiphertext(ciphertext) {
		t.Fatalf("ciphertext does not have the expected version prefix: %q", ciphertext)
	}
	if strings.Contains(ciphertext, plaintext) {
		t.Fatal("ciphertext contains the plaintext secret")
	}

	decrypted, err := DecryptAttendanceSecret(ciphertext)
	if err != nil {
		t.Fatalf("decrypt attendance secret: %v", err)
	}
	if decrypted != plaintext {
		t.Fatalf("unexpected decrypted secret: %q", decrypted)
	}
}

func TestAttendanceSecretWrongKeyCannotDecrypt(t *testing.T) {
	t.Setenv(AttendanceSecretEncryptionKeyEnv, "local-attendance-secret-key-20260813-strong")
	ciphertext, err := EncryptAttendanceSecret("device-password")
	if err != nil {
		t.Fatalf("encrypt attendance secret: %v", err)
	}

	t.Setenv(AttendanceSecretEncryptionKeyEnv, "another-attendance-secret-key-20260813")
	if _, err := DecryptAttendanceSecret(ciphertext); err == nil {
		t.Fatal("wrong encryption key unexpectedly decrypted attendance secret")
	}
}

func TestAttendanceSecretEncryptionKeyValidation(t *testing.T) {
	t.Setenv(AttendanceSecretEncryptionKeyEnv, "")
	if err := ValidateAttendanceSecretEncryptionKeyFromEnv(); err != ErrAttendanceSecretEncryptionKeyMissing {
		t.Fatalf("expected missing key error, got %v", err)
	}

	t.Setenv(AttendanceSecretEncryptionKeyEnv, "too-short")
	if err := ValidateAttendanceSecretEncryptionKeyFromEnv(); err == nil || !strings.Contains(err.Error(), "at least 32 bytes") {
		t.Fatalf("expected short key error, got %v", err)
	}
}

func TestAttendanceSecretRuntimeLeavesLegacyPlaintextUntouched(t *testing.T) {
	t.Setenv(AttendanceSecretEncryptionKeyEnv, "")
	plaintext := "legacy-device-password"

	runtimeValue, err := AttendanceSecretForRuntime(plaintext)
	if err != nil {
		t.Fatalf("legacy plaintext should remain usable during migration: %v", err)
	}
	if runtimeValue != plaintext {
		t.Fatalf("legacy plaintext changed: %q", runtimeValue)
	}
}
