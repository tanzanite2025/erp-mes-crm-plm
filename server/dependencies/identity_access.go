package dependencies

import (
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

type IdentityAccessSnapshot struct {
	UserID      string   `json:"userId"`
	Username    string   `json:"username"`
	EmployeeID  string   `json:"employeeId,omitempty"`
	Permissions []string `json:"permissions"`
	Diagnostics []string `json:"diagnostics,omitempty"`
}

type IdentityAccessService struct {
	tx              *gorm.DB
	effectiveAccess *EffectiveAccessService
}

func NewIdentityAccessService() *IdentityAccessService {
	return NewIdentityAccessServiceWithDB(db.DB)
}

func NewIdentityAccessServiceWithDB(tx *gorm.DB) *IdentityAccessService {
	return &IdentityAccessService{
		tx:              tx,
		effectiveAccess: NewEffectiveAccessServiceWithDB(tx),
	}
}

func (s *IdentityAccessService) database() *gorm.DB {
	if s != nil && s.tx != nil {
		return s.tx
	}
	return db.DB
}

func (s *IdentityAccessService) ResolveSnapshotByUserID(userID string) (IdentityAccessSnapshot, error) {
	tx := s.database()
	if tx == nil {
		return IdentityAccessSnapshot{}, gorm.ErrInvalidDB
	}

	var user models.User
	if err := tx.Select("id", "username", "employee_id", "role").
		First(&user, "id = ?", strings.TrimSpace(userID)).Error; err != nil {
		return IdentityAccessSnapshot{}, err
	}

	return s.ResolveSnapshotForUser(user)
}

func (s *IdentityAccessService) ResolveSnapshotForUser(user models.User) (IdentityAccessSnapshot, error) {
	profile, err := s.effectiveAccess.ResolveEffectiveAccessProfileForUser(user)
	if err != nil {
		return IdentityAccessSnapshot{}, err
	}

	snapshot := IdentityAccessSnapshot{
		UserID:      strings.TrimSpace(user.ID),
		Username:    strings.TrimSpace(user.Username),
		EmployeeID:  strings.TrimSpace(profile.EmployeeID),
		Permissions: append([]string(nil), profile.Permissions...),
	}
	snapshot.Diagnostics = []string{"role_plus_user_permissions_authoritative"}
	if strings.TrimSpace(user.Role) == "" {
		snapshot.Diagnostics = append(snapshot.Diagnostics, "role_unassigned")
	} else if profile.RoleMissing {
		snapshot.Diagnostics = append(snapshot.Diagnostics, "role_not_found")
	}
	if len(snapshot.Permissions) == 0 {
		snapshot.Diagnostics = append(snapshot.Diagnostics, "effective_permissions_empty")
	}
	return snapshot, nil
}
