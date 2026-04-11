package dependencies

import (
	"strings"
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
	if tx == nil {
		return nil
	}

	normalizedDeptID := strings.TrimSpace(deptID)
	if normalizedDeptID == "" || !tx.Migrator().HasTable(&models.Employee{}) {
		return nil
	}

	var employees []models.Employee
	if err := tx.Select("id", "staff_id", "dept_id").
		Where("dept_id = ?", normalizedDeptID).
		Find(&employees).Error; err != nil {
		return err
	}

	for _, employee := range employees {
		if err := (MiddlewareRoleSnapshotSynchronizer{}).SyncEmployee(tx, employee); err != nil {
			return err
		}
	}

	return nil
}

func (MiddlewareRoleSnapshotSynchronizer) SyncEmployee(tx *gorm.DB, employee models.Employee) error {
	if tx == nil || !tx.Migrator().HasTable(&models.User{}) {
		return nil
	}

	employeeID := strings.TrimSpace(employee.ID)
	staffID := strings.TrimSpace(employee.StaffID)
	if employeeID == "" && staffID == "" {
		return nil
	}

	query := tx.Model(&models.User{}).
		Select("id", "username", "role", "status", "employee_id")
	if employeeID != "" && staffID != "" {
		query = query.Where("LOWER(employee_id) IN ?", []string{strings.ToLower(employeeID), strings.ToLower(staffID)})
	} else if employeeID != "" {
		query = query.Where("LOWER(employee_id) = ?", strings.ToLower(employeeID))
	} else {
		query = query.Where("LOWER(employee_id) = ?", strings.ToLower(staffID))
	}

	var users []models.User
	if err := query.Find(&users).Error; err != nil {
		return err
	}

	if len(users) == 0 {
		return nil
	}

	identityAccess := NewIdentityAccessServiceWithDB(tx)
	for _, user := range users {
		snapshot, err := identityAccess.ResolveSnapshotForUser(user)
		if err != nil {
			return err
		}

		nextPrimaryRoleID := strings.TrimSpace(snapshot.PrimaryRoleID)
		if nextPrimaryRoleID == "" || strings.EqualFold(strings.TrimSpace(user.Role), nextPrimaryRoleID) {
			continue
		}

		if err := tx.Model(&models.User{}).
			Where("id = ?", user.ID).
			Update("role", nextPrimaryRoleID).Error; err != nil {
			return err
		}
	}

	return nil
}
