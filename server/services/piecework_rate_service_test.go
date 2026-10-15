package services

import (
	"context"
	"encoding/json"
	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"testing"
	"time"
	"xdfc-server/audit"
	"xdfc-server/db"
	"xdfc-server/models"
)

type pieceworkRateTestTxManager struct{ db *gorm.DB }

func (m pieceworkRateTestTxManager) DB() *gorm.DB { return m.db }
func (m pieceworkRateTestTxManager) WithinTransaction(fn func(tx *gorm.DB) error) error {
	return m.db.Transaction(fn)
}

const pieceworkTestPayItemID = "44444444-4444-4444-8444-444444444444"

func newPieceworkRateTestService(t *testing.T) (*PieceworkRateService, *gorm.DB) {
	t.Helper()
	database, err := gorm.Open(sqlite.Open("file:"+uuid.NewString()+"?mode=memory&cache=shared"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	sqlDB, err := database.DB()
	require.NoError(t, err)
	sqlDB.SetMaxOpenConns(1)
	t.Cleanup(func() { require.NoError(t, sqlDB.Close()) })
	createIndependentPieceworkPayrollSQLiteTables(t, database)
	return NewPieceworkRateService(pieceworkRateTestTxManager{db: database}), database
}

// Deliberately no product, route, process, barcode, or production execution tables.
func createIndependentPieceworkPayrollSQLiteTables(t *testing.T, database *gorm.DB) {
	t.Helper()
	for _, statement := range []string{
		`CREATE TABLE audit_logs(id TEXT PRIMARY KEY,module TEXT,target_id TEXT,action TEXT,diff TEXT,operator TEXT,ip TEXT,created_at DATETIME)`,
	} {
		require.NoError(t, database.Exec(statement).Error)
	}
	require.NoError(t, db.EnsureIndependentPieceworkPayrollStorageContract(database))
	seedPieceworkAttributionTestIdentities(t, database)
	require.NoError(t, database.Create(&models.PieceworkPayItem{BaseModel: models.BaseModel{ID: pieceworkTestPayItemID}, Code: "PAY-001", Name: "Independent payroll item", Unit: "PCS", Status: "active", Version: 1}).Error)
}

func pieceworkRateTestContext() context.Context {
	return audit.NewContextWithActor(context.Background(), audit.AuditActor{UserID: pieceworkTestReportingUserID, Username: "tester", IP: "127.0.0.1", Source: "test"})
}
func pointerFloat(value float64) *float64    { return &value }
func pieceworkTestDate(day string) time.Time { date, _ := time.Parse("2006-01-02", day); return date }
func pieceworkTestRateCommand() PieceworkRateCommand {
	date := pieceworkTestDate("2026-10-01")
	return PieceworkRateCommand{PayItemID: pieceworkTestPayItemID, Unit: "PCS", UnitPrice: 2, Currency: "CNY", EffectiveFrom: &date, Status: "active"}
}

func TestPieceworkRatePayrollContractHasNoProductionColumnsOrResponseAliases(t *testing.T) {
	service, database := newPieceworkRateTestService(t)
	saved, err := service.CreatePieceworkRate(pieceworkRateTestContext(), pieceworkTestRateCommand())
	require.NoError(t, err)
	require.Equal(t, pieceworkTestPayItemID, saved.PayItemID)
	require.Equal(t, "PAY-001", saved.PayItemCode)
	payload, err := json.Marshal(saved)
	require.NoError(t, err)
	var response map[string]any
	require.NoError(t, json.Unmarshal(payload, &response))
	for _, field := range []string{"productId", "processStepId", "routeStepId", "processCode", "processName", "piecePrice", "effectiveAt", "isLegacy"} {
		require.NotContains(t, response, field)
	}
	for _, column := range []string{"product_id", "process_step_id", "route_step_id", "process_code", "process_name", "piece_price", "effective_at"} {
		require.False(t, database.Migrator().HasColumn("piecework_rates", column))
	}
	for _, table := range []string{"products", "process_steps", "production_routes", "production_route_steps"} {
		require.False(t, database.Migrator().HasTable(table))
	}
	rows, err := service.ListPieceworkRates()
	require.NoError(t, err)
	require.Len(t, rows, 1)
	require.Equal(t, saved.ID, rows[0].ID)
}

func TestPieceworkRatePayrollIntervalsAreHalfOpenAndRejectOverlapAndStaleChanges(t *testing.T) {
	service, database := newPieceworkRateTestService(t)
	cmd := pieceworkTestRateCommand()
	end := pieceworkTestDate("2026-10-15")
	cmd.EffectiveTo = &end
	original, err := service.CreatePieceworkRate(pieceworkRateTestContext(), cmd)
	require.NoError(t, err)
	_, err = service.CreatePieceworkRate(pieceworkRateTestContext(), cmd)
	require.ErrorIs(t, err, ErrInvalidPieceworkRate)
	cmd.EffectiveFrom, cmd.EffectiveTo, cmd.UnitPrice = &end, nil, 4
	next, err := service.CreatePieceworkRate(pieceworkRateTestContext(), cmd)
	require.NoError(t, err)
	resolver := NewPieceworkRateResolver(pieceworkRateTestTxManager{db: database})
	match, err := resolver.Resolve(pieceworkRateTestContext(), PieceworkRateLookup{PayItemID: cmd.PayItemID, Unit: cmd.Unit, At: end})
	require.NoError(t, err)
	require.Equal(t, next.ID, match.Rate.ID)
	_, err = resolver.Resolve(pieceworkRateTestContext(), PieceworkRateLookup{PayItemID: cmd.PayItemID, Unit: "KG", At: end})
	require.ErrorIs(t, err, ErrPieceworkRateNotFound)
	update := PieceworkRatePatchCommand{UnitPrice: PieceworkRatePatchField[float64]{Set: true, Value: pointerFloat(3)}}
	updated, err := service.PatchPieceworkRate(pieceworkRateTestContext(), original.ID, update, original.Version)
	require.NoError(t, err)
	require.Equal(t, int64(2), updated.Version)
	_, err = service.PatchPieceworkRate(pieceworkRateTestContext(), original.ID, update, original.Version)
	require.ErrorIs(t, err, ErrPieceworkRateVersionConflict)
	require.ErrorIs(t, service.DeletePieceworkRate(pieceworkRateTestContext(), original.ID, original.Version), ErrPieceworkRateVersionConflict)
	require.NoError(t, service.DeletePieceworkRate(pieceworkRateTestContext(), original.ID, updated.Version))
	var auditCount int64
	require.NoError(t, database.Table("audit_logs").Where("target_id = ?", original.ID).Count(&auditCount).Error)
	require.Equal(t, int64(3), auditCount)
}

func TestPieceworkRatePayrollRejectsMissingIdentityDateUnitAndInvalidDecimals(t *testing.T) {
	service, _ := newPieceworkRateTestService(t)
	for _, change := range []func(*PieceworkRateCommand){
		func(c *PieceworkRateCommand) { c.PayItemID = "" },
		func(c *PieceworkRateCommand) { c.EffectiveFrom = nil },
		func(c *PieceworkRateCommand) { c.Unit = "" },
		func(c *PieceworkRateCommand) { c.Unit = "KG" },
		func(c *PieceworkRateCommand) { c.UnitPrice = -1 },
		func(c *PieceworkRateCommand) { c.UnitPrice = 1.00001 },
		func(c *PieceworkRateCommand) { c.UnitPrice = 1000000 },
		func(c *PieceworkRateCommand) { c.Status = "anything" },
		func(c *PieceworkRateCommand) { c.Currency = "CN" },
	} {
		c := pieceworkTestRateCommand()
		change(&c)
		_, err := service.CreatePieceworkRate(pieceworkRateTestContext(), c)
		require.Error(t, err)
	}
	_, err := service.UpdatePieceworkRate(pieceworkRateTestContext(), "", pieceworkTestRateCommand(), 1)
	require.ErrorIs(t, err, ErrInvalidPieceworkRate)
}

func TestPieceworkRatePatchRequiresFullSDRTSAndRejectsProductionIdentities(t *testing.T) {
	for _, field := range []string{"productId", "processStepId", "routeStepId", "processCode", "processName", "piecePrice", "effectiveAt", "id", "version", "payItemName"} {
		_, err := DecodePieceworkRatePatchDelta(map[string]json.RawMessage{field: json.RawMessage(`{"o":"old","n":"new"}`)})
		require.Error(t, err, field)
	}
	_, err := DecodePieceworkRatePatchDelta(map[string]json.RawMessage{"unitPrice": json.RawMessage(`{"n":2}`)})
	require.Error(t, err)
	cmd, err := DecodePieceworkRatePatchDelta(map[string]json.RawMessage{"unitPrice": json.RawMessage(`{"o":2,"n":0}`), "effectiveTo": json.RawMessage(`{"o":"2026-10-15","n":null}`)})
	require.NoError(t, err)
	require.Equal(t, 0.0, *cmd.UnitPrice.Value)
	require.True(t, cmd.EffectiveTo.Set)
	require.Nil(t, cmd.EffectiveTo.Value)
}

func TestPieceworkPayItemMaintenanceKeepsUsedUnitAndVersionStable(t *testing.T) {
	rates, database := newPieceworkRateTestService(t)
	service := NewPieceworkPayItemService(pieceworkRateTestTxManager{db: database})
	item, err := service.SavePieceworkPayItem(pieceworkRateTestContext(), PieceworkPayItemCommand{Code: "PAY-NEW", Name: "Payroll work", Unit: "H", Status: "active"})
	require.NoError(t, err)
	_, err = service.SavePieceworkPayItem(pieceworkRateTestContext(), PieceworkPayItemCommand{Code: "pay-new", Name: "Duplicate", Unit: "H"})
	require.ErrorIs(t, err, ErrInvalidPieceworkPayItem)
	_, err = service.SavePieceworkPayItem(pieceworkRateTestContext(), PieceworkPayItemCommand{ID: item.ID, Version: 0, Code: item.Code, Name: item.Name, Unit: item.Unit})
	require.ErrorIs(t, err, ErrPieceworkRateVersionConflict)
	_, err = rates.CreatePieceworkRate(pieceworkRateTestContext(), pieceworkTestRateCommand())
	require.NoError(t, err)
	_, err = service.SavePieceworkPayItem(pieceworkRateTestContext(), PieceworkPayItemCommand{ID: pieceworkTestPayItemID, Version: 1, Code: "PAY-001", Name: "Renamed", Unit: "KG"})
	require.ErrorIs(t, err, ErrInvalidPieceworkPayItem)
	saved, err := service.SavePieceworkPayItem(pieceworkRateTestContext(), PieceworkPayItemCommand{ID: pieceworkTestPayItemID, Version: 1, Code: "PAY-001", Name: "Renamed", Unit: "PCS", Status: "inactive"})
	require.NoError(t, err)
	require.Equal(t, int64(2), saved.Version)
	_, err = rates.CreatePieceworkRate(pieceworkRateTestContext(), pieceworkTestRateCommand())
	require.ErrorIs(t, err, ErrInvalidPieceworkPayItem)
}
