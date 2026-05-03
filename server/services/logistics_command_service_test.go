package services

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"
	"time"
	"xdfc-server/audit"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupLogisticsCommandServiceTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	prevDB := db.DB
	testDB, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())), &gorm.Config{})
	require.NoError(t, err)

	statements := []string{
		`CREATE TABLE logistics_records (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			order_no TEXT,
			sales_order_id TEXT,
			purchase_order_id TEXT,
			product_id TEXT,
			shipment_id TEXT,
			type TEXT,
			carrier TEXT,
			tracking_no TEXT,
			status TEXT,
			last_location TEXT,
			events BLOB,
			version INTEGER DEFAULT 1,
			is_deleted BOOLEAN DEFAULT FALSE
		)`,
		`CREATE TABLE purchase_orders (
			id TEXT PRIMARY KEY NOT NULL,
			order_no TEXT,
			supplier_id TEXT,
			supplier_name TEXT,
			order_date TEXT,
			expected_date TEXT,
			status TEXT,
			currency TEXT,
			amount REAL,
			exchange_rate REAL,
			purchaser TEXT,
			payment_method TEXT,
			payment_method_name TEXT,
			payment_term TEXT,
			payment_term_name TEXT,
			note TEXT,
			evidences BLOB,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			is_deleted BOOLEAN DEFAULT FALSE,
			version INTEGER DEFAULT 1
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
		`CREATE TABLE notification_rules (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			name TEXT,
			enabled NUMERIC,
			entity TEXT,
			source_code TEXT,
			action_code TEXT,
			segments BLOB,
			version INTEGER
		)`,
		`CREATE TABLE rule_execution_logs (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			event_key TEXT,
			entity TEXT,
			source_code TEXT,
			action_code TEXT,
			status_code TEXT,
			rule_id TEXT,
			rule_name TEXT,
			segment_id TEXT,
			segment_title TEXT,
			execution_type TEXT,
			execution_status TEXT,
			command_id TEXT,
			title TEXT,
			content TEXT,
			action_url TEXT,
			targets BLOB,
			metadata BLOB,
			result BLOB,
			error_message TEXT,
			triggered_at DATETIME
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

func logisticsCommandAuditContext() context.Context {
	return audit.NewContextWithActor(context.Background(), audit.AuditActor{
		UserID:   "logistics-audit-user-id",
		Username: "logistics-audit-user",
		IP:       "203.0.113.91",
		Source:   "http",
	})
}

func seedPurchaseStatusRule(t *testing.T, testDB *gorm.DB, ruleID string, targetStatus string) {
	t.Helper()
	segments, err := json.Marshal([]RuleSegmentDTO{{
		ID:             "segment-1",
		Title:          "Awaiting routing",
		TargetStatuses: []string{targetStatus},
	}})
	require.NoError(t, err)
	require.NoError(t, testDB.Create(&models.NotificationRule{
		BaseModel:  models.BaseModel{ID: ruleID},
		Name:       "Purchase logistics status routing",
		Enabled:    true,
		Entity:     businessEventEntityOrder,
		SourceCode: businessEventSourcePurchaseOrder,
		ActionCode: businessEventActionStatusChange,
		Segments:   segments,
		Version:    1,
	}).Error)
}

func TestSaveLogisticsRecordCreateWritesAuditWithActorAndIP(t *testing.T) {
	testDB := setupLogisticsCommandServiceTestDB(t)

	created, err := SaveLogisticsRecord(logisticsCommandAuditContext(), models.LogisticsRecord{
		OrderNo:    "SO-LOG-001",
		ShipmentID: "shipment-1",
		Type:       "Shipment",
		Carrier:    "SF",
		TrackingNo: "SF-LOG-001",
		Status:     "Pending",
	})
	require.NoError(t, err)
	require.NotEmpty(t, created.ID)
	require.NotEmpty(t, created.Events)

	var logs []models.AuditLog
	require.NoError(t, testDB.Find(&logs).Error)
	require.Len(t, logs, 1)
	require.Equal(t, AuditModuleLogistics, logs[0].Module)
	require.Equal(t, "CREATE", logs[0].Action)
	require.Equal(t, "logistics-audit-user", logs[0].Operator)
	require.Equal(t, "203.0.113.91", logs[0].IP)
	require.Contains(t, string(logs[0].Diff), "SF-LOG-001")
}

func TestSaveLogisticsRecordUpdateWritesAuditWithActorAndIP(t *testing.T) {
	testDB := setupLogisticsCommandServiceTestDB(t)
	now := time.Now().UTC()
	require.NoError(t, testDB.Exec(`
		INSERT INTO logistics_records (id, created_at, updated_at, order_no, shipment_id, type, carrier, tracking_no, status, last_location, version, is_deleted)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, "logistics-update-1", now, now, "SO-LOG-002", "shipment-2", "Shipment", "SF", "SF-LOG-002", "Pending", "Shanghai", 1, false).Error)

	updated, err := SaveLogisticsRecord(logisticsCommandAuditContext(), models.LogisticsRecord{
		BaseModel:    models.BaseModel{ID: "logistics-update-1"},
		OrderNo:      "SO-LOG-002",
		ShipmentID:   "shipment-2",
		Type:         "Shipment",
		Carrier:      "SF",
		TrackingNo:   "SF-LOG-002",
		Status:       "InTransit",
		LastLocation: "Suzhou",
	})
	require.NoError(t, err)
	require.Equal(t, "InTransit", updated.Status)
	require.Equal(t, "Suzhou", updated.LastLocation)

	var logs []models.AuditLog
	require.NoError(t, testDB.Find(&logs).Error)
	require.Len(t, logs, 1)
	require.Equal(t, AuditModuleLogistics, logs[0].Module)
	require.Equal(t, "UPDATE", logs[0].Action)
	require.Equal(t, "logistics-audit-user", logs[0].Operator)
	require.Contains(t, string(logs[0].Diff), "Suzhou")
}

func TestUpdateLogisticsStatusWritesAuditAndPropagatesActorToPurchaseStatusEvent(t *testing.T) {
	testDB := setupLogisticsCommandServiceTestDB(t)
	now := time.Now().UTC()
	require.NoError(t, testDB.Exec(`
		INSERT INTO purchase_orders (id, order_no, supplier_name, status, currency, amount, exchange_rate, purchaser, created_at, updated_at, is_deleted, version)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, "po-log-1", "PO-LOG-001", "ACME", "Sent", "CNY", 88.0, 1.0, "buyer-a", now, now, false, 1).Error)
	require.NoError(t, testDB.Exec(`
		INSERT INTO logistics_records (id, created_at, updated_at, order_no, purchase_order_id, type, carrier, tracking_no, status, version, is_deleted)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, "log-status-1", now, now, "PO-LOG-001", "po-log-1", "Receipt", "SF", "SF-STATUS-001", "Pending", 1, false).Error)
	seedPurchaseStatusRule(t, testDB, "rule-1", "Awaiting")

	updated, err := UpdateLogisticsStatus(logisticsCommandAuditContext(), "log-status-1", UpdateLogisticsStatusInput{
		Status:      "InTransit",
		Location:    "Shenzhen",
		Description: "departed",
		EventsJSON:  []byte(`[]`),
		Version:     1,
	})
	require.NoError(t, err)
	require.Equal(t, "InTransit", updated.Status)
	require.Equal(t, "Shenzhen", updated.LastLocation)

	var purchaseStatus string
	require.NoError(t, testDB.Raw(`SELECT status FROM purchase_orders WHERE id = ?`, "po-log-1").Scan(&purchaseStatus).Error)
	require.Equal(t, "Awaiting", purchaseStatus)

	var logs []models.AuditLog
	require.NoError(t, testDB.Order("created_at asc").Find(&logs).Error)
	require.Len(t, logs, 1)
	require.Equal(t, AuditModuleLogistics, logs[0].Module)
	require.Equal(t, "STATUS_CHANGE", logs[0].Action)
	require.Equal(t, "logistics-audit-user", logs[0].Operator)
	require.Equal(t, "203.0.113.91", logs[0].IP)
	require.Contains(t, string(logs[0].Diff), "Shenzhen")

	var executionLogs []models.RuleExecutionLog
	require.NoError(t, testDB.Order("execution_type asc").Find(&executionLogs).Error)
	require.Len(t, executionLogs, 1)
	require.Equal(t, "match", executionLogs[0].ExecutionType)
	require.Contains(t, string(executionLogs[0].Metadata), `"actorId":"logistics-audit-user-id"`)
	require.Contains(t, string(executionLogs[0].Metadata), `"operator":"logistics-audit-user"`)
}

func TestDeleteLogisticsRecordWritesAuditWithActorAndIP(t *testing.T) {
	testDB := setupLogisticsCommandServiceTestDB(t)
	now := time.Now().UTC()
	require.NoError(t, testDB.Exec(`
		INSERT INTO logistics_records (id, created_at, updated_at, order_no, type, carrier, tracking_no, status, version, is_deleted)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, "log-delete-1", now, now, "SO-DEL-001", "Shipment", "SF", "SF-DEL-001", "Pending", 1, false).Error)

	require.NoError(t, DeleteLogisticsRecord(logisticsCommandAuditContext(), "log-delete-1"))

	var deleted models.LogisticsRecord
	require.NoError(t, testDB.First(&deleted, "id = ?", "log-delete-1").Error)
	require.True(t, deleted.IsDeleted)
	require.Equal(t, "Canceled", deleted.Status)

	var logs []models.AuditLog
	require.NoError(t, testDB.Find(&logs).Error)
	require.Len(t, logs, 1)
	require.Equal(t, AuditModuleLogistics, logs[0].Module)
	require.Equal(t, "DELETE", logs[0].Action)
	require.Equal(t, "logistics-audit-user", logs[0].Operator)
	require.Equal(t, "203.0.113.91", logs[0].IP)
	require.Contains(t, string(logs[0].Diff), "SF-DEL-001")
}
