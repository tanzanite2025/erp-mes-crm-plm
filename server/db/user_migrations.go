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

func migrateAccountPermissionPresetSchemaNames() {
	if DB == nil || DB.Dialector.Name() != "postgres" {
		return
	}

	statements := []string{
		`
		DO $$
		BEGIN
			IF to_regclass('public.roles') IS NOT NULL
			   AND to_regclass('public.permission_presets') IS NULL THEN
				ALTER TABLE roles RENAME TO permission_presets;
			END IF;
		END
		$$;
		`,
		`
		DO $$
		BEGIN
			IF to_regclass('public.permission_presets') IS NOT NULL THEN
				IF EXISTS (
					SELECT 1
					FROM information_schema.columns
					WHERE table_schema = 'public'
					  AND table_name = 'permission_presets'
					  AND column_name = 'role_id'
				) AND NOT EXISTS (
					SELECT 1
					FROM information_schema.columns
					WHERE table_schema = 'public'
					  AND table_name = 'permission_presets'
					  AND column_name = 'permission_preset_id'
				) THEN
					ALTER TABLE permission_presets RENAME COLUMN role_id TO permission_preset_id;
				ELSIF EXISTS (
					SELECT 1
					FROM information_schema.columns
					WHERE table_schema = 'public'
					  AND table_name = 'permission_presets'
					  AND column_name = 'role_id'
				) AND EXISTS (
					SELECT 1
					FROM information_schema.columns
					WHERE table_schema = 'public'
					  AND table_name = 'permission_presets'
					  AND column_name = 'permission_preset_id'
				) THEN
					UPDATE permission_presets
					SET permission_preset_id = role_id
					WHERE NULLIF(BTRIM(permission_preset_id), '') IS NULL
					  AND NULLIF(BTRIM(role_id), '') IS NOT NULL;
					ALTER TABLE permission_presets DROP COLUMN role_id;
				END IF;
			END IF;
		END
		$$;
		`,
		`
		DO $$
		BEGIN
			IF to_regclass('public.roles') IS NOT NULL
			   AND to_regclass('public.permission_presets') IS NOT NULL THEN
				IF EXISTS (
					SELECT 1
					FROM information_schema.columns
					WHERE table_schema = 'public'
					  AND table_name = 'roles'
					  AND column_name = 'role_id'
				)
				AND EXISTS (
					SELECT 1
					FROM information_schema.columns
					WHERE table_schema = 'public'
					  AND table_name = 'permission_presets'
					  AND column_name = 'permission_preset_id'
				) THEN
					INSERT INTO permission_presets (
						id,
						created_at,
						updated_at,
						deleted_at,
						permission_preset_id,
						label,
						color,
						permissions
					)
					SELECT
						r.id,
						r.created_at,
						r.updated_at,
						r.deleted_at,
						LOWER(BTRIM(r.role_id)),
						r.label,
						r.color,
						r.permissions
					FROM roles r
					WHERE NULLIF(BTRIM(r.role_id), '') IS NOT NULL
					ON CONFLICT DO NOTHING;
				END IF;

				DROP TABLE roles CASCADE;
			END IF;
		END
		$$;
		`,
		`
		DO $$
		BEGIN
			IF to_regclass('public.users') IS NOT NULL THEN
				IF EXISTS (
					SELECT 1
					FROM information_schema.columns
					WHERE table_schema = 'public'
					  AND table_name = 'users'
					  AND column_name = 'role'
				) AND NOT EXISTS (
					SELECT 1
					FROM information_schema.columns
					WHERE table_schema = 'public'
					  AND table_name = 'users'
					  AND column_name = 'permission_preset_id'
				) THEN
					ALTER TABLE users RENAME COLUMN role TO permission_preset_id;
				ELSIF EXISTS (
					SELECT 1
					FROM information_schema.columns
					WHERE table_schema = 'public'
					  AND table_name = 'users'
					  AND column_name = 'role'
				) AND EXISTS (
					SELECT 1
					FROM information_schema.columns
					WHERE table_schema = 'public'
					  AND table_name = 'users'
					  AND column_name = 'permission_preset_id'
				) THEN
					UPDATE users
					SET permission_preset_id = role
					WHERE NULLIF(BTRIM(permission_preset_id), '') IS NULL
					  AND NULLIF(BTRIM(role), '') IS NOT NULL;
					ALTER TABLE users DROP COLUMN role;
				END IF;
			END IF;
		END
		$$;
		`,
		`
		DO $$
		BEGIN
			IF to_regclass('public.permission_presets') IS NOT NULL
			   AND EXISTS (
					SELECT 1
					FROM information_schema.columns
					WHERE table_schema = 'public'
					  AND table_name = 'permission_presets'
					  AND column_name = 'permission_preset_id'
			   ) THEN
				UPDATE permission_presets
				SET permission_preset_id = LOWER(BTRIM(permission_preset_id))
				WHERE NULLIF(BTRIM(permission_preset_id), '') IS NOT NULL
				  AND permission_preset_id <> LOWER(BTRIM(permission_preset_id));
			END IF;
		END
		$$;
		`,
		`
		DO $$
		BEGIN
			IF to_regclass('public.users') IS NOT NULL
			   AND EXISTS (
					SELECT 1
					FROM information_schema.columns
					WHERE table_schema = 'public'
					  AND table_name = 'users'
					  AND column_name = 'permission_preset_id'
			   ) THEN
				UPDATE users
				SET permission_preset_id = LOWER(BTRIM(permission_preset_id))
				WHERE NULLIF(BTRIM(permission_preset_id), '') IS NOT NULL
				  AND permission_preset_id <> LOWER(BTRIM(permission_preset_id));
			END IF;
		END
		$$;
		`,
		`DROP INDEX IF EXISTS idx_roles_role_id`,
		`DROP INDEX IF EXISTS idx_roles_deleted_at`,
		`DROP INDEX IF EXISTS idx_users_role`,
	}

	for _, statement := range statements {
		if err := DB.Exec(statement).Error; err != nil {
			log.Fatal("Failed to migrate account permission preset schema names:", err)
		}
	}
}

func dropLegacyPermissionPresetArtifacts() {
	if DB == nil {
		return
	}

	for _, tableName := range []string{
		"employee_roles",
		"user_roles",
		"org_default_roles",
	} {
		if DB.Migrator().HasTable(tableName) {
			if err := DB.Migrator().DropTable(tableName); err != nil {
				log.Fatal("Failed to drop legacy permission preset table ", tableName, ": ", err)
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

func ensureDefaultAdminPermissionPreset() {
	if DB == nil || !DB.Migrator().HasTable(&models.PermissionPreset{}) {
		return
	}

	permissionJSON, err := json.Marshal(authz.AdminFallbackPermissions)
	if err != nil {
		log.Fatal("[CRITICAL_SECURITY] Failed to serialize default admin permission preset permissions: ", err)
	}

	defaultPermissionPreset := models.PermissionPreset{
		PermissionPresetID: "admin",
		Label:              "Admin",
		Color:              "bg-red-500/10 text-red-600 border-red-200",
		Permissions:        string(permissionJSON),
	}

	var existing models.PermissionPreset
	err = DB.Where("LOWER(permission_preset_id) = ?", "admin").First(&existing).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		if createErr := DB.Create(&defaultPermissionPreset).Error; createErr != nil {
			log.Fatal("Failed to create default admin permission preset:", createErr)
		}
		return
	}
	if err != nil {
		log.Fatal("Failed to query default admin permission preset:", err)
	}

	updates := map[string]any{}
	if existing.Label != defaultPermissionPreset.Label {
		updates["label"] = defaultPermissionPreset.Label
	}
	if existing.Color != defaultPermissionPreset.Color {
		updates["color"] = defaultPermissionPreset.Color
	}
	if strings.TrimSpace(existing.Permissions) != defaultPermissionPreset.Permissions {
		updates["permissions"] = defaultPermissionPreset.Permissions
	}
	if len(updates) == 0 {
		return
	}
	if updateErr := DB.Model(&existing).Updates(updates).Error; updateErr != nil {
		log.Fatal("Failed to align default admin permission preset:", updateErr)
	}
}

func ensureSeedAdminUserInvariants() {
	if DB == nil || !DB.Migrator().HasTable(&models.User{}) {
		return
	}

	if err := DB.Model(&models.User{}).
		Where("LOWER(username) = ?", "admin").
		Updates(map[string]any{
			"is_protected":         true,
			"permission_preset_id": "admin",
			"status":               "active",
		}).Error; err != nil {
		log.Fatal("Failed to enforce seed admin user invariants:", err)
	}
}
