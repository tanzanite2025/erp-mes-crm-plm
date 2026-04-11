package handlers

import (
	"net/http"
	"xdfc-server/middleware"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func AssignProcessToJobCategoryHandler(c *gin.Context) {
	var req services.JobCategoryProcessMappingHandlerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := services.AssignProcessToJobCategory(services.JobCategoryProcessMappingRequest{
		JobCategoryID: req.JobCategoryID,
		ProcessID:     req.ProcessID,
		Operator:      middleware.GetSafeUsername(c),
		IP:            c.ClientIP(),
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to assign process to job category"})
		return
	}

	c.JSON(http.StatusOK, services.MessageResponse{Message: "Assigned successfully"})
}

func RemoveProcessFromJobCategoryHandler(c *gin.Context) {
	var req services.JobCategoryProcessMappingHandlerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := services.RemoveProcessFromJobCategory(services.JobCategoryProcessMappingRequest{
		JobCategoryID: req.JobCategoryID,
		ProcessID:     req.ProcessID,
		Operator:      middleware.GetSafeUsername(c),
		IP:            c.ClientIP(),
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove process from job category"})
		return
	}

	c.JSON(http.StatusOK, services.MessageResponse{Message: "Removed successfully"})
}
