package services

import (
	"testing"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type productionOutsourcePartnerTestTxManager struct {
	db *gorm.DB
}

func (m productionOutsourcePartnerTestTxManager) DB() *gorm.DB {
	return m.db
}

func (m productionOutsourcePartnerTestTxManager) WithinTransaction(fn func(tx *gorm.DB) error) error {
	return m.db.Transaction(fn)
}

func newProductionOutsourcePartnerTestService(t *testing.T) (*ProductionOutsourcingService, *gorm.DB) {
	t.Helper()

	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)
	createProductionOutsourcePartnerTestSchema(t, database)

	return NewProductionOutsourcingService(productionOutsourcePartnerTestTxManager{db: database}), database
}

func createProductionOutsourcePartnerTestSchema(t *testing.T, database *gorm.DB) {
	t.Helper()

	require.NoError(t, database.Exec(`
		CREATE TABLE suppliers (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			code TEXT NOT NULL,
			deleted_at DATETIME
		)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE TABLE production_outsource_partners (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			code TEXT NOT NULL UNIQUE,
			name TEXT NOT NULL,
			supplier_id TEXT,
			supplier_name_snapshot TEXT,
			contact_person TEXT,
			contact_phone TEXT,
			email TEXT,
			address TEXT,
			quality_grade TEXT,
			status TEXT,
			lead_time_days INTEGER,
			settlement_policy TEXT,
			notes TEXT,
			operator TEXT,
			version INTEGER
		)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE TABLE audit_logs (
			id TEXT PRIMARY KEY,
			module TEXT,
			target_id TEXT,
			action TEXT,
			diff TEXT,
			operator TEXT,
			ip TEXT,
			created_at DATETIME
		)
	`).Error)
}

func seedOutsourcePartnerSupplier(t *testing.T, database *gorm.DB) {
	t.Helper()
	require.NoError(t, database.Exec(
		"INSERT INTO suppliers (id, name, code) VALUES (?, ?, ?)",
		"supplier-a",
		"协作供应商A",
		"SUP-A",
	).Error)
}

func TestCreateOutsourcePartnerStoresSupplierSnapshotAndAudit(t *testing.T) {
	service, database := newProductionOutsourcePartnerTestService(t)
	seedOutsourcePartnerSupplier(t, database)

	created, err := service.CreateOutsourcePartner(SaveOutsourcePartnerRequest{
		Partner: OutsourcePartnerDTO{
			Code:         " os-001 ",
			Name:         " 外协加工厂 ",
			SupplierID:   "supplier-a",
			QualityGrade: "a",
			Status:       "on_review",
			LeadTimeDays: 3,
		},
		ActorID:  "user-a",
		Operator: "tester",
		IP:       "127.0.0.1",
	})

	require.NoError(t, err)
	require.NotEmpty(t, created.ID)
	require.Equal(t, "OS-001", created.Code)
	require.Equal(t, "外协加工厂", created.Name)
	require.Equal(t, "协作供应商A", created.SupplierNameSnapshot)
	require.Equal(t, OutsourcePartnerStatusOnReview, created.Status)
	require.Equal(t, int64(1), created.Version)

	var auditCount int64
	require.NoError(t, database.Model(&models.AuditLog{}).Where("module = ?", AuditModuleOutsourcePartner).Count(&auditCount).Error)
	require.Equal(t, int64(1), auditCount)
}

func TestCreateOutsourcePartnerRejectsMissingSupplier(t *testing.T) {
	service, _ := newProductionOutsourcePartnerTestService(t)

	_, err := service.CreateOutsourcePartner(SaveOutsourcePartnerRequest{
		Partner: OutsourcePartnerDTO{
			Code:       "OS-002",
			Name:       "外协加工厂",
			SupplierID: "missing-supplier",
		},
	})

	require.ErrorIs(t, err, ErrInvalidOutsourcePartner)
}

func TestCreateOutsourcePartnerRejectsDuplicateCode(t *testing.T) {
	service, _ := newProductionOutsourcePartnerTestService(t)

	_, err := service.CreateOutsourcePartner(SaveOutsourcePartnerRequest{
		Partner: OutsourcePartnerDTO{Code: "OS-003", Name: "外协加工厂A"},
	})
	require.NoError(t, err)

	_, err = service.CreateOutsourcePartner(SaveOutsourcePartnerRequest{
		Partner: OutsourcePartnerDTO{Code: " os-003 ", Name: "外协加工厂B"},
	})

	require.ErrorIs(t, err, ErrOutsourcePartnerDuplicateCode)
}

func TestListOutsourcePartnersWithoutStatusFilterReturnsAllStatuses(t *testing.T) {
	service, _ := newProductionOutsourcePartnerTestService(t)

	_, err := service.CreateOutsourcePartner(SaveOutsourcePartnerRequest{
		Partner: OutsourcePartnerDTO{Code: "OS-004-A", Name: "启用单位", Status: OutsourcePartnerStatusActive},
	})
	require.NoError(t, err)
	_, err = service.CreateOutsourcePartner(SaveOutsourcePartnerRequest{
		Partner: OutsourcePartnerDTO{Code: "OS-004-B", Name: "评审单位", Status: OutsourcePartnerStatusOnReview},
	})
	require.NoError(t, err)

	response, err := service.ListOutsourcePartners(OutsourcePartnerListQuery{})

	require.NoError(t, err)
	require.Len(t, response.Items, 2)
	require.Equal(t, 2, response.Metadata.Total)
	require.Equal(t, 1, response.Metadata.Active)
	require.Equal(t, 1, response.Metadata.OnReview)
}

func TestUpdateOutsourcePartnerUsesVersionAndWritesAudit(t *testing.T) {
	service, database := newProductionOutsourcePartnerTestService(t)

	created, err := service.CreateOutsourcePartner(SaveOutsourcePartnerRequest{
		Partner: OutsourcePartnerDTO{Code: "OS-005", Name: "外协加工厂A"},
	})
	require.NoError(t, err)

	updated, err := service.UpdateOutsourcePartner(UpdateOutsourcePartnerRequest{
		ID: created.ID,
		Partner: OutsourcePartnerDTO{
			Code:             "OS-005",
			Name:             "外协加工厂A-更新",
			Status:           OutsourcePartnerStatusActive,
			QualityGrade:     "B",
			LeadTimeDays:     5,
			SettlementPolicy: "月结",
			Version:          created.Version,
		},
		Operator: "tester",
	})

	require.NoError(t, err)
	require.Equal(t, "外协加工厂A-更新", updated.Name)
	require.Equal(t, int64(2), updated.Version)
	require.Equal(t, "tester", updated.Operator)

	var auditCount int64
	require.NoError(t, database.Model(&models.AuditLog{}).Where("module = ?", AuditModuleOutsourcePartner).Count(&auditCount).Error)
	require.Equal(t, int64(2), auditCount)

	_, err = service.UpdateOutsourcePartner(UpdateOutsourcePartnerRequest{
		ID:      created.ID,
		Partner: OutsourcePartnerDTO{Code: "OS-005", Name: "过期版本", Version: created.Version},
	})
	require.ErrorIs(t, err, ErrOutsourcePartnerVersionConflict)
}
