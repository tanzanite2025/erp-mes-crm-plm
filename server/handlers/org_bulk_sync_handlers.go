package handlers

import (
	"net/http"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func BulkSyncOrgHandler(c *gin.Context) {
	if !enforceBulkSyncRole(c) {
		return
	}

	var input []models.Organization
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid organization bulk payload: " + err.Error()})
		return
	}

	count, err := services.BulkSyncOrganizations(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[CRITICAL_SYNC_FAILED] failed to bulk sync organizations: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "count": count})
}

func BulkSyncEmployeesHandler(c *gin.Context) {
	if !enforceBulkSyncRole(c) {
		return
	}

	var input []models.Employee
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid employee bulk payload: " + err.Error()})
		return
	}

	count, err := services.BulkSyncEmployees(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[CRITICAL_SYNC_FAILED] failed to bulk sync employees: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "count": count})
}
