package dependencies

import (
	"xdfc-server/models"

	"gorm.io/gorm"
)

type RoleSnapshotSynchronizer interface {
	SyncDepartment(tx *gorm.DB, deptID string) error
	SyncEmployee(tx *gorm.DB, employee models.Employee) error
}

type MiddlewareRoleSnapshotSynchronizer struct{}

func NewRoleSnapshotSynchronizer() RoleSnapshotSynchronizer {
	return MiddlewareRoleSnapshotSynchronizer{}
}

func (MiddlewareRoleSnapshotSynchronizer) SyncDepartment(tx *gorm.DB, deptID string) error {
	return nil
}

func (MiddlewareRoleSnapshotSynchronizer) SyncEmployee(tx *gorm.DB, employee models.Employee) error {
	return nil
}
