package db

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strings"
	"xdfc-server/authz"
	"xdfc-server/models"

	"gorm.io/gorm"
)

func ensureUserIntegrityConstraints() {
	if DB == nil || !DB.Migrator().HasTable(&models.User{}) {
		return
	}

	if err := DB.Exec(`
		DO $$
		BEGIN
			IF NOT EXISTS (
				SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_status_allowed'
			) THEN
				ALTER TABLE users
				ADD CONSTRAINT chk_users_status_allowed
				CHECK (
					status IS NOT NULL
					AND status IN ('active', 'inactive', 'suspended')
				) NOT VALID;
			END IF;
		END
		$$;
	`).Error; err != nil {
		log.Fatal("Failed to add users status integrity constraint:", err)
	}
}

func ensureUserPermissionUniqueIndex() {
	if DB == nil || !DB.Migrator().HasTable(&models.UserPermission{}) {
		return
	}

	if err := DB.Exec(`
		CREATE UNIQUE INDEX IF NOT EXISTS idx_user_permissions_user_permission_active_unique
		ON user_permissions (user_id, permission_id)
		WHERE deleted_at IS NULL;
	`).Error; err != nil {
		log.Fatal("Failed to enforce unique active permission per user:", err)
	}
}

func normalizeUserEmployeeBindings() {
	if DB == nil || !DB.Migrator().HasTable(&models.User{}) || !DB.Migrator().HasTable(&models.Employee{}) {
		return
	}

	if err := DB.Exec(`
		UPDATE users AS u
		SET employee_id = CAST(e.id AS text)
		FROM employees AS e
		WHERE u.deleted_at IS NULL
		  AND NULLIF(BTRIM(u.employee_id), '') IS NOT NULL
		  AND (
			LOWER(BTRIM(u.employee_id)) = LOWER(CAST(e.id AS text))
			OR LOWER(BTRIM(u.employee_id)) = LOWER(BTRIM(e.staff_id))
		  )
		  AND BTRIM(u.employee_id) <> CAST(e.id AS text)
	`).Error; err != nil {
		log.Fatal("Failed to normalize user employee bindings:", err)
	}
}

func ensureUserEmployeeBindingUniqueIndex() {
	if DB == nil || !DB.Migrator().HasTable(&models.User{}) {
		return
	}

	type duplicateBinding struct {
		EmployeeID string
		Count      int64
	}
	var duplicates []duplicateBinding
	if err := DB.Raw(`
		SELECT LOWER(BTRIM(employee_id)) AS employee_id, COUNT(*) AS count
		FROM users
		WHERE deleted_at IS NULL
		  AND NULLIF(BTRIM(employee_id), '') IS NOT NULL
		GROUP BY LOWER(BTRIM(employee_id))
		HAVING COUNT(*) > 1
		ORDER BY COUNT(*) DESC, LOWER(BTRIM(employee_id)) ASC
		LIMIT 5
	`).Scan(&duplicates).Error; err != nil {
		log.Fatal("Failed to inspect duplicate user employee bindings:", err)
	}
	if len(duplicates) > 0 {
		samples := make([]string, 0, len(duplicates))
		for _, duplicate := range duplicates {
			samples = append(samples, fmt.Sprintf("%s(%d)", duplicate.EmployeeID, duplicate.Count))
		}
		log.Fatal("Duplicate user employee bindings must be resolved before startup: ", strings.Join(samples, ", "))
	}

	if err := DB.Exec(`
		CREATE UNIQUE INDEX IF NOT EXISTS idx_users_employee_binding_active_unique
		ON users (LOWER(BTRIM(employee_id)))
		WHERE deleted_at IS NULL
		  AND NULLIF(BTRIM(employee_id), '') IS NOT NULL;
	`).Error; err != nil {
		log.Fatal("Failed to enforce unique active employee binding per user:", err)
	}
}

func dropLegacyRoleArtifacts() {
	if DB == nil {
		return
	}

	for _, tableName := range []string{
		"employee_roles",
		"user_roles",
		"position_roles",
		"org_default_roles",
	} {
		if DB.Migrator().HasTable(tableName) {
			if err := DB.Migrator().DropTable(tableName); err != nil {
				log.Fatal("Failed to drop legacy role table ", tableName, ": ", err)
			}
		}
	}
}

func ensureSeedAdminUserPermissions() {
	if DB == nil || !DB.Migrator().HasTable(&models.User{}) || !DB.Migrator().HasTable(&models.UserPermission{}) {
		return
	}

	var users []models.User
	if err := DB.Select("id", "username").
		Where("LOWER(username) = ?", "admin").
		Find(&users).Error; err != nil {
		log.Fatal("Failed to query admin accounts for explicit permission seed:", err)
	}

	for _, user := range users {
		var rows []models.UserPermission
		if err := DB.Select("permission_id").
			Where("user_id = ?", user.ID).
			Where("deleted_at IS NULL").
			Find(&rows).Error; err != nil {
			log.Fatal("Failed to query existing admin explicit permissions:", err)
		}

		existing := make(map[string]struct{}, len(rows))
		for _, row := range rows {
			existing[strings.ToLower(strings.TrimSpace(row.PermissionID))] = struct{}{}
		}

		for _, permissionID := range authz.AdminFallbackPermissions {
			normalizedPermissionID := strings.ToLower(strings.TrimSpace(permissionID))
			if normalizedPermissionID == "" {
				continue
			}
			if _, exists := existing[normalizedPermissionID]; exists {
				continue
			}

			row := models.UserPermission{
				UserID:       user.ID,
				PermissionID: normalizedPermissionID,
				Source:       "seed_admin",
			}
			if err := DB.Create(&row).Error; err != nil {
				log.Fatal("Failed to seed admin explicit permissions:", err)
			}
		}
	}
}

func ensureDefaultAdminRole() {
	if DB == nil || !DB.Migrator().HasTable(&models.Role{}) {
		return
	}

	permissionJSON, err := json.Marshal(authz.AdminFallbackPermissions)
	if err != nil {
		log.Fatal("[CRITICAL_SECURITY] Failed to serialize default admin role permissions: ", err)
	}

	defaultRole := models.Role{
		RoleID:      "admin",
		Label:       "Admin",
		Color:       "bg-red-500/10 text-red-600 border-red-200",
		Permissions: string(permissionJSON),
	}

	var existing models.Role
	err = DB.Where("LOWER(role_id) = ?", "admin").First(&existing).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		if createErr := DB.Create(&defaultRole).Error; createErr != nil {
			log.Fatal("Failed to create default admin role:", createErr)
		}
		return
	}
	if err != nil {
		log.Fatal("Failed to query default admin role:", err)
	}

	updates := map[string]any{}
	if existing.Label != defaultRole.Label {
		updates["label"] = defaultRole.Label
	}
	if existing.Color != defaultRole.Color {
		updates["color"] = defaultRole.Color
	}
	if strings.TrimSpace(existing.Permissions) != defaultRole.Permissions {
		updates["permissions"] = defaultRole.Permissions
	}
	if len(updates) == 0 {
		return
	}
	if updateErr := DB.Model(&existing).Updates(updates).Error; updateErr != nil {
		log.Fatal("Failed to align default admin role:", updateErr)
	}
}

func ensureSeedAdminUserInvariants() {
	if DB == nil || !DB.Migrator().HasTable(&models.User{}) {
		return
	}

	if err := DB.Model(&models.User{}).
		Where("LOWER(username) = ?", "admin").
		Updates(map[string]any{
			"is_protected": true,
			"role":         "admin",
			"status":       "active",
		}).Error; err != nil {
		log.Fatal("Failed to enforce seed admin user invariants:", err)
	}
}
