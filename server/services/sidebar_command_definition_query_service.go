package services

import (
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

// ListSidebarCommandDefinitions returns all command-library definitions in UI order.
func ListSidebarCommandDefinitions() ([]SidebarCommandDefinition, error) {
	if db.DB == nil {
		return nil, gorm.ErrInvalidDB
	}

	var rows []models.SidebarCommandDefinition
	if err := db.DB.Order("sort_order asc").Order("created_at asc").Find(&rows).Error; err != nil {
		return nil, err
	}
	return MapSidebarCommandDefinitions(rows), nil
}

// ListAssignableSidebarCommands returns active command definitions that can be assigned to users.
func ListAssignableSidebarCommands() ([]SidebarCommandDefinition, error) {
	if db.DB == nil {
		return nil, gorm.ErrInvalidDB
	}

	var rows []models.SidebarCommandDefinition
	if err := db.DB.Where("assignable = ? AND enabled = ?", true, true).
		Where("status <> ?", "disabled").
		Order("sort_order asc").
		Order("created_at asc").
		Find(&rows).Error; err != nil {
		return nil, err
	}
	return MapSidebarCommandDefinitions(rows), nil
}

// ListAssignableSidebarCommandsByIDs returns assignable commands in the caller-provided ID order.
func ListAssignableSidebarCommandsByIDs(commandIDs []string) ([]SidebarCommandDefinition, error) {
	if db.DB == nil {
		return nil, gorm.ErrInvalidDB
	}

	normalizedCommandIDs := normalizeSidebarCommandIDList(commandIDs)
	if len(normalizedCommandIDs) == 0 {
		return []SidebarCommandDefinition{}, nil
	}

	var rows []models.SidebarCommandDefinition
	if err := db.DB.Where("command_id IN ?", normalizedCommandIDs).
		Where("assignable = ? AND enabled = ?", true, true).
		Where("status <> ?", "disabled").
		Find(&rows).Error; err != nil {
		return nil, err
	}

	byID := make(map[string]SidebarCommandDefinition, len(rows))
	for _, row := range rows {
		byID[strings.TrimSpace(row.CommandID)] = MapSidebarCommandDefinition(row)
	}

	result := make([]SidebarCommandDefinition, 0, len(normalizedCommandIDs))
	for _, commandID := range normalizedCommandIDs {
		if command, ok := byID[commandID]; ok {
			result = append(result, command)
		}
	}
	return result, nil
}

func normalizeSidebarCommandIDList(commandIDs []string) []string {
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
	return result
}
