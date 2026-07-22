package services

import (
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

func getSidebarCommandIDsTx(tx *gorm.DB, userID string) ([]string, error) {
	var rows []models.UserSidebarCommandAssignment
	if err := tx.Where("user_id = ?", strings.TrimSpace(userID)).
		Where("deleted_at IS NULL").
		Order("sort_order asc").
		Order("created_at asc").
		Find(&rows).Error; err != nil {
		return nil, err
	}

	commandIDs := make([]string, 0, len(rows))
	for _, row := range rows {
		commandID := strings.TrimSpace(row.CommandID)
		if commandID != "" {
			commandIDs = append(commandIDs, commandID)
		}
	}
	if len(commandIDs) == 0 {
		return commandIDs, nil
	}

	var definitions []models.SidebarCommandDefinition
	if err := tx.Select("command_id").
		Where("command_id IN ?", commandIDs).
		Where("assignable = ? AND enabled = ?", true, true).
		Where("status <> ?", "disabled").
		Find(&definitions).Error; err != nil {
		return nil, err
	}
	valid := make(map[string]struct{}, len(definitions))
	for _, definition := range definitions {
		valid[strings.TrimSpace(definition.CommandID)] = struct{}{}
	}

	filtered := make([]string, 0, len(commandIDs))
	for _, commandID := range commandIDs {
		if _, ok := valid[commandID]; ok {
			filtered = append(filtered, commandID)
		}
	}
	return filtered, nil
}

func getSidebarCommandCategoryIDsTx(tx *gorm.DB, userID string) ([]string, error) {
	var rows []models.UserSidebarCommandCategoryAssignment
	if err := tx.Where("user_id = ?", strings.TrimSpace(userID)).
		Where("deleted_at IS NULL").
		Order("sort_order asc").
		Order("created_at asc").
		Find(&rows).Error; err != nil {
		return nil, err
	}

	categoryIDs := make([]string, 0, len(rows))
	for _, row := range rows {
		categoryID := strings.TrimSpace(row.CategoryID)
		if categoryID != "" {
			categoryIDs = append(categoryIDs, categoryID)
		}
	}
	if len(categoryIDs) == 0 {
		return categoryIDs, nil
	}

	var categories []models.SidebarCommandCategory
	if err := tx.Select("category_id").
		Where("category_id IN ?", categoryIDs).
		Where("enabled = ?", true).
		Where("status <> ?", "disabled").
		Find(&categories).Error; err != nil {
		return nil, err
	}
	valid := make(map[string]struct{}, len(categories))
	for _, category := range categories {
		valid[strings.TrimSpace(category.CategoryID)] = struct{}{}
	}

	filtered := make([]string, 0, len(categoryIDs))
	for _, categoryID := range categoryIDs {
		if _, ok := valid[categoryID]; ok {
			filtered = append(filtered, categoryID)
		}
	}
	return filtered, nil
}

func getEffectiveSidebarCommandDefinitionsTx(tx *gorm.DB, categoryIDs []string, commandIDs []string) ([]SidebarCommandDefinition, error) {
	result := make([]SidebarCommandDefinition, 0)
	seen := make(map[string]struct{})

	if len(categoryIDs) > 0 {
		var categoryRows []models.SidebarCommandDefinition
		if err := tx.Where("category IN ?", categoryIDs).
			Where("assignable = ? AND enabled = ?", true, true).
			Where("status <> ?", "disabled").
			Order("sort_order asc").
			Order("created_at asc").
			Find(&categoryRows).Error; err != nil {
			return nil, err
		}
		for _, row := range categoryRows {
			commandID := strings.TrimSpace(row.CommandID)
			if commandID == "" {
				continue
			}
			if _, exists := seen[commandID]; exists {
				continue
			}
			seen[commandID] = struct{}{}
			result = append(result, MapSidebarCommandDefinition(row))
		}
	}

	if len(commandIDs) > 0 {
		var directRows []models.SidebarCommandDefinition
		if err := tx.Where("command_id IN ?", commandIDs).
			Where("assignable = ? AND enabled = ?", true, true).
			Where("status <> ?", "disabled").
			Find(&directRows).Error; err != nil {
			return nil, err
		}
		byID := make(map[string]models.SidebarCommandDefinition, len(directRows))
		for _, row := range directRows {
			byID[strings.TrimSpace(row.CommandID)] = row
		}
		for _, commandID := range commandIDs {
			row, ok := byID[strings.TrimSpace(commandID)]
			if !ok {
				continue
			}
			normalizedCommandID := strings.TrimSpace(row.CommandID)
			if _, exists := seen[normalizedCommandID]; exists {
				continue
			}
			seen[normalizedCommandID] = struct{}{}
			result = append(result, MapSidebarCommandDefinition(row))
		}
	}

	return result, nil
}

func sidebarCommandIDsFromDefinitions(commands []SidebarCommandDefinition) []string {
	result := make([]string, 0, len(commands))
	for _, command := range commands {
		commandID := strings.TrimSpace(command.CommandID)
		if commandID != "" {
			result = append(result, commandID)
		}
	}
	return result
}

// GetSidebarCommandAssignment returns one user's saved categories, direct commands, and effective command set.
func GetSidebarCommandAssignment(userID string) (SidebarCommandAssignmentView, error) {
	normalizedUserID := strings.TrimSpace(userID)
	if normalizedUserID == "" {
		return SidebarCommandAssignmentView{}, ErrSidebarCommandUserNotFound
	}
	if db.DB == nil {
		return SidebarCommandAssignmentView{}, gorm.ErrInvalidDB
	}
	if _, err := ensureSidebarCommandUserTx(db.DB, normalizedUserID, false); err != nil {
		return SidebarCommandAssignmentView{}, err
	}

	categoryIDs, err := getSidebarCommandCategoryIDsTx(db.DB, normalizedUserID)
	if err != nil {
		return SidebarCommandAssignmentView{}, err
	}
	commandIDs, err := getSidebarCommandIDsTx(db.DB, normalizedUserID)
	if err != nil {
		return SidebarCommandAssignmentView{}, err
	}
	effectiveCommands, err := getEffectiveSidebarCommandDefinitionsTx(db.DB, categoryIDs, commandIDs)
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
