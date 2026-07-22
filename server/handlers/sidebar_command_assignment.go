package handlers

import (
	"net/http"
	"strings"
	"xdfc-server/middleware"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
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

func GetAssignableSidebarCommandsHandler(c *gin.Context) {
	commands, err := services.ListAssignableSidebarCommands()
	if err != nil {
		handleSidebarCommandError(c, err, "Failed to load assignable sidebar commands")
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
		handleSidebarCommandError(c, err, "Failed to load sidebar commands")
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
		handleSidebarCommandError(c, err, "Failed to load sidebar command assignment")
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
		handleSidebarCommandError(c, err, "Failed to replace sidebar command assignment")
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
		handleSidebarCommandError(c, err, "Failed to batch assign sidebar commands")
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
		handleSidebarCommandError(c, err, "Failed to copy sidebar command assignment")
		return
	}

	c.JSON(http.StatusOK, result)
}
