// Package services - 用户侧边栏快捷指令分配(SaaS 多租户级权限粒度)。
//
// 业务场景: 不同岗位的用户在 PDA / Web 上看到的"快捷扫码命令"应该不同
// (产线工人扫码进料,品检员扫码检验,管理员看全量)。本服务管理 user → command 的多对多关系。
//
// 数据结构:
//   - SidebarCommandDefinition  指令定义(全局)
//   - SidebarCommandCategory     指令分组(便于批量分配整组)
//   - UserSidebarCommandAssignment + UserSidebarCommandCategoryAssignment  用户级分配
//
// 主要入口:
//   - GetSidebarCommandAssignment      读单个用户的有效指令集
//   - ReplaceSidebarCommandAssignment  全量替换分配
//   - BatchAssignSidebarCommands       批量给多个用户分配同一份
//   - CopySidebarCommandAssignment     克隆某用户的分配到其他用户(模板 + 拷贝)
//
// 关键不变量:
//   - 私有指令(isPrivateSidebarCommandID)固定可用,不参与分配
//   - 分配时记录 source(谁分配的) + assignedBy(操作员),便于审计
//   - normalize* 系列做大小写/空白容错
package services

import (
	"errors"
	"fmt"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var (
	ErrSidebarCommandUserNotFound = errors.New("sidebar command user not found")
	ErrSidebarCommandInvalid      = errors.New("sidebar command invalid")
	ErrSidebarCommandEmptyTargets = errors.New("sidebar command target users required")
)

type SidebarCommandAssignmentView struct {
	UserID              string                     `json:"userId"`
	CategoryIDs         []string                   `json:"categoryIds"`
	CommandIDs          []string                   `json:"commandIds"`
	EffectiveCommandIDs []string                   `json:"effectiveCommandIds"`
	EffectiveCommands   []SidebarCommandDefinition `json:"effectiveCommands,omitempty"`
}

type ReplaceSidebarCommandsInput struct {
	CategoryIDs []string
	CommandIDs  []string
	AssignedBy  string
	Source      string
}

type BatchSidebarCommandsInput struct {
	UserIDs     []string
	CategoryIDs []string
	CommandIDs  []string
	Mode        string
	AssignedBy  string
}

type CopySidebarCommandsInput struct {
	SourceUserID  string
	TargetUserIDs []string
	AssignedBy    string
}

type SidebarCommandMutationResult struct {
	UserIDs     []string `json:"userIds"`
	CategoryIDs []string `json:"categoryIds"`
	CommandIDs  []string `json:"commandIds"`
	Updated     int      `json:"updated"`
}

func normalizeSidebarCommandSource(value string) string {
	normalized := strings.TrimSpace(value)
	if normalized == "" {
		return "manual"
	}
	return normalized
}

func normalizeSidebarCommandIDsTx(tx *gorm.DB, commandIDs []string) ([]string, error) {
	result := make([]string, 0, len(commandIDs))
	seen := make(map[string]struct{}, len(commandIDs))
	for _, commandID := range commandIDs {
		normalized := strings.TrimSpace(commandID)
		if normalized == "" {
			continue
		}
		if _, exists := seen[normalized]; exists {
			continue
		}
		seen[normalized] = struct{}{}
		result = append(result, normalized)
	}

	if len(result) == 0 {
		return result, nil
	}

	var rows []models.SidebarCommandDefinition
	if err := tx.Select("command_id").
		Where("command_id IN ?", result).
		Where("assignable = ? AND enabled = ?", true, true).
		Where("status <> ?", "disabled").
		Find(&rows).Error; err != nil {
		return nil, err
	}

	valid := make(map[string]struct{}, len(rows))
	for _, row := range rows {
		valid[strings.TrimSpace(row.CommandID)] = struct{}{}
	}
	for _, commandID := range result {
		if _, ok := valid[commandID]; !ok {
			return nil, fmt.Errorf("%w: unsupported command id %s", ErrSidebarCommandInvalid, commandID)
		}
	}

	return result, nil
}

func normalizeSidebarCommandCategoryIDsTx(tx *gorm.DB, categoryIDs []string) ([]string, error) {
	result := make([]string, 0, len(categoryIDs))
	seen := make(map[string]struct{}, len(categoryIDs))
	for _, categoryID := range categoryIDs {
		normalized := strings.TrimSpace(categoryID)
		if normalized == "" {
			continue
		}
		if _, exists := seen[normalized]; exists {
			continue
		}
		seen[normalized] = struct{}{}
		result = append(result, normalized)
	}
	if len(result) == 0 {
		return result, nil
	}

	var rows []models.SidebarCommandCategory
	if err := tx.Select("category_id").
		Where("category_id IN ?", result).
		Where("enabled = ?", true).
		Where("status <> ?", "disabled").
		Find(&rows).Error; err != nil {
		return nil, err
	}

	valid := make(map[string]struct{}, len(rows))
	for _, row := range rows {
		valid[strings.TrimSpace(row.CategoryID)] = struct{}{}
	}
	for _, categoryID := range result {
		if _, ok := valid[categoryID]; !ok {
			return nil, fmt.Errorf("%w: unsupported category id %s", ErrSidebarCommandInvalid, categoryID)
		}
	}
	return result, nil
}

func normalizeSidebarUserIDs(userIDs []string) []string {
	result := make([]string, 0, len(userIDs))
	seen := make(map[string]struct{}, len(userIDs))
	for _, userID := range userIDs {
		normalized := strings.TrimSpace(userID)
		if normalized == "" {
			continue
		}
		if _, exists := seen[normalized]; exists {
			continue
		}
		seen[normalized] = struct{}{}
		result = append(result, normalized)
	}
	return result
}

func ensureSidebarCommandUserTx(tx *gorm.DB, userID string, lock bool) (models.User, error) {
	normalizedUserID := strings.TrimSpace(userID)
	if normalizedUserID == "" {
		return models.User{}, ErrSidebarCommandUserNotFound
	}

	query := tx.Select("id", "username", "status")
	if lock {
		query = query.Clauses(clause.Locking{Strength: "UPDATE"})
	}

	var user models.User
	if err := query.First(&user, "id = ?", normalizedUserID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return models.User{}, ErrSidebarCommandUserNotFound
		}
		return models.User{}, err
	}
	return user, nil
}

func replaceSidebarCommandsTx(tx *gorm.DB, userID string, commandIDs []string, assignedBy string, source string) error {
	if _, err := ensureSidebarCommandUserTx(tx, userID, true); err != nil {
		return err
	}

	if err := tx.Where("user_id = ?", strings.TrimSpace(userID)).
		Delete(&models.UserSidebarCommandAssignment{}).Error; err != nil {
		return err
	}

	assignedByPtr := normalizeNullableUUIDString(assignedBy)
	source = normalizeSidebarCommandSource(source)
	for index, commandID := range commandIDs {
		row := models.UserSidebarCommandAssignment{
			UserID:     strings.TrimSpace(userID),
			CommandID:  commandID,
			SortOrder:  index + 1,
			Source:     source,
			AssignedBy: assignedByPtr,
		}
		if err := tx.Create(&row).Error; err != nil {
			return err
		}
	}

	return nil
}

func replaceSidebarCommandCategoriesTx(tx *gorm.DB, userID string, categoryIDs []string, assignedBy string, source string) error {
	if _, err := ensureSidebarCommandUserTx(tx, userID, true); err != nil {
		return err
	}

	if err := tx.Where("user_id = ?", strings.TrimSpace(userID)).
		Delete(&models.UserSidebarCommandCategoryAssignment{}).Error; err != nil {
		return err
	}

	assignedByPtr := normalizeNullableUUIDString(assignedBy)
	source = normalizeSidebarCommandSource(source)
	for index, categoryID := range categoryIDs {
		row := models.UserSidebarCommandCategoryAssignment{
			UserID:     strings.TrimSpace(userID),
			CategoryID: categoryID,
			SortOrder:  index + 1,
			Source:     source,
			AssignedBy: assignedByPtr,
		}
		if err := tx.Create(&row).Error; err != nil {
			return err
		}
	}
	return nil
}

func ReplaceSidebarCommandAssignment(userID string, input ReplaceSidebarCommandsInput) (SidebarCommandAssignmentView, error) {
	normalizedUserID := strings.TrimSpace(userID)
	if normalizedUserID == "" {
		return SidebarCommandAssignmentView{}, ErrSidebarCommandUserNotFound
	}
	if db.DB == nil {
		return SidebarCommandAssignmentView{}, gorm.ErrInvalidDB
	}

	var categoryIDs []string
	var commandIDs []string
	var effectiveCommands []SidebarCommandDefinition
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var err error
		categoryIDs, err = normalizeSidebarCommandCategoryIDsTx(tx, input.CategoryIDs)
		if err != nil {
			return err
		}
		commandIDs, err = normalizeSidebarCommandIDsTx(tx, input.CommandIDs)
		if err != nil {
			return err
		}
		if err := replaceSidebarCommandCategoriesTx(tx, normalizedUserID, categoryIDs, input.AssignedBy, input.Source); err != nil {
			return err
		}
		if err := replaceSidebarCommandsTx(tx, normalizedUserID, commandIDs, input.AssignedBy, input.Source); err != nil {
			return err
		}
		effectiveCommands, err = getEffectiveSidebarCommandDefinitionsTx(tx, categoryIDs, commandIDs)
		return err
	})
	if err != nil {
		return SidebarCommandAssignmentView{}, err
	}

	return SidebarCommandAssignmentView{
		UserID:              normalizedUserID,
		CategoryIDs:         categoryIDs,
		CommandIDs:          commandIDs,
		EffectiveCommandIDs: sidebarCommandIDsFromDefinitions(effectiveCommands),
		EffectiveCommands:   effectiveCommands,
	}, nil
}

func BatchAssignSidebarCommands(input BatchSidebarCommandsInput) (SidebarCommandMutationResult, error) {
	userIDs := normalizeSidebarUserIDs(input.UserIDs)
	if len(userIDs) == 0 {
		return SidebarCommandMutationResult{}, ErrSidebarCommandEmptyTargets
	}
	if db.DB == nil {
		return SidebarCommandMutationResult{}, gorm.ErrInvalidDB
	}

	mode := strings.ToLower(strings.TrimSpace(input.Mode))
	if mode == "" {
		mode = "replace"
	}
	if mode != "replace" && mode != "append" {
		return SidebarCommandMutationResult{}, fmt.Errorf("%w: unsupported batch mode %s", ErrSidebarCommandInvalid, mode)
	}

	var categoryIDs []string
	var commandIDs []string
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var err error
		categoryIDs, err = normalizeSidebarCommandCategoryIDsTx(tx, input.CategoryIDs)
		if err != nil {
			return err
		}
		commandIDs, err = normalizeSidebarCommandIDsTx(tx, input.CommandIDs)
		if err != nil {
			return err
		}
		for _, userID := range userIDs {
			nextCategoryIDs := categoryIDs
			nextCommandIDs := commandIDs
			if mode == "append" {
				existingCategories, err := getSidebarCommandCategoryIDsTx(tx, userID)
				if err != nil {
					return err
				}
				nextCategoryIDs = append(existingCategories, categoryIDs...)
				nextCategoryIDs, err = normalizeSidebarCommandCategoryIDsTx(tx, nextCategoryIDs)
				if err != nil {
					return err
				}
				existing, err := getSidebarCommandIDsTx(tx, userID)
				if err != nil {
					return err
				}
				nextCommandIDs = append(existing, commandIDs...)
				nextCommandIDs, err = normalizeSidebarCommandIDsTx(tx, nextCommandIDs)
				if err != nil {
					return err
				}
			}
			if err := replaceSidebarCommandCategoriesTx(tx, userID, nextCategoryIDs, input.AssignedBy, "batch"); err != nil {
				return err
			}
			if err := replaceSidebarCommandsTx(tx, userID, nextCommandIDs, input.AssignedBy, "batch"); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return SidebarCommandMutationResult{}, err
	}

	return SidebarCommandMutationResult{UserIDs: userIDs, CategoryIDs: categoryIDs, CommandIDs: commandIDs, Updated: len(userIDs)}, nil
}

func CopySidebarCommandAssignment(input CopySidebarCommandsInput) (SidebarCommandMutationResult, error) {
	targetUserIDs := normalizeSidebarUserIDs(input.TargetUserIDs)
	if len(targetUserIDs) == 0 {
		return SidebarCommandMutationResult{}, ErrSidebarCommandEmptyTargets
	}
	sourceUserID := strings.TrimSpace(input.SourceUserID)
	if sourceUserID == "" {
		return SidebarCommandMutationResult{}, ErrSidebarCommandUserNotFound
	}
	if db.DB == nil {
		return SidebarCommandMutationResult{}, gorm.ErrInvalidDB
	}

	var categoryIDs []string
	var commandIDs []string
	updatedCount := 0
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		if _, err := ensureSidebarCommandUserTx(tx, sourceUserID, false); err != nil {
			return err
		}
		var err error
		categoryIDs, err = getSidebarCommandCategoryIDsTx(tx, sourceUserID)
		if err != nil {
			return err
		}
		commandIDs, err = getSidebarCommandIDsTx(tx, sourceUserID)
		if err != nil {
			return err
		}

		for _, targetUserID := range targetUserIDs {
			if targetUserID == sourceUserID {
				continue
			}
			if err := replaceSidebarCommandCategoriesTx(tx, targetUserID, categoryIDs, input.AssignedBy, "copy"); err != nil {
				return err
			}
			if err := replaceSidebarCommandsTx(tx, targetUserID, commandIDs, input.AssignedBy, "copy"); err != nil {
				return err
			}
			updatedCount++
		}
		return nil
	})
	if err != nil {
		return SidebarCommandMutationResult{}, err
	}

	return SidebarCommandMutationResult{UserIDs: targetUserIDs, CategoryIDs: categoryIDs, CommandIDs: commandIDs, Updated: updatedCount}, nil
}
