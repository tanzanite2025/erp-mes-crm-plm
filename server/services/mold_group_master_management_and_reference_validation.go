package services

import (
	"context"
	"errors"
	"strings"
	"unicode/utf8"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type MoldGroupMasterWriteRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Active      bool   `json:"active"`
	Version     int    `json:"version"`
}

type MoldGroupMasterDirectoryRecord struct {
	models.MoldGroup
	MoldCount    int64 `json:"moldCount"`
	ProductCount int64 `json:"productCount"`
}

// Directory and binding commands share a transaction lock. This prevents a
// concurrent rename/delete from racing the last-reference check or mirror write.
// Telemetry, maintenance and production execution do not take this lock.
func LockMoldGroupDirectoryForReferenceMutation(tx *gorm.DB) error {
	if tx.Dialector.Name() == "postgres" {
		return tx.Exec("SELECT pg_advisory_xact_lock(73912, 104)").Error
	}
	return nil
}

func OptionalMoldGroupIDPointer(groupID string) *string {
	groupID = strings.TrimSpace(groupID)
	if groupID == "" {
		return nil
	}
	return &groupID
}

func MoldGroupIDString(groupID *string) string {
	if groupID == nil {
		return ""
	}
	return *groupID
}

// Legacy names may resolve an existing directory entry; they never create one.
// Disabled groups may be retained on an existing record but cannot be assigned.
func ResolveMoldGroupMasterReference(tx *gorm.DB, groupID, legacyName, previousGroupID string) (*string, string, error) {
	groupID, legacyName = strings.TrimSpace(groupID), strings.TrimSpace(legacyName)
	if groupID == "" && legacyName == "" {
		return nil, "", nil
	}
	var group models.MoldGroup
	query := tx.Clauses(clause.Locking{Strength: "SHARE"})
	if groupID != "" {
		if _, err := uuid.Parse(groupID); err != nil {
			return nil, "", domainValidationError("模具分组标识无效，请重新选择分组")
		}
		query = query.Where("id = ?", groupID)
	} else {
		query = query.Where("name = ?", legacyName)
	}
	if err := query.First(&group).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, "", domainValidationError("模具分组不存在或已删除，请先在分组管理中建立并选择分组")
		}
		return nil, "", err
	}
	if !group.Active && group.ID != previousGroupID {
		return nil, "", domainValidationError("该模具分组已停用，不能新增关联，请选择启用中的分组")
	}
	return &group.ID, group.Name, nil
}

func ReadMoldGroupMasterDirectory(database *gorm.DB) ([]MoldGroupMasterDirectoryRecord, error) {
	items := make([]MoldGroupMasterDirectoryRecord, 0)
	err := database.Model(&models.MoldGroup{}).
		Select("mold_groups.*, (SELECT COUNT(*) FROM molds WHERE molds.group_id = mold_groups.id AND molds.deleted_at IS NULL) AS mold_count, (SELECT COUNT(*) FROM products WHERE products.mold_group_id = mold_groups.id AND products.deleted_at IS NULL) AS product_count").
		Order("mold_groups.name ASC").Scan(&items).Error
	return items, err
}

func moldGroupMasterAuditSnapshot(group models.MoldGroup) map[string]any {
	return map[string]any{"id": group.ID, "name": group.Name, "description": group.Description, "active": group.Active, "version": group.Version}
}

func SaveMoldGroupMaster(ctx context.Context, database *gorm.DB, groupID string, input MoldGroupMasterWriteRequest) (models.MoldGroup, error) {
	if groupID != "" {
		if _, err := uuid.Parse(groupID); err != nil {
			return models.MoldGroup{}, domainValidationError("模具分组标识无效")
		}
	}
	input.Name, input.Description = strings.TrimSpace(input.Name), strings.TrimSpace(input.Description)
	if input.Name == "" || utf8.RuneCountInString(input.Name) > 100 {
		return models.MoldGroup{}, domainValidationError("模具分组名称不能为空，且不能超过 100 个字符")
	}
	if utf8.RuneCountInString(input.Description) > 2000 {
		return models.MoldGroup{}, domainValidationError("模具分组说明不能超过 2000 个字符")
	}
	var saved models.MoldGroup
	err := database.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := LockMoldGroupDirectoryForReferenceMutation(tx); err != nil {
			return err
		}
		var duplicates int64
		duplicateQuery := tx.Unscoped().Model(&models.MoldGroup{}).Where("name = ?", input.Name)
		if groupID != "" {
			duplicateQuery = duplicateQuery.Where("id <> ?", groupID)
		}
		if err := duplicateQuery.Count(&duplicates).Error; err != nil {
			return err
		}
		if duplicates > 0 {
			return domainConflictError("该模具分组名称已存在（含已删除分组），请使用其他名称")
		}
		operator := equipmentOperator(ctx)
		if groupID == "" {
			saved = models.MoldGroup{BaseModel: models.BaseModel{ID: uuid.NewString()}, Name: input.Name, Description: input.Description, Active: true, Version: 1, CreatedBy: operator, UpdatedBy: operator}
			if err := tx.Create(&saved).Error; err != nil {
				return err
			}
			return writeEquipmentAudit(ctx, tx, AuditModuleMoldGroup, saved.ID, "CREATE", nil, moldGroupMasterAuditSnapshot(saved))
		}
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&saved, "id = ?", groupID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return domainNotFoundError("模具分组不存在或已删除")
			}
			return err
		}
		if input.Version != saved.Version {
			return domainConflictError("模具分组已被其他人修改，请刷新后重试")
		}
		before := moldGroupMasterAuditSnapshot(saved)
		if err := tx.Model(&saved).Updates(map[string]any{"name": input.Name, "description": input.Description, "active": input.Active, "version": saved.Version + 1, "updated_by": operator}).Error; err != nil {
			return err
		}
		// These columns are compatibility display mirrors, never alternate keys.
		if err := tx.Unscoped().Model(&models.Mold{}).Where("group_id = ?", groupID).UpdateColumn("group_name", input.Name).Error; err != nil {
			return err
		}
		if err := tx.Unscoped().Model(&models.Product{}).Where("mold_group_id = ?", groupID).UpdateColumn("mold_group", input.Name).Error; err != nil {
			return err
		}
		if err := tx.First(&saved, "id = ?", groupID).Error; err != nil {
			return err
		}
		return writeEquipmentAudit(ctx, tx, AuditModuleMoldGroup, saved.ID, "UPDATE", before, moldGroupMasterAuditSnapshot(saved))
	})
	return saved, err
}

func DeleteUnreferencedMoldGroupMaster(ctx context.Context, database *gorm.DB, groupID string, version int) error {
	if _, err := uuid.Parse(groupID); err != nil {
		return domainValidationError("模具分组标识无效")
	}
	return database.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := LockMoldGroupDirectoryForReferenceMutation(tx); err != nil {
			return err
		}
		var group models.MoldGroup
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&group, "id = ?", groupID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return domainNotFoundError("模具分组不存在或已删除")
			}
			return err
		}
		if version != group.Version {
			return domainConflictError("模具分组已被其他人修改，请刷新后重试")
		}
		// Include archived references: deletion must not erase traceability.
		for _, reference := range []struct {
			model  any
			column string
		}{{&models.Mold{}, "group_id"}, {&models.Product{}, "mold_group_id"}} {
			var count int64
			if err := tx.Unscoped().Model(reference.model).Where(reference.column+" = ?", groupID).Count(&count).Error; err != nil {
				return err
			}
			if count > 0 {
				return domainConflictError("该分组仍被模具或产品引用（含历史记录），不能删除；可停用分组")
			}
		}
		if err := tx.Delete(&group).Error; err != nil {
			return err
		}
		return writeEquipmentAudit(ctx, tx, AuditModuleMoldGroup, group.ID, "DELETE", moldGroupMasterAuditSnapshot(group), map[string]any{"deleted": true})
	})
}
