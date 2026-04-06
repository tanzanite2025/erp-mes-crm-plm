package handlers

import (
	"net/http"
	"xdfc-server/middleware"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func GetProcessStepsHandler(c *gin.Context) {
	steps, err := services.ListProcessSteps()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch process steps"})
		return
	}
	c.JSON(http.StatusOK, steps)
}

func SaveProcessStepHandler(c *gin.Context) {
	var req services.SaveProcessStepHandlerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	step, err := services.SaveProcessStep(services.MapSaveProcessStepHandlerRequestToServiceRequest(req, middleware.GetSafeUsername(c), c.ClientIP()))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save process step: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, step)
}

func DeleteProcessStepHandler(c *gin.Context) {
	id := c.Param("id")
	if err := services.DeleteProcessStep(id, middleware.GetSafeUsername(c), c.ClientIP()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete process step"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Deleted successfully"})
}
