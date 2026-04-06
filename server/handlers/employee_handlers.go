package handlers

import (
	"net/http"
	"strings"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

type bulkUpdateEmployeeStatusRequest struct {
	IDs    []string `json:"ids"`
	Status string   `json:"status"`
}

func GetEmployeesHandler(c *gin.Context) {
	employees, err := services.ListEmployees()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch employees"})
		return
	}
	c.JSON(http.StatusOK, employees)
}

func BulkUpdateEmployeeStatusHandler(c *gin.Context) {
	var input bulkUpdateEmployeeStatusRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid employee status payload: " + err.Error()})
		return
	}
	if len(input.IDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ids cannot be empty"})
		return
	}

	updated, err := services.BulkUpdateEmployeeStatus(input.IDs, input.Status)
	if err != nil {
		if err == services.ErrInvalidEmployeeStatus || err == services.ErrEmptyEmployeeIDs {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to bulk update employee status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "updated": updated})
}

func SaveEmployeeHandler(c *gin.Context) {
	var input models.Employee
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid employee payload: " + err.Error()})
		return
	}

	employee, err := services.SaveEmployee(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save employee"})
		return
	}

	c.JSON(http.StatusOK, employee)
}

func DeleteEmployeeHandler(c *gin.Context) {
	ids := strings.Split(c.Param("id"), ",")

	err := services.DeleteEmployees(ids)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete employees and disable linked users"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Employees deleted and linked users disabled"})
}
