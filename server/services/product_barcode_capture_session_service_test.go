package services

import (
	"fmt"
	"testing"
	"time"
	"xdfc-server/db"

	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func setupProductBarcodeCaptureSessionTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	prevDB := db.DB
	testDB, err := gorm.Open(
		sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())),
		&gorm.Config{Logger: logger.Default.LogMode(logger.Silent)},
	)
	require.NoError(t, err)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE product_barcode_capture_sessions (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			session_id TEXT NOT NULL UNIQUE,
			upload_token TEXT NOT NULL,
			status TEXT,
			raw_code TEXT,
			barcode_protocol TEXT,
			barcode_summary TEXT,
			submitted_at DATETIME,
			expires_at DATETIME
		);
	`).Error)
	db.DB = testDB

	t.Cleanup(func() {
		db.DB = prevDB
	})

	return testDB
}

func TestCreateProductBarcodeCaptureSession(t *testing.T) {
	testDB := setupProductBarcodeCaptureSessionTestDB(t)

	result, err := CreateProductBarcodeCaptureSession()
	require.NoError(t, err)
	require.NotEmpty(t, result.SessionID)
	require.NotEmpty(t, result.UploadToken)
	require.Equal(t, ProductBarcodeCaptureStatusWaiting, result.Status)

	var count int64
	require.NoError(t, testDB.Table("product_barcode_capture_sessions").Count(&count).Error)
	require.EqualValues(t, 1, count)
}

func TestSubmitProductBarcodeCaptureSession(t *testing.T) {
	testDB := setupProductBarcodeCaptureSessionTestDB(t)
	now := time.Now()
	sessionID := "product-barcode-" + uuid.NewString()
	token := "upload-token-001"
	require.NoError(t, testDB.Exec(
		`INSERT INTO product_barcode_capture_sessions (id, created_at, updated_at, session_id, upload_token, status, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		uuid.NewString(),
		now,
		now,
		sessionID,
		token,
		ProductBarcodeCaptureStatusWaiting,
		now.Add(30*time.Minute),
	).Error)

	result, err := SubmitProductBarcodeCaptureSession(sessionID, SubmitProductBarcodeCaptureSessionRequest{
		Token:   token,
		RawCode: "24125031R360001",
	})
	require.NoError(t, err)
	require.Equal(t, ProductBarcodeCaptureStatusSubmitted, result.Status)
	require.Equal(t, "24125031R360001", result.RawCode)
	require.Equal(t, "linear-wheel-v1", result.BarcodeProtocol)
	require.NotEmpty(t, result.BarcodeSummary)
}

func TestSubmitProductBarcodeCaptureSessionRejectsInvalidBarcode(t *testing.T) {
	testDB := setupProductBarcodeCaptureSessionTestDB(t)
	now := time.Now()
	sessionID := "product-barcode-" + uuid.NewString()
	token := "upload-token-002"
	require.NoError(t, testDB.Exec(
		`INSERT INTO product_barcode_capture_sessions (id, created_at, updated_at, session_id, upload_token, status, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		uuid.NewString(),
		now,
		now,
		sessionID,
		token,
		ProductBarcodeCaptureStatusWaiting,
		now.Add(30*time.Minute),
	).Error)

	_, err := SubmitProductBarcodeCaptureSession(sessionID, SubmitProductBarcodeCaptureSessionRequest{
		Token:   token,
		RawCode: "BAD-CODE",
	})
	var validationErr *ProductBarcodeBindingValidationError
	require.ErrorAs(t, err, &validationErr)
}
