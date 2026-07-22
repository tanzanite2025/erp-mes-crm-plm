package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

type sidebarCommandDefinitionRequest struct {
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

type sidebarCommandCategoryRequest struct {
	CategoryID  string `json:"categoryId"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Enabled     bool   `json:"enabled"`
	Status      string `json:"status"`
	SortOrder   int    `json:"sortOrder"`
}

type setSidebarCommandEnabledRequest struct {
	Enabled bool `json:"enabled"`
}

type reorderSidebarCommandDefinitionsRequest struct {
	CommandIDs []string `json:"commandIds"`
}

func mapSidebarCommandCategoryRequest(input sidebarCommandCategoryRequest) services.SaveSidebarCommandCategoryInput {
	return services.SaveSidebarCommandCategoryInput{
		CategoryID:  input.CategoryID,
		Name:        input.Name,
		Description: input.Description,
		Enabled:     input.Enabled,
		Status:      input.Status,
		SortOrder:   input.SortOrder,
	}
}

func mapSidebarCommandDefinitionRequest(input sidebarCommandDefinitionRequest) services.SaveSidebarCommandDefinitionInput {
	return services.SaveSidebarCommandDefinitionInput{
		CommandID:    input.CommandID,
		Title:        input.Title,
		Description:  input.Description,
		Route:        input.Route,
		SearchParams: input.SearchParams,
		Icon:         input.Icon,
		Category:     input.Category,
		Assignable:   input.Assignable,
		Enabled:      input.Enabled,
		Status:       input.Status,
		SortOrder:    input.SortOrder,
	}
}

func GetSidebarCommandLibraryHandler(c *gin.Context) {
	commands, err := services.ListSidebarCommandDefinitions()
	if err != nil {
		handleSidebarCommandError(c, err, "Failed to load sidebar command library")
		return
	}
	c.JSON(http.StatusOK, commands)
}

func GetSidebarCommandCategoriesHandler(c *gin.Context) {
	categories, err := services.ListSidebarCommandCategories()
	if err != nil {
		handleSidebarCommandError(c, err, "Failed to load sidebar command categories")
		return
	}
	c.JSON(http.StatusOK, categories)
}

func CreateSidebarCommandCategoryHandler(c *gin.Context) {
	var input sidebarCommandCategoryRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	category, err := services.CreateSidebarCommandCategory(mapSidebarCommandCategoryRequest(input))
	if err != nil {
		handleSidebarCommandError(c, err, "Failed to create sidebar command category")
		return
	}
	c.JSON(http.StatusCreated, category)
}

func UpdateSidebarCommandCategoryHandler(c *gin.Context) {
	categoryID := strings.TrimSpace(c.Param("categoryId"))
	if categoryID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] category id is required"})
		return
	}

	var input sidebarCommandCategoryRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	category, err := services.UpdateSidebarCommandCategory(categoryID, mapSidebarCommandCategoryRequest(input))
	if err != nil {
		handleSidebarCommandError(c, err, "Failed to update sidebar command category")
		return
	}
	c.JSON(http.StatusOK, category)
}

func SetSidebarCommandCategoryEnabledHandler(c *gin.Context) {
	categoryID := strings.TrimSpace(c.Param("categoryId"))
	if categoryID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] category id is required"})
		return
	}

	var input setSidebarCommandEnabledRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	category, err := services.SetSidebarCommandCategoryEnabled(categoryID, services.SetSidebarCommandCategoryEnabledInput{
		Enabled: input.Enabled,
	})
	if err != nil {
		handleSidebarCommandError(c, err, "Failed to update sidebar command category status")
		return
	}
	c.JSON(http.StatusOK, category)
}

func CreateSidebarCommandDefinitionHandler(c *gin.Context) {
	var input sidebarCommandDefinitionRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	command, err := services.CreateSidebarCommandDefinition(mapSidebarCommandDefinitionRequest(input))
	if err != nil {
		handleSidebarCommandError(c, err, "Failed to create sidebar command definition")
		return
	}

	c.JSON(http.StatusCreated, command)
}

func UpdateSidebarCommandDefinitionHandler(c *gin.Context) {
	commandID := strings.TrimSpace(c.Param("commandId"))
	if commandID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] command id is required"})
		return
	}

	var input sidebarCommandDefinitionRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	command, err := services.UpdateSidebarCommandDefinition(commandID, mapSidebarCommandDefinitionRequest(input))
	if err != nil {
		handleSidebarCommandError(c, err, "Failed to update sidebar command definition")
		return
	}

	c.JSON(http.StatusOK, command)
}

func SetSidebarCommandDefinitionEnabledHandler(c *gin.Context) {
	commandID := strings.TrimSpace(c.Param("commandId"))
	if commandID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] command id is required"})
		return
	}

	var input setSidebarCommandEnabledRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	command, err := services.SetSidebarCommandDefinitionEnabled(commandID, services.SetSidebarCommandEnabledInput{
		Enabled: input.Enabled,
	})
	if err != nil {
		handleSidebarCommandError(c, err, "Failed to update sidebar command status")
		return
	}

	c.JSON(http.StatusOK, command)
}

func ReorderSidebarCommandDefinitionsHandler(c *gin.Context) {
	var input reorderSidebarCommandDefinitionsRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	commands, err := services.ReorderSidebarCommandDefinitions(services.ReorderSidebarCommandDefinitionsInput{
		CommandIDs: input.CommandIDs,
	})
	if err != nil {
		handleSidebarCommandError(c, err, "Failed to reorder sidebar command definitions")
		return
	}

	c.JSON(http.StatusOK, commands)
}
