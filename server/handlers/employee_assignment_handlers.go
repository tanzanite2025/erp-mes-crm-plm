package handlers

import (
	"errors"
	"net/http"
	"strings"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type changeEmployeeOrgUnitRequest struct {
	OrgUnitID       string `json:"orgUnitId"`
	ExpectedVersion int    `json:"expectedVersion"`
	Remarks         string `json:"remarks"`
}

type changeEmployeePositionRequest struct {
	PositionID      string `json:"positionId"`
	ExpectedVersion int    `json:"expectedVersion"`
	Remarks         string `json:"remarks"`
}

func ChangeEmployeeOrgUnitHandler(c *gin.Context) {
	employeeID := strings.TrimSpace(c.Param("id"))
	if employeeID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "employee id is required"})
		return
	}

	var input changeEmployeeOrgUnitRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid change org unit payload: " + err.Error()})
		return
	}

	response, err := services.ChangeEmployeeOrgUnit(services.ChangeEmployeeOrgUnitRequest{
		EmployeeID:      employeeID,
		OrgUnitID:       input.OrgUnitID,
		ExpectedVersion: input.ExpectedVersion,
		Remarks:         input.Remarks,
	})
	if err != nil {
		switch {
		case errors.Is(err, services.ErrEmployeePatchVersionConflict):
			respondVersionConflict(c)
		case errors.Is(err, services.ErrEmployeeOrgUnitRequired):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		case errors.Is(err, services.ErrEmployeeOrgUnitNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "employee not found"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to change employee org unit"})
		}
		return
	}

	c.JSON(http.StatusOK, response)
}

func ChangeEmployeePositionHandler(c *gin.Context) {
	employeeID := strings.TrimSpace(c.Param("id"))
	if employeeID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "employee id is required"})
		return
	}

	var input changeEmployeePositionRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid change position payload: " + err.Error()})
		return
	}

	response, err := services.ChangeEmployeePosition(services.ChangeEmployeePositionRequest{
		EmployeeID:      employeeID,
		PositionID:      input.PositionID,
		ExpectedVersion: input.ExpectedVersion,
		Remarks:         input.Remarks,
	})
	if err != nil {
		switch {
		case errors.Is(err, services.ErrEmployeePatchVersionConflict):
			respondVersionConflict(c)
		case errors.Is(err, services.ErrEmployeePositionRequired):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		case errors.Is(err, services.ErrEmployeePositionNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		case errors.Is(err, services.ErrEmployeeAssignmentsUnavailable):
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "employee not found"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to change employee position"})
		}
		return
	}

	c.JSON(http.StatusOK, response)
}

func ClearEmployeePositionHandler(c *gin.Context) {
	employeeID := strings.TrimSpace(c.Param("id"))
	if employeeID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "employee id is required"})
		return
	}

	var input struct {
		ExpectedVersion int    `json:"expectedVersion"`
		Remarks         string `json:"remarks"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid clear position payload: " + err.Error()})
		return
	}

	response, err := services.ClearEmployeePosition(services.ClearEmployeePositionRequest{
		EmployeeID:      employeeID,
		ExpectedVersion: input.ExpectedVersion,
		Remarks:         input.Remarks,
	})
	if err != nil {
		switch {
		case errors.Is(err, services.ErrEmployeePatchVersionConflict):
			respondVersionConflict(c)
		case errors.Is(err, services.ErrEmployeeAssignmentsUnavailable):
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "employee not found"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to clear employee position"})
		}
		return
	}

	c.JSON(http.StatusOK, response)
}
