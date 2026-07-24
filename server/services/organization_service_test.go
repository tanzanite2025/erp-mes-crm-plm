package services

import (
	"context"
	"testing"
	"xdfc-server/repositories"

	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type organizationSaveTestTxManager struct {
	db *gorm.DB
}

func (m organizationSaveTestTxManager) DB() *gorm.DB {
	return m.db
}

func (m organizationSaveTestTxManager) WithinTransaction(fn func(tx *gorm.DB) error) error {
	return m.db.Transaction(fn)
}

func newOrganizationSaveTestService(t *testing.T) (*OrganizationService, *gorm.DB) {
	t.Helper()

	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)
	createOrganizationSaveTestSchema(t, database)

	return NewOrganizationService(
		organizationSaveTestTxManager{db: database},
		repositories.NewOrganizationRepository(),
	), database
}

func createOrganizationSaveTestSchema(t *testing.T, database *gorm.DB) {
	t.Helper()

	require.NoError(t, database.Exec(`
		CREATE TABLE organizations (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			name TEXT NOT NULL,
			parent_id TEXT,
			manager TEXT,
			description TEXT,
			type TEXT,
			linked_architecture TEXT
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

func TestSaveOrganizationGeneratesUUIDAndInfersThreeLevelHierarchy(t *testing.T) {
	service, database := newOrganizationSaveTestService(t)

	root, err := service.SaveOrganization(context.Background(), OrganizationSaveRequest{
		ID:          " ",
		Name:        "  总部  ",
		Manager:     "  张三  ",
		Description: "  根节点  ",
	})
	require.NoError(t, err)
	require.Equal(t, "company", root.Type)
	require.Equal(t, "总部", root.Name)
	require.Equal(t, "张三", root.Manager)
	require.Equal(t, "根节点", root.Description)
	require.Nil(t, root.ParentID)
	requireValidUUID(t, root.ID)

	rootID := root.ID
	department, err := service.SaveOrganization(context.Background(), OrganizationSaveRequest{
		Name:     "生产部",
		ParentID: &rootID,
	})
	require.NoError(t, err)
	require.Equal(t, "department", department.Type)
	require.NotNil(t, department.ParentID)
	require.Equal(t, root.ID, *department.ParentID)
	requireValidUUID(t, department.ID)

	departmentID := department.ID
	team, err := service.SaveOrganization(context.Background(), OrganizationSaveRequest{
		Name:     "裁纱组",
		ParentID: &departmentID,
	})
	require.NoError(t, err)
	require.Equal(t, "team", team.Type)
	require.NotNil(t, team.ParentID)
	require.Equal(t, department.ID, *team.ParentID)
	requireValidUUID(t, team.ID)

	teamID := team.ID
	_, err = service.SaveOrganization(context.Background(), OrganizationSaveRequest{
		Name:     "不允许的第四级",
		ParentID: &teamID,
	})
	require.ErrorIs(t, err, ErrOrganizationDepthExceeded)

	var auditCount int64
	require.NoError(t, database.Table("audit_logs").Count(&auditCount).Error)
	require.Equal(t, int64(3), auditCount)
}

func TestSaveOrganizationRejectsInvalidIDsBeforeDatabaseSave(t *testing.T) {
	service, _ := newOrganizationSaveTestService(t)

	_, err := service.SaveOrganization(context.Background(), OrganizationSaveRequest{
		ID:   "temporary-front-end-id",
		Name: "总部",
	})
	require.ErrorIs(t, err, ErrOrganizationIDInvalid)

	invalidParentID := "temporary-front-end-parent-id"
	_, err = service.SaveOrganization(context.Background(), OrganizationSaveRequest{
		Name:     "生产部",
		ParentID: &invalidParentID,
	})
	require.ErrorIs(t, err, ErrOrganizationParentIDInvalid)
}

func requireValidUUID(t *testing.T, value string) {
	t.Helper()

	_, err := uuid.Parse(value)
	require.NoError(t, err)
}
