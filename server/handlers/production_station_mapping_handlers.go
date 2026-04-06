package handlers

import (
	"net/http"
	"xdfc-server/middleware"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func AssignProcessToStationHandler(c *gin.Context) {
	var req services.StationProcessMappingHandlerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := services.AssignProcessToStation(services.StationProcessMappingRequest{
		StationID: req.StationID,
		ProcessID: req.ProcessID,
		Operator:  middleware.GetSafeUsername(c),
		IP:        c.ClientIP(),
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to assign process to station"})
		return
	}

	c.JSON(http.StatusOK, services.MessageResponse{Message: "Assigned successfully"})
}

func RemoveProcessFromStationHandler(c *gin.Context) {
	var req services.StationProcessMappingHandlerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := services.RemoveProcessFromStation(services.StationProcessMappingRequest{
		StationID: req.StationID,
		ProcessID: req.ProcessID,
		Operator:  middleware.GetSafeUsername(c),
		IP:        c.ClientIP(),
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove process from station"})
		return
	}

	c.JSON(http.StatusOK, services.MessageResponse{Message: "Removed successfully"})
}

func GetStationMappingsHandler(c *gin.Context) {
	mappings, err := services.ListStationMappings()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch mappings"})
		return
	}

	c.JSON(http.StatusOK, mappings)
}
