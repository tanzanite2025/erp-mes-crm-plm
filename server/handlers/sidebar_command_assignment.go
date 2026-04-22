package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"xdfc-server/middleware"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type replaceSidebarCommandAssignmentRequest struct {
	CategoryIDs []string `json:"categoryIds"`
	CommandIDs  []string `json:"commandIds"`
}

type batchSidebarCommandAssignmentRequest struct {
	UserIDs     []string `json:"userIds"`
	CategoryIDs []string `json:"categoryIds"`
	CommandIDs  []string `json:"commandIds"`
	Mode        string   `json:"mode"`
}

type copySidebarCommandAssignmentRequest struct {
	SourceUserID  string   `json:"sourceUserId"`
	TargetUserIDs []string `json:"targetUserIds"`
}

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

type mySidebarCommandsResponse struct {
	// Contract: business shortcuts must be returned as full command definitions.
	// Do not add businessCommandIds or any ID-array compatibility field here.
	BusinessCommands  []services.SidebarCommandDefinition `json:"businessCommands"`
	PrivateCommandIDs []string                            `json:"privateCommandIds"`
}

var defaultPrivateSidebarCommandIDs = []string{
	"personal_workbench_photo",
	"personal_workbench_video",
	"personal_workbench_buffer",
}

func handleSidebarCommandAssignmentError(c *gin.Context, err error, fallback string) {
	switch {
	case errors.Is(err, services.ErrSidebarCommandUserNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
	case errors.Is(err, services.ErrSidebarCommandDefinitionNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "Sidebar command definition not found"})
	case errors.Is(err, services.ErrSidebarCommandDefinitionConflict):
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
	case errors.Is(err, services.ErrSidebarCommandCategoryNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "Sidebar command category not found"})
	case errors.Is(err, services.ErrSidebarCommandCategoryConflict):
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
	case errors.Is(err, services.ErrSidebarCommandInvalid):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	case errors.Is(err, services.ErrSidebarCommandEmptyTargets):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	case errors.Is(err, gorm.ErrInvalidDB):
		c.JSON(http.StatusInternalServerError, gin.H{"error": fallback})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": fallback})
	}
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

func GetAssignableSidebarCommandsHandler(c *gin.Context) {
	commands, err := services.ListAssignableSidebarCommands()
	if err != nil {
		handleSidebarCommandAssignmentError(c, err, "Failed to load assignable sidebar commands")
		return
	}
	c.JSON(http.StatusOK, commands)
}

func GetSidebarCommandLibraryHandler(c *gin.Context) {
	commands, err := services.ListSidebarCommandDefinitions()
	if err != nil {
		handleSidebarCommandAssignmentError(c, err, "Failed to load sidebar command library")
		return
	}
	c.JSON(http.StatusOK, commands)
}

func GetSidebarCommandCategoriesHandler(c *gin.Context) {
	categories, err := services.ListSidebarCommandCategories()
	if err != nil {
		handleSidebarCommandAssignmentError(c, err, "Failed to load sidebar command categories")
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
		handleSidebarCommandAssignmentError(c, err, "Failed to create sidebar command category")
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
		handleSidebarCommandAssignmentError(c, err, "Failed to update sidebar command category")
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
		handleSidebarCommandAssignmentError(c, err, "Failed to update sidebar command category status")
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
		handleSidebarCommandAssignmentError(c, err, "Failed to create sidebar command definition")
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
		handleSidebarCommandAssignmentError(c, err, "Failed to update sidebar command definition")
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
		handleSidebarCommandAssignmentError(c, err, "Failed to update sidebar command status")
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
		handleSidebarCommandAssignmentError(c, err, "Failed to reorder sidebar command definitions")
		return
	}

	c.JSON(http.StatusOK, commands)
}

func GetSidebarCommandAssignmentUsersHandler(c *gin.Context) {
	statuses := make([]string, 0, len(c.QueryArray("status")))
	for _, status := range c.QueryArray("status") {
		status = strings.TrimSpace(status)
		if status != "" {
			statuses = append(statuses, status)
		}
	}

	options, err := services.ListUserOptions(services.UserQuery{
		Username: strings.TrimSpace(c.Query("username")),
		Statuses: statuses,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load sidebar command users"})
		return
	}

	c.JSON(http.StatusOK, options)
}

func GetMySidebarCommandsHandler(c *gin.Context) {
	userID := middleware.GetSafeUserID(c)
	if strings.TrimSpace(userID) == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing current user"})
		return
	}

	view, err := services.GetSidebarCommandAssignment(userID)
	if err != nil {
		handleSidebarCommandAssignmentError(c, err, "Failed to load sidebar commands")
		return
	}
	c.JSON(http.StatusOK, mySidebarCommandsResponse{
		BusinessCommands:  view.EffectiveCommands,
		PrivateCommandIDs: defaultPrivateSidebarCommandIDs,
	})
}

func GetUserSidebarCommandAssignmentHandler(c *gin.Context) {
	userID := strings.TrimSpace(c.Param("id"))
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] user id is required"})
		return
	}

	view, err := services.GetSidebarCommandAssignment(userID)
	if err != nil {
		handleSidebarCommandAssignmentError(c, err, "Failed to load sidebar command assignment")
		return
	}

	c.JSON(http.StatusOK, view)
}

func ReplaceUserSidebarCommandAssignmentHandler(c *gin.Context) {
	userID := strings.TrimSpace(c.Param("id"))
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] user id is required"})
		return
	}

	var input replaceSidebarCommandAssignmentRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	view, err := services.ReplaceSidebarCommandAssignment(userID, services.ReplaceSidebarCommandsInput{
		CategoryIDs: input.CategoryIDs,
		CommandIDs:  input.CommandIDs,
		AssignedBy:  middleware.GetSafeUserID(c),
		Source:      "manual",
	})
	if err != nil {
		handleSidebarCommandAssignmentError(c, err, "Failed to replace sidebar command assignment")
		return
	}

	c.JSON(http.StatusOK, view)
}

func BatchAssignSidebarCommandsHandler(c *gin.Context) {
	var input batchSidebarCommandAssignmentRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := services.BatchAssignSidebarCommands(services.BatchSidebarCommandsInput{
		UserIDs:     input.UserIDs,
		CategoryIDs: input.CategoryIDs,
		CommandIDs:  input.CommandIDs,
		Mode:        input.Mode,
		AssignedBy:  middleware.GetSafeUserID(c),
	})
	if err != nil {
		handleSidebarCommandAssignmentError(c, err, "Failed to batch assign sidebar commands")
		return
	}

	c.JSON(http.StatusOK, result)
}

func CopySidebarCommandAssignmentHandler(c *gin.Context) {
	var input copySidebarCommandAssignmentRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := services.CopySidebarCommandAssignment(services.CopySidebarCommandsInput{
		SourceUserID:  input.SourceUserID,
		TargetUserIDs: input.TargetUserIDs,
		AssignedBy:    middleware.GetSafeUserID(c),
	})
	if err != nil {
		handleSidebarCommandAssignmentError(c, err, "Failed to copy sidebar command assignment")
		return
	}

	c.JSON(http.StatusOK, result)
}
