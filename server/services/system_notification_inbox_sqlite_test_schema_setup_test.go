package services

import (
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"testing"
	"xdfc-server/models"
)

// SQLite fixtures explicitly create the outbox schema because the production
// BaseModel uses PostgreSQL's gen_random_uuid() default.
func createSystemNotificationInboxAndDeliverySQLiteTestSchema(t *testing.T, database *gorm.DB) {
	t.Helper()
	require.NoError(t, database.AutoMigrate(&models.SystemNotificationInboxEntry{}))
	require.NoError(t, database.Exec(`CREATE TABLE IF NOT EXISTS workflow_notification_outbox_entries (
 id TEXT PRIMARY KEY, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME,
 payload BLOB NOT NULL, inbox_entry_id TEXT, execution_log_id TEXT, attempts INTEGER DEFAULT 0,
 next_attempt_at DATETIME, delivered_at DATETIME, canceled_at DATETIME, failed_at DATETIME, last_error TEXT
 )`).Error)
}
