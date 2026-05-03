package services

import (
	"context"
	"fmt"
	"testing"
	"time"
	"xdfc-server/audit"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func setupPackagingAssemblyTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	prevDB := db.DB
	testDB, err := gorm.Open(
		sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())),
		&gorm.Config{Logger: logger.Default.LogMode(logger.Silent)},
	)
	require.NoError(t, err)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE packaging_assembly_capture_sessions (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			session_id TEXT NOT NULL UNIQUE,
			upload_token TEXT NOT NULL,
			status TEXT,
			package_code TEXT NOT NULL,
			product_barcode_snapshot TEXT,
			assembly_id TEXT,
			submitted_at DATETIME,
			expires_at DATETIME
		);
	`).Error)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE prepreg_roll_instances (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		);
	`).Error)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE product_barcode_bindings (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			product_barcode TEXT NOT NULL UNIQUE,
			prepreg_roll_instance_id TEXT NOT NULL,
			prepreg_binding_token TEXT NOT NULL,
			prepreg_qr_code TEXT NOT NULL,
			barcode_protocol TEXT NOT NULL,
			barcode_summary TEXT NOT NULL,
			bound_at DATETIME,
			bound_by TEXT NOT NULL,
			source TEXT NOT NULL,
			status TEXT NOT NULL
		);
	`).Error)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE packaging_assemblies (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			package_code TEXT NOT NULL UNIQUE,
			status TEXT NOT NULL,
			item_count INTEGER NOT NULL,
			source TEXT NOT NULL,
			session_id TEXT,
			assembled_by TEXT NOT NULL,
			assembled_at DATETIME
		);
	`).Error)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE packaging_assembly_items (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			assembly_id TEXT NOT NULL,
			product_barcode TEXT NOT NULL UNIQUE,
			product_barcode_binding_id TEXT NOT NULL,
			barcode_protocol TEXT NOT NULL,
			barcode_summary TEXT NOT NULL,
			sort_order INTEGER NOT NULL
		);
	`).Error)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE audit_logs (
			id TEXT PRIMARY KEY NOT NULL,
			module TEXT,
			target_id TEXT,
			action TEXT,
			diff TEXT,
			operator TEXT,
			ip TEXT,
			created_at DATETIME
		);
	`).Error)
	db.DB = testDB

	t.Cleanup(func() {
		db.DB = prevDB
	})

	return testDB
}

func packagingAssemblyAuditContext() context.Context {
	return audit.NewContextWithActor(context.Background(), audit.AuditActor{
		UserID:   "packaging-audit-user-id",
		Username: "packaging-audit-user",
		IP:       "203.0.113.88",
		Source:   "http",
	})
}

func insertPackagingAssemblySession(t *testing.T, testDB *gorm.DB, sessionID string, token string) {
	t.Helper()
	now := time.Now()
	require.NoError(t, testDB.Exec(
		`INSERT INTO packaging_assembly_capture_sessions (id, created_at, updated_at, session_id, upload_token, status, package_code, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		uuid.NewString(),
		now,
		now,
		sessionID,
		token,
		PackagingAssemblyCaptureStatusWaiting,
		"PKG-TEST-001",
		now.Add(30*time.Minute),
	).Error)
}

func insertBoundProductBarcode(t *testing.T, testDB *gorm.DB, productBarcode string) {
	t.Helper()
	now := time.Now()
	require.NoError(t, testDB.Exec(
		`INSERT INTO product_barcode_bindings (id, created_at, updated_at, product_barcode, prepreg_roll_instance_id, prepreg_binding_token, prepreg_qr_code, barcode_protocol, barcode_summary, bound_at, bound_by, source, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		uuid.NewString(),
		now,
		now,
		productBarcode,
		uuid.NewString(),
		"PREPREG-BIND-001",
		"PREPREG-BIND-001",
		"linear-wheel-v1",
		"test product barcode",
		now,
		"tester",
		ProductBarcodeBindingSourceProductBindingTab,
		ProductBarcodeBindingStatusBound,
	).Error)
}

func TestCreatePackagingAssemblyCaptureSessionCreatesWaitingSessionWithoutAssemblyID(t *testing.T) {
	testDB := setupPackagingAssemblyTestDB(t)

	result, err := CreatePackagingAssemblyCaptureSession(packagingAssemblyAuditContext())
	require.NoError(t, err)
	require.NotEmpty(t, result.SessionID)
	require.NotEmpty(t, result.UploadToken)
	require.NotEmpty(t, result.PackageCode)
	require.Equal(t, PackagingAssemblyCaptureStatusWaiting, result.Status)
	require.Empty(t, result.AssemblyID)

	var storedAssemblyID *string
	require.NoError(t, testDB.
		Table("packaging_assembly_capture_sessions").
		Select("assembly_id").
		Where("session_id = ?", result.SessionID).
		Scan(&storedAssemblyID).Error)
	require.Nil(t, storedAssemblyID)

	var logs []models.AuditLog
	require.NoError(t, testDB.Find(&logs).Error)
	require.Len(t, logs, 1)
	require.Equal(t, "packaging-assembly", logs[0].Module)
	require.Equal(t, "CAPTURE_SESSION_CREATE", logs[0].Action)
	require.Equal(t, "packaging-audit-user", logs[0].Operator)
	require.Equal(t, "203.0.113.88", logs[0].IP)
}

func TestSubmitPackagingAssemblyCaptureSessionCreatesAssembly(t *testing.T) {
	testDB := setupPackagingAssemblyTestDB(t)
	sessionID := "packaging-assembly-" + uuid.NewString()
	token := "token-001"
	productBarcode := "24125031R360001"
	insertPackagingAssemblySession(t, testDB, sessionID, token)
	insertBoundProductBarcode(t, testDB, productBarcode)

	result, err := SubmitPackagingAssemblyCaptureSession(packagingAssemblyAuditContext(), sessionID, SubmitPackagingAssemblyCaptureSessionRequest{
		Token:           token,
		ProductBarcodes: []string{productBarcode},
	}, "tester")
	require.NoError(t, err)
	require.Equal(t, PackagingAssemblyCaptureStatusSubmitted, result.Status)
	require.NotNil(t, result.Assembly)
	require.Equal(t, "PKG-TEST-001", result.Assembly.PackageCode)
	require.Equal(t, 1, result.Assembly.ItemCount)
	require.Len(t, result.Assembly.Items, 1)
	require.Equal(t, productBarcode, result.Assembly.Items[0].ProductBarcode)

	var logs []models.AuditLog
	require.NoError(t, testDB.Order("created_at asc").Find(&logs).Error)
	require.Len(t, logs, 1)
	require.Equal(t, "packaging-assembly", logs[0].Module)
	require.Equal(t, result.Assembly.ID, logs[0].TargetID)
	require.Equal(t, "SUBMIT", logs[0].Action)
	require.Equal(t, "packaging-audit-user", logs[0].Operator)
	require.Equal(t, "203.0.113.88", logs[0].IP)
	require.Contains(t, string(logs[0].Diff), productBarcode)
}

func TestSubmitPackagingAssemblyCaptureSessionRequiresSystemBoundProductBarcode(t *testing.T) {
	testDB := setupPackagingAssemblyTestDB(t)
	sessionID := "packaging-assembly-" + uuid.NewString()
	token := "token-002"
	insertPackagingAssemblySession(t, testDB, sessionID, token)

	_, err := SubmitPackagingAssemblyCaptureSession(context.Background(), sessionID, SubmitPackagingAssemblyCaptureSessionRequest{
		Token:           token,
		ProductBarcodes: []string{"24125031R360001"},
	}, "tester")
	var validationErr *ProductBarcodeBindingValidationError
	require.ErrorAs(t, err, &validationErr)
	require.Contains(t, validationErr.Error(), "has not been bound")
}

func TestSubmitPackagingAssemblyCaptureSessionIsIdempotent(t *testing.T) {
	testDB := setupPackagingAssemblyTestDB(t)
	sessionID := "packaging-assembly-" + uuid.NewString()
	token := "token-003"
	productBarcode := "24125031R360002"
	insertPackagingAssemblySession(t, testDB, sessionID, token)
	insertBoundProductBarcode(t, testDB, productBarcode)

	first, err := SubmitPackagingAssemblyCaptureSession(context.Background(), sessionID, SubmitPackagingAssemblyCaptureSessionRequest{
		Token:           token,
		ProductBarcodes: []string{productBarcode},
	}, "tester")
	require.NoError(t, err)

	second, err := SubmitPackagingAssemblyCaptureSession(context.Background(), sessionID, SubmitPackagingAssemblyCaptureSessionRequest{
		Token:           token,
		ProductBarcodes: []string{productBarcode},
	}, "tester")
	require.NoError(t, err)
	require.NotNil(t, first.Assembly)
	require.NotNil(t, second.Assembly)
	require.Equal(t, first.Assembly.ID, second.Assembly.ID)

	var count int64
	require.NoError(t, testDB.Table("packaging_assemblies").Count(&count).Error)
	require.EqualValues(t, 1, count)
}

func TestSubmitPackagingAssemblyCaptureSessionRejectsTooManyItems(t *testing.T) {
	testDB := setupPackagingAssemblyTestDB(t)
	sessionID := "packaging-assembly-" + uuid.NewString()
	token := "token-004"
	insertPackagingAssemblySession(t, testDB, sessionID, token)

	productBarcodes := make([]string, 0, PackagingAssemblyMaxItemCount+1)
	for index := 0; index <= PackagingAssemblyMaxItemCount; index++ {
		productBarcodes = append(productBarcodes, fmt.Sprintf("24125031R36%04d", index))
	}

	_, err := SubmitPackagingAssemblyCaptureSession(context.Background(), sessionID, SubmitPackagingAssemblyCaptureSessionRequest{
		Token:           token,
		ProductBarcodes: productBarcodes,
	}, "tester")
	var validationErr *ProductBarcodeBindingValidationError
	require.ErrorAs(t, err, &validationErr)
	require.Contains(t, validationErr.Error(), "cannot exceed")
}
