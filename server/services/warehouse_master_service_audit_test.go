package services

import (
	"context"
	"fmt"
	"strings"
	"testing"
	"time"
	"xdfc-server/audit"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupMaterialAuditServiceTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	prevDB := db.DB
	testDB, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite failed: %v", err)
	}

	statements := []string{
		`CREATE TABLE materials (
			id TEXT PRIMARY KEY NOT NULL,
			code TEXT UNIQUE,
			name TEXT,
			category TEXT,
			spec TEXT,
			internal_dimensions TEXT,
			external_dimensions TEXT,
			uom TEXT,
			min_stock REAL DEFAULT 0,
			cost_price REAL DEFAULT 0,
			supplier_id TEXT,
			description TEXT,
			images TEXT,
			status TEXT,
			revision_no TEXT,
			effective_from DATETIME,
			effective_to DATETIME,
			change_type TEXT,
			change_order_no TEXT,
			site_code TEXT,
			is_default_site BOOLEAN DEFAULT FALSE,
			version INTEGER DEFAULT 1,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		)`,
		`CREATE TABLE audit_logs (
			id TEXT PRIMARY KEY NOT NULL,
			module TEXT,
			target_id TEXT,
			action TEXT,
			diff TEXT,
			operator TEXT,
			ip TEXT,
			created_at DATETIME
		)`,
		`CREATE TABLE inventory (
			id TEXT PRIMARY KEY NOT NULL,
			material_id TEXT,
			quantity REAL DEFAULT 0,
			deleted_at DATETIME
		)`,
		`CREATE TABLE sales_order_lines (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			product_id TEXT,
			deleted_at DATETIME
		)`,
		`CREATE TABLE bom_items (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			material_id TEXT,
			deleted_at DATETIME
		)`,
		`CREATE TABLE purchase_order_lines (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			material_id TEXT,
			deleted_at DATETIME
		)`,
	}

	for _, statement := range statements {
		require.NoError(t, testDB.Exec(statement).Error)
	}

	db.DB = testDB
	t.Cleanup(func() {
		db.DB = prevDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	return testDB
}

func materialAuditTestContext() context.Context {
	return audit.NewContextWithActor(context.Background(), audit.AuditActor{
		UserID:   "material-user-1",
		Username: "material-auditor",
		IP:       "203.0.113.10",
		Source:   "http",
	})
}

func TestSaveMaterialWritesAuditWithActorAndIP(t *testing.T) {
	testDB := setupMaterialAuditServiceTestDB(t)

	saved, err := SaveMaterial(materialAuditTestContext(), SaveMaterialAPIRequest{
		Code:          "MAT-AUD-001",
		Name:          "Carbon Cloth",
		Category:      "RAW_MATERIAL",
		UOM:           "PCS",
		Status:        "Active",
		RevisionNo:    "R1",
		ChangeType:    "MANUAL",
		CostPrice:     12.5,
		MinStock:      3,
		IsDefaultSite: true,
	})
	require.NoError(t, err)
	require.NotEmpty(t, saved.ID)

	var logs []models.AuditLog
	require.NoError(t, testDB.Order("created_at asc").Find(&logs).Error)
	require.Len(t, logs, 1)
	require.Equal(t, "Material", logs[0].Module)
	require.Equal(t, saved.ID, logs[0].TargetID)
	require.Equal(t, "SAVE", logs[0].Action)
	require.Equal(t, "material-auditor", logs[0].Operator)
	require.Equal(t, "203.0.113.10", logs[0].IP)
	require.Contains(t, string(logs[0].Diff), "create")
}

func TestBulkSyncMaterialsWritesPerMaterialAuditEntries(t *testing.T) {
	testDB := setupMaterialAuditServiceTestDB(t)

	require.NoError(t, testDB.Exec(`
		INSERT INTO materials (id, code, name, category, uom, status, version, revision_no, change_type, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, "mat-existing", "MAT-BULK-001", "Old Name", "RAW_MATERIAL", "PCS", "Active", 2, "R1", "MANUAL", time.Now().UTC(), time.Now().UTC()).Error)

	err := BulkSyncMaterials(materialAuditTestContext(), BulkSyncMaterialsAPIPayload{
		GlobalVersion: 9,
		Materials: []BulkSyncMaterialAPIRequest{
			{
				Code:       "MAT-BULK-001",
				Name:       "Updated Name",
				Category:   "RAW_MATERIAL",
				UOM:        "PCS",
				Status:     "Active",
				RevisionNo: "R1",
				ChangeType: "MANUAL",
			},
			{
				Code:       "MAT-BULK-002",
				Name:       "Fresh Material",
				Category:   "RAW_MATERIAL",
				UOM:        "KG",
				Status:     "Active",
				RevisionNo: "R1",
				ChangeType: "MANUAL",
			},
		},
	})
	require.NoError(t, err)

	var logs []models.AuditLog
	require.NoError(t, testDB.Order("target_id asc").Find(&logs).Error)
	require.Len(t, logs, 2)
	for _, log := range logs {
		require.Equal(t, "Material", log.Module)
		require.Equal(t, "BULK_SYNC", log.Action)
		require.Equal(t, "material-auditor", log.Operator)
		require.Equal(t, "203.0.113.10", log.IP)
		require.Contains(t, string(log.Diff), "globalVersion")
	}
}

func TestDeleteMaterialWritesAuditAfterSuccessfulDelete(t *testing.T) {
	testDB := setupMaterialAuditServiceTestDB(t)

	require.NoError(t, testDB.Exec(`
		INSERT INTO materials (id, code, name, category, uom, status, version, revision_no, change_type, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, "mat-delete-1", "MAT-DEL-001", "Delete Me", "RAW_MATERIAL", "PCS", "Active", 1, "R1", "MANUAL", time.Now().UTC(), time.Now().UTC()).Error)

	err := DeleteMaterial(materialAuditTestContext(), "mat-delete-1")
	require.NoError(t, err)

	var material models.Material
	require.Error(t, testDB.First(&material, "id = ?", "mat-delete-1").Error)

	var logs []models.AuditLog
	require.NoError(t, testDB.Find(&logs).Error)
	require.Len(t, logs, 1)
	require.Equal(t, "DELETE", logs[0].Action)
	require.Equal(t, "material-auditor", logs[0].Operator)
	require.Equal(t, "203.0.113.10", logs[0].IP)
}

func TestDeleteMaterialBlockedDoesNotWriteSuccessAudit(t *testing.T) {
	testDB := setupMaterialAuditServiceTestDB(t)

	require.NoError(t, testDB.Exec(`
		INSERT INTO materials (id, code, name, category, uom, status, version, revision_no, change_type, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, "mat-blocked-1", "MAT-BLOCK-001", "Blocked", "RAW_MATERIAL", "PCS", "Active", 1, "R1", "MANUAL", time.Now().UTC(), time.Now().UTC()).Error)
	require.NoError(t, testDB.Exec(`INSERT INTO inventory (id, material_id, quantity) VALUES (?, ?, ?)`, "inv-1", "mat-blocked-1", 5).Error)

	err := DeleteMaterial(materialAuditTestContext(), "mat-blocked-1")
	require.ErrorIs(t, err, ErrMaterialInInventory)

	var count int64
	require.NoError(t, testDB.Model(&models.AuditLog{}).Count(&count).Error)
	require.Zero(t, count)
}

func TestPatchMaterialWritesAuditWithActorAndIP(t *testing.T) {
	testDB := setupMaterialAuditServiceTestDB(t)

	require.NoError(t, testDB.Exec(`
		INSERT INTO materials (id, code, name, category, uom, status, version, revision_no, change_type, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, "mat-patch-1", "MAT-PATCH-001", "Before Patch", "RAW_MATERIAL", "PCS", "Active", 2, "R1", "MANUAL", time.Now().UTC(), time.Now().UTC()).Error)

	updated, err := PatchMaterial(materialAuditTestContext(), PatchMaterialRequest{
		ID:              "mat-patch-1",
		ExpectedVersion: 2,
		DeltaKeys:       []string{"name"},
		Name:            stringPointer("After Patch"),
	})
	require.NoError(t, err)
	require.Equal(t, "After Patch", updated.Name)

	var logs []models.AuditLog
	require.NoError(t, testDB.Find(&logs).Error)
	require.Len(t, logs, 1)
	require.Equal(t, "PATCH", logs[0].Action)
	require.Equal(t, "material-auditor", logs[0].Operator)
	require.Equal(t, "203.0.113.10", logs[0].IP)
	require.True(t, strings.Contains(string(logs[0].Diff), "deltaKeys") || strings.Contains(string(logs[0].Diff), "name"))
}
