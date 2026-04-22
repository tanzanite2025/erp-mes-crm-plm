package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

var (
	ErrSidebarCommandDefinitionNotFound = errors.New("sidebar command definition not found")
	ErrSidebarCommandDefinitionConflict = errors.New("sidebar command definition already exists")
	ErrSidebarCommandCategoryNotFound   = errors.New("sidebar command category not found")
	ErrSidebarCommandCategoryConflict   = errors.New("sidebar command category already exists")
)

var sidebarCommandIDPattern = regexp.MustCompile(`^[A-Za-z0-9_:-]+$`)

type SaveSidebarCommandDefinitionInput struct {
	CommandID    string
	Title        string
	Description  string
	Route        string
	SearchParams json.RawMessage
	Icon         string
	Category     string
	Assignable   bool
	Enabled      bool
	Status       string
	SortOrder    int
}

type SaveSidebarCommandCategoryInput struct {
	CategoryID  string
	Name        string
	Description string
	Enabled     bool
	Status      string
	SortOrder   int
}

type SetSidebarCommandEnabledInput struct {
	Enabled bool
}

type SetSidebarCommandCategoryEnabledInput struct {
	Enabled bool
}

type ReorderSidebarCommandDefinitionsInput struct {
	CommandIDs []string
}

func normalizeSidebarCommandCategoryInput(input SaveSidebarCommandCategoryInput) (SaveSidebarCommandCategoryInput, error) {
	input.CategoryID = strings.TrimSpace(input.CategoryID)
	input.Name = strings.TrimSpace(input.Name)
	input.Description = strings.TrimSpace(input.Description)
	input.Status = strings.TrimSpace(input.Status)

	if input.CategoryID == "" || !sidebarCommandIDPattern.MatchString(input.CategoryID) {
		return input, fmt.Errorf("%w: category id is required and can only contain letters, numbers, underscore, colon or dash", ErrSidebarCommandInvalid)
	}
	if input.Name == "" {
		return input, fmt.Errorf("%w: category name is required", ErrSidebarCommandInvalid)
	}
	if input.Status == "" {
		input.Status = "active"
	}
	if !input.Enabled {
		input.Status = "disabled"
	} else if input.Status == "disabled" {
		input.Enabled = false
	}
	return input, nil
}

func ListSidebarCommandCategories() ([]SidebarCommandCategory, error) {
	if db.DB == nil {
		return nil, gorm.ErrInvalidDB
	}

	var rows []models.SidebarCommandCategory
	if err := db.DB.Order("sort_order asc").Order("created_at asc").Find(&rows).Error; err != nil {
		return nil, err
	}

	var counts []struct {
		Category string
		Count    int
	}
	if err := db.DB.Model(&models.SidebarCommandDefinition{}).
		Select("category, COUNT(*) AS count").
		Where("assignable = ? AND enabled = ?", true, true).
		Where("status <> ?", "disabled").
		Group("category").
		Scan(&counts).Error; err != nil {
		return nil, err
	}
	countByCategory := make(map[string]int, len(counts))
	for _, item := range counts {
		countByCategory[strings.TrimSpace(item.Category)] = item.Count
	}

	result := make([]SidebarCommandCategory, 0, len(rows))
	for _, row := range rows {
		result = append(result, MapSidebarCommandCategory(row, countByCategory[strings.TrimSpace(row.CategoryID)]))
	}
	return result, nil
}

func CreateSidebarCommandCategory(input SaveSidebarCommandCategoryInput) (SidebarCommandCategory, error) {
	if db.DB == nil {
		return SidebarCommandCategory{}, gorm.ErrInvalidDB
	}
	normalized, err := normalizeSidebarCommandCategoryInput(input)
	if err != nil {
		return SidebarCommandCategory{}, err
	}

	row := models.SidebarCommandCategory{
		CategoryID:  normalized.CategoryID,
		Name:        normalized.Name,
		Description: normalized.Description,
		Enabled:     normalized.Enabled,
		Status:      normalized.Status,
		SortOrder:   normalized.SortOrder,
	}
	if err := db.DB.Create(&row).Error; err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "unique") {
			return SidebarCommandCategory{}, fmt.Errorf("%w: %s", ErrSidebarCommandCategoryConflict, normalized.CategoryID)
		}
		return SidebarCommandCategory{}, err
	}
	return MapSidebarCommandCategory(row, 0), nil
}

func UpdateSidebarCommandCategory(categoryID string, input SaveSidebarCommandCategoryInput) (SidebarCommandCategory, error) {
	if db.DB == nil {
		return SidebarCommandCategory{}, gorm.ErrInvalidDB
	}
	normalizedCategoryID := strings.TrimSpace(categoryID)
	if normalizedCategoryID == "" {
		return SidebarCommandCategory{}, ErrSidebarCommandCategoryNotFound
	}
	input.CategoryID = normalizedCategoryID
	normalized, err := normalizeSidebarCommandCategoryInput(input)
	if err != nil {
		return SidebarCommandCategory{}, err
	}

	var row models.SidebarCommandCategory
	if err := db.DB.First(&row, "category_id = ?", normalizedCategoryID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return SidebarCommandCategory{}, ErrSidebarCommandCategoryNotFound
		}
		return SidebarCommandCategory{}, err
	}

	row.Name = normalized.Name
	row.Description = normalized.Description
	row.Enabled = normalized.Enabled
	row.Status = normalized.Status
	row.SortOrder = normalized.SortOrder
	if err := db.DB.Save(&row).Error; err != nil {
		return SidebarCommandCategory{}, err
	}
	return MapSidebarCommandCategory(row, 0), nil
}

func SetSidebarCommandCategoryEnabled(categoryID string, input SetSidebarCommandCategoryEnabledInput) (SidebarCommandCategory, error) {
	if db.DB == nil {
		return SidebarCommandCategory{}, gorm.ErrInvalidDB
	}
	normalizedCategoryID := strings.TrimSpace(categoryID)
	if normalizedCategoryID == "" {
		return SidebarCommandCategory{}, ErrSidebarCommandCategoryNotFound
	}

	var row models.SidebarCommandCategory
	if err := db.DB.First(&row, "category_id = ?", normalizedCategoryID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return SidebarCommandCategory{}, ErrSidebarCommandCategoryNotFound
		}
		return SidebarCommandCategory{}, err
	}

	row.Enabled = input.Enabled
	if input.Enabled {
		if strings.TrimSpace(row.Status) == "" || row.Status == "disabled" {
			row.Status = "active"
		}
	} else {
		row.Status = "disabled"
	}
	if err := db.DB.Save(&row).Error; err != nil {
		return SidebarCommandCategory{}, err
	}
	return MapSidebarCommandCategory(row, 0), nil
}

func normalizeSidebarCommandDefinitionInput(input SaveSidebarCommandDefinitionInput) (SaveSidebarCommandDefinitionInput, error) {
	input.CommandID = strings.TrimSpace(input.CommandID)
	input.Title = strings.TrimSpace(input.Title)
	input.Description = strings.TrimSpace(input.Description)
	input.Route = strings.TrimSpace(input.Route)
	input.Icon = strings.TrimSpace(input.Icon)
	input.Category = strings.TrimSpace(input.Category)
	input.Status = strings.TrimSpace(input.Status)

	if input.CommandID == "" || !sidebarCommandIDPattern.MatchString(input.CommandID) {
		return input, fmt.Errorf("%w: command id is required and can only contain letters, numbers, underscore, colon or dash", ErrSidebarCommandInvalid)
	}
	if isPrivateSidebarCommandID(input.CommandID) {
		return input, fmt.Errorf("%w: private tool cannot be registered in command library", ErrSidebarCommandInvalid)
	}
	if input.Title == "" {
		return input, fmt.Errorf("%w: title is required", ErrSidebarCommandInvalid)
	}
	if input.Route == "" || !strings.HasPrefix(input.Route, "/") {
		return input, fmt.Errorf("%w: route must start with /", ErrSidebarCommandInvalid)
	}
	if input.Category == "" {
		input.Category = "business"
	}
	if input.Status == "" {
		input.Status = "active"
	}
	if !input.Enabled {
		input.Status = "disabled"
	} else if input.Status == "disabled" {
		input.Enabled = false
	}
	if len(input.SearchParams) == 0 {
		input.SearchParams = json.RawMessage(`{}`)
	}
	if !json.Valid(input.SearchParams) {
		return input, fmt.Errorf("%w: search params must be valid json", ErrSidebarCommandInvalid)
	}

	return input, nil
}

func CreateSidebarCommandDefinition(input SaveSidebarCommandDefinitionInput) (SidebarCommandDefinition, error) {
	if db.DB == nil {
		return SidebarCommandDefinition{}, gorm.ErrInvalidDB
	}

	normalized, err := normalizeSidebarCommandDefinitionInput(input)
	if err != nil {
		return SidebarCommandDefinition{}, err
	}

	row := models.SidebarCommandDefinition{
		CommandID:    normalized.CommandID,
		Title:        normalized.Title,
		Description:  normalized.Description,
		Route:        normalized.Route,
		SearchParams: normalized.SearchParams,
		Icon:         normalized.Icon,
		Category:     normalized.Category,
		Assignable:   normalized.Assignable,
		Enabled:      normalized.Enabled,
		Status:       normalized.Status,
		SortOrder:    normalized.SortOrder,
	}
	if err := db.DB.Create(&row).Error; err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "unique") {
			return SidebarCommandDefinition{}, fmt.Errorf("%w: %s", ErrSidebarCommandDefinitionConflict, normalized.CommandID)
		}
		return SidebarCommandDefinition{}, err
	}

	return MapSidebarCommandDefinition(row), nil
}

func UpdateSidebarCommandDefinition(commandID string, input SaveSidebarCommandDefinitionInput) (SidebarCommandDefinition, error) {
	if db.DB == nil {
		return SidebarCommandDefinition{}, gorm.ErrInvalidDB
	}

	normalizedCommandID := strings.TrimSpace(commandID)
	if normalizedCommandID == "" {
		return SidebarCommandDefinition{}, ErrSidebarCommandDefinitionNotFound
	}
	input.CommandID = normalizedCommandID

	normalized, err := normalizeSidebarCommandDefinitionInput(input)
	if err != nil {
		return SidebarCommandDefinition{}, err
	}

	var row models.SidebarCommandDefinition
	if err := db.DB.First(&row, "command_id = ?", normalizedCommandID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return SidebarCommandDefinition{}, ErrSidebarCommandDefinitionNotFound
		}
		return SidebarCommandDefinition{}, err
	}

	row.Title = normalized.Title
	row.Description = normalized.Description
	row.Route = normalized.Route
	row.SearchParams = normalized.SearchParams
	row.Icon = normalized.Icon
	row.Category = normalized.Category
	row.Assignable = normalized.Assignable
	row.Enabled = normalized.Enabled
	row.Status = normalized.Status
	row.SortOrder = normalized.SortOrder

	if err := db.DB.Save(&row).Error; err != nil {
		return SidebarCommandDefinition{}, err
	}
	return MapSidebarCommandDefinition(row), nil
}

func SetSidebarCommandDefinitionEnabled(commandID string, input SetSidebarCommandEnabledInput) (SidebarCommandDefinition, error) {
	if db.DB == nil {
		return SidebarCommandDefinition{}, gorm.ErrInvalidDB
	}

	normalizedCommandID := strings.TrimSpace(commandID)
	if normalizedCommandID == "" {
		return SidebarCommandDefinition{}, ErrSidebarCommandDefinitionNotFound
	}

	var row models.SidebarCommandDefinition
	if err := db.DB.First(&row, "command_id = ?", normalizedCommandID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return SidebarCommandDefinition{}, ErrSidebarCommandDefinitionNotFound
		}
		return SidebarCommandDefinition{}, err
	}

	row.Enabled = input.Enabled
	if input.Enabled {
		if strings.TrimSpace(row.Status) == "" || row.Status == "disabled" {
			row.Status = "active"
		}
	} else {
		row.Status = "disabled"
	}
	if err := db.DB.Save(&row).Error; err != nil {
		return SidebarCommandDefinition{}, err
	}

	return MapSidebarCommandDefinition(row), nil
}

func ReorderSidebarCommandDefinitions(input ReorderSidebarCommandDefinitionsInput) ([]SidebarCommandDefinition, error) {
	if db.DB == nil {
		return nil, gorm.ErrInvalidDB
	}

	commandIDs := make([]string, 0, len(input.CommandIDs))
	seen := make(map[string]struct{}, len(input.CommandIDs))
	for _, commandID := range input.CommandIDs {
		normalized := strings.TrimSpace(commandID)
		if normalized == "" {
			continue
		}
		if _, exists := seen[normalized]; exists {
			continue
		}
		seen[normalized] = struct{}{}
		commandIDs = append(commandIDs, normalized)
	}
	if len(commandIDs) == 0 {
		return nil, ErrSidebarCommandInvalid
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var count int64
		if err := tx.Model(&models.SidebarCommandDefinition{}).
			Where("command_id IN ?", commandIDs).
			Count(&count).Error; err != nil {
			return err
		}
		if count != int64(len(commandIDs)) {
			return ErrSidebarCommandDefinitionNotFound
		}

		for index, commandID := range commandIDs {
			if err := tx.Model(&models.SidebarCommandDefinition{}).
				Where("command_id = ?", commandID).
				Update("sort_order", (index+1)*10).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return ListSidebarCommandDefinitions()
}
