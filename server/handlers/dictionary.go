package handlers

import (
	"errors"
	"net/http"
	"strings"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type createDictGroupRequest struct {
	Name        string `json:"name"`
	Code        string `json:"code"`
	Description string `json:"description"`
	Active      *bool  `json:"active"`
}

type patchDictGroupRequest struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	Active      *bool   `json:"active"`
	Version     string  `json:"version"`
}

type createDictEntryRequest struct {
	GroupID     string `json:"groupId"`
	Label       string `json:"label"`
	Code        string `json:"code"`
	Description string `json:"description"`
	Options     []any  `json:"options"`
	SortOrder   *int   `json:"sortOrder"`
	Active      *bool  `json:"active"`
}

type patchDictEntryRequest struct {
	Label       *string `json:"label"`
	Description *string `json:"description"`
	Options     *[]any  `json:"options"`
	SortOrder   *int    `json:"sortOrder"`
	Active      *bool   `json:"active"`
	Version     string  `json:"version"`
}

func isDictionaryBadRequest(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()

	if strings.HasPrefix(msg, "invalid version timestamp:") {
		return true
	}
	if strings.HasPrefix(msg, "options[") {
		return true
	}

	switch msg {
	case "version is required",
		"group code is required",
		"entry code is required",
		"at least one field must be provided",
		"name cannot be empty",
		"label cannot be empty",
		"name/code cannot be empty",
		"groupId/label/code cannot be empty":
		return true
	default:
		return false
	}
}

func GetDictGroupsHandler(c *gin.Context) {
	groups, err := services.ListDictGroups()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to fetch dictionary groups: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, groups)
}

func SaveDictGroupHandler(c *gin.Context) {
	var input createDictGroupRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	created, err := services.CreateDictGroup(services.CreateDictGroupInput{
		Name:        input.Name,
		Code:        input.Code,
		Description: input.Description,
		Active:      input.Active,
	})
	if err != nil {
		switch {
		case strings.HasPrefix(err.Error(), "conflict:"):
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		case isDictionaryBadRequest(err):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to save dictionary group: " + err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, created)
}

func PatchDictGroupHandler(c *gin.Context) {
	var input patchDictGroupRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	updated, err := services.PatchDictGroup(services.PatchDictGroupInput{
		Code:        c.Param("code"),
		Name:        input.Name,
		Description: input.Description,
		Active:      input.Active,
		Version:     input.Version,
	})
	if err != nil {
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "dictionary group not found"})
		case strings.HasPrefix(err.Error(), "forbidden:"):
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		case strings.HasPrefix(err.Error(), "conflict:"):
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		case isDictionaryBadRequest(err):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to update dictionary group: " + err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, updated)
}

func DeleteDictGroupHandler(c *gin.Context) {
	err := services.DeleteDictGroup(c.Param("code"))
	if err != nil {
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "dictionary group not found"})
		case strings.HasPrefix(err.Error(), "forbidden:"):
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		case isDictionaryBadRequest(err):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to delete dictionary group: " + err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

func GetDictEntriesHandler(c *gin.Context) {
	entries, err := services.ListDictEntries(c.Query("groupId"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to fetch dictionary entries: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, entries)
}

func SaveDictEntryHandler(c *gin.Context) {
	var input createDictEntryRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	created, err := services.CreateDictEntry(services.CreateDictEntryInput{
		GroupID:     input.GroupID,
		Label:       input.Label,
		Code:        input.Code,
		Description: input.Description,
		Options:     input.Options,
		SortOrder:   input.SortOrder,
		Active:      input.Active,
	})
	if err != nil {
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusBadRequest, gin.H{"error": "dictionary group not found"})
		case strings.HasPrefix(err.Error(), "conflict:"):
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		case isDictionaryBadRequest(err):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to save dictionary entry: " + err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, created)
}

func PatchDictEntryHandler(c *gin.Context) {
	var input patchDictEntryRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	updated, err := services.PatchDictEntry(services.PatchDictEntryInput{
		Code:        c.Param("code"),
		Label:       input.Label,
		Description: input.Description,
		Options:     input.Options,
		SortOrder:   input.SortOrder,
		Active:      input.Active,
		Version:     input.Version,
	})
	if err != nil {
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "dictionary entry not found"})
		case strings.HasPrefix(err.Error(), "forbidden:"):
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		case strings.HasPrefix(err.Error(), "conflict:"):
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		case isDictionaryBadRequest(err):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, updated)
}

func DeleteDictEntryHandler(c *gin.Context) {
	err := services.DeleteDictEntry(c.Param("code"))
	if err != nil {
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "dictionary entry not found"})
		case strings.HasPrefix(err.Error(), "forbidden:"):
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		case isDictionaryBadRequest(err):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to delete dictionary entry: " + err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

func SyncDictionaryHandler(c *gin.Context) {
	if err := services.SyncDictionary(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] dictionary sync failed: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "synced"})
}

func BulkSyncDictionaryHandler(c *gin.Context) {
	if !enforceBulkSyncRole(c) {
		return
	}

	var input services.BulkSyncDictionaryInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	if err := services.BulkSyncDictionary(input); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] bulk dictionary sync failed: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":       "bulk sync success",
		"groups_count":  len(input.Groups),
		"entries_count": len(input.Entries),
	})
}
