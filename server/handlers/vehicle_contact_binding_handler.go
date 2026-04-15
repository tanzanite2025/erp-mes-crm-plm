package handlers

import (
	"net/http"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func GetVehicleContactBindingsHandler(c *gin.Context) {
	items, err := services.ListVehicleContactBindings(services.VehicleContactBindingFilter{
		VehicleID: c.Query("vehicleId"),
		Category:  c.Query("category"),
		Enabled:   c.Query("enabled"),
		Keyword:   c.Query("keyword"),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}

func GetVehicleContactBindingHandler(c *gin.Context) {
	binding, ok := services.GetVehicleContactBindingByID(c.Param("id"))
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "binding not found"})
		return
	}
	c.JSON(http.StatusOK, binding)
}

func SaveVehicleContactBindingHandler(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		id = c.Param("bindingId")
	}
	var input services.VehicleContactBindingUpsert
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	binding, err := services.UpsertVehicleContactBinding(id, input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, binding)
}

func DeleteVehicleContactBindingHandler(c *gin.Context) {
	if ok := services.DeleteVehicleContactBinding(c.Param("id")); !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "binding not found"})
		return
	}
	c.Status(http.StatusNoContent)
}
