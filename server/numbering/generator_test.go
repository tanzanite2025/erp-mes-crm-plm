package numbering

import (
	"errors"
	"path/filepath"
	"strings"
	"testing"
	"time"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func TestDefaultLinearBarcodeRuleProducesFourDigitSerials(t *testing.T) {
	rule, ok := buildDefaultNumberingRule("LINEAR_BARCODE_WHEEL")
	if !ok {
		t.Fatal("expected a default linear barcode numbering rule")
	}
	if rule.Pattern != "{SEQ}" || rule.Padding != 4 || rule.ResetPeriod != "MONTHLY" {
		t.Fatalf("unexpected default rule: %+v", rule)
	}

	value := formatNumberingRuleValue(rule, 23, time.Date(2026, 7, 19, 0, 0, 0, 0, time.UTC))
	if value != "0023" {
		t.Fatalf("expected 0023, got %s", value)
	}
}

func TestDefaultSupplierRuleProducesDailyPurchaseOwnedNumbers(t *testing.T) {
	rule, ok := buildDefaultNumberingRule("PURCHASE_SUPPLIER")
	if !ok {
		t.Fatal("expected a default supplier numbering rule")
	}
	if rule.Pattern != "XD-S-{YYYYMMDD}-{SEQ}" || rule.Padding != 4 || rule.ResetPeriod != "DAILY" {
		t.Fatalf("unexpected default rule: %+v", rule)
	}

	now := time.Date(2026, 7, 19, 0, 0, 0, 0, time.UTC)
	if value := formatNumberingRuleValue(rule, 23, now); value != "XD-S-20260719-0023" {
		t.Fatalf("unexpected supplier number: %s", value)
	}
	if resetTag := resolveResetTag(rule.ResetPeriod, now); resetTag != "20260719" {
		t.Fatalf("unexpected supplier reset tag: %s", resetTag)
	}
}

func TestSupplierNumberReservationRollsBackWithTransaction(t *testing.T) {
	database, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "numbering.db")), &gorm.Config{})
	if err != nil {
		t.Fatalf("open test database: %v", err)
	}
	sqlDB, err := database.DB()
	if err != nil {
		t.Fatalf("open sql database: %v", err)
	}
	t.Cleanup(func() { _ = sqlDB.Close() })
	if err := database.Exec(`
		CREATE TABLE numbering_rules (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			rule_key TEXT NOT NULL UNIQUE,
			prefix TEXT,
			pattern TEXT,
			current_seq INTEGER DEFAULT 0,
			padding INTEGER DEFAULT 4,
			reset_period TEXT,
			last_reset TEXT
		)
	`).Error; err != nil {
		t.Fatalf("create numbering rule table: %v", err)
	}

	generate := func(rollback bool) (string, error) {
		var value string
		err := database.Transaction(func(tx *gorm.DB) error {
			generated, err := GenerateNextNumberTx(tx, "PURCHASE_SUPPLIER")
			if err != nil {
				return err
			}
			value = generated
			if rollback {
				return errRollbackNumberReservation
			}
			return nil
		})
		return value, err
	}

	first, err := generate(false)
	if err != nil || !strings.HasSuffix(first, "0001") {
		t.Fatalf("unexpected first reservation: value=%s err=%v", first, err)
	}
	rolledBack, err := generate(true)
	if !errors.Is(err, errRollbackNumberReservation) || !strings.HasSuffix(rolledBack, "0002") {
		t.Fatalf("unexpected rolled-back reservation: value=%s err=%v", rolledBack, err)
	}
	second, err := generate(false)
	if err != nil || !strings.HasSuffix(second, "0002") {
		t.Fatalf("expected rollback to release 0002: value=%s err=%v", second, err)
	}
}

var errRollbackNumberReservation = errors.New("rollback number reservation")

func TestFormatNumberingRuleValuePreservesContractRules(t *testing.T) {
	rule := models.NumberingRule{
		Prefix:  "ZP6AGS",
		Pattern: "{PREFIX}{YYMM}{SEQ}",
		Padding: 4,
	}
	value := formatNumberingRuleValue(rule, 7, time.Date(2026, 7, 19, 0, 0, 0, 0, time.UTC))
	if value != "ZP6AGS26070007" {
		t.Fatalf("unexpected contract number: %s", value)
	}
}
