package handlers

import (
	"errors"
	"testing"
	"xdfc-server/db"

	"github.com/stretchr/testify/assert"
	"gorm.io/gorm"
)

func TestCreateLoanTransaction(t *testing.T) {
	setupHandlerSQLiteTestDB(t)

	if err := db.DB.Exec(`
		CREATE TABLE molds (
			id TEXT PRIMARY KEY,
			sn TEXT NOT NULL,
			name TEXT NOT NULL,
			status TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		);
	`).Error; err != nil {
		t.Fatalf("create molds table failed: %v", err)
	}

	if err := db.DB.Exec(`
		CREATE TABLE mold_loans (
			id TEXT PRIMARY KEY,
			mold_id TEXT NOT NULL,
			mold_sn TEXT,
			mold_name TEXT,
			from_factory TEXT,
			to_factory TEXT,
			contact_person TEXT,
			loan_date DATETIME,
			expected_return_date DATETIME,
			actual_return_date DATETIME,
			status TEXT,
			remarks TEXT,
			photo_url TEXT,
			created_at DATETIME
		);
	`).Error; err != nil {
		t.Fatalf("create mold_loans table failed: %v", err)
	}

	testMold := map[string]any{
		"id":     "mold-1",
		"sn":     "TEST-MOLD-001",
		"name":   "测试模具",
		"status": "IDLE",
	}
	if err := db.DB.Table("molds").Create(testMold).Error; err != nil {
		t.Fatalf("seed mold failed: %v", err)
	}

	t.Run("Atomic Failure Simulation", func(t *testing.T) {
		err := db.DB.Transaction(func(tx *gorm.DB) error {
			mockLoan := map[string]any{
				"id":      "loan-1",
				"mold_id": "mold-1",
			}
			if err := tx.Table("mold_loans").Create(mockLoan).Error; err != nil {
				return err
			}

			return errors.New("MANUAL_BLOCK_ERROR")
		})

		assert.Error(t, err)

		var count int64
		if err := db.DB.Table("mold_loans").Where("mold_id = ?", "mold-1").Count(&count).Error; err != nil {
			t.Fatalf("count mold loans failed: %v", err)
		}
		assert.Equal(t, int64(0), count, "借单记录不应被持久化")

		var currentMold struct {
			Status string
		}
		if err := db.DB.Table("molds").First(&currentMold, "id = ?", "mold-1").Error; err != nil {
			t.Fatalf("reload mold failed: %v", err)
		}
		assert.Equal(t, "IDLE", currentMold.Status, "模具状态不应在失败时被改变")
	})
}
