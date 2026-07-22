package services

import (
	"encoding/json"
	"strings"
	"xdfc-server/models"
)

// SidebarCommandDefinition is the API-facing projection of a global sidebar command.
type SidebarCommandDefinition struct {
	CommandID    string          `json:"commandId"`
	Title        string          `json:"title"`
	Description  string          `json:"description"`
	Route        string          `json:"route"`
	SearchParams json.RawMessage `json:"searchParams"`
	Icon         string          `json:"icon"`
	Category     string          `json:"category"`
	Assignable   bool            `json:"assignable"`
	Enabled      bool            `json:"enabled"`
	Status       string          `json:"status"`
	SortOrder    int             `json:"sortOrder"`
}

// SidebarCommandCategory is the API-facing projection of a command category.
type SidebarCommandCategory struct {
	CategoryID   string `json:"categoryId"`
	Name         string `json:"name"`
	Description  string `json:"description"`
	Enabled      bool   `json:"enabled"`
	Status       string `json:"status"`
	SortOrder    int    `json:"sortOrder"`
	CommandCount int    `json:"commandCount"`
}

// MapSidebarCommandDefinition converts the persistence model into the API projection.
func MapSidebarCommandDefinition(row models.SidebarCommandDefinition) SidebarCommandDefinition {
	searchParams := row.SearchParams
	if len(searchParams) == 0 {
		searchParams = json.RawMessage(`{}`)
	}
	return SidebarCommandDefinition{
		CommandID:    row.CommandID,
		Title:        row.Title,
		Description:  row.Description,
		Route:        row.Route,
		SearchParams: searchParams,
		Icon:         row.Icon,
		Category:     row.Category,
		Assignable:   row.Assignable,
		Enabled:      row.Enabled,
		Status:       row.Status,
		SortOrder:    row.SortOrder,
	}
}

// MapSidebarCommandDefinitions converts command persistence rows into API projections.
func MapSidebarCommandDefinitions(rows []models.SidebarCommandDefinition) []SidebarCommandDefinition {
	result := make([]SidebarCommandDefinition, 0, len(rows))
	for _, row := range rows {
		result = append(result, MapSidebarCommandDefinition(row))
	}
	return result
}

// MapSidebarCommandCategory converts the category persistence model into the API projection.
func MapSidebarCommandCategory(row models.SidebarCommandCategory, commandCount int) SidebarCommandCategory {
	return SidebarCommandCategory{
		CategoryID:   row.CategoryID,
		Name:         row.Name,
		Description:  row.Description,
		Enabled:      row.Enabled,
		Status:       row.Status,
		SortOrder:    row.SortOrder,
		CommandCount: commandCount,
	}
}

func isPrivateSidebarCommandID(commandID string) bool {
	switch strings.TrimSpace(commandID) {
	case "personal_workbench_photo", "personal_workbench_video", "personal_workbench_buffer":
		return true
	default:
		return false
	}
}
