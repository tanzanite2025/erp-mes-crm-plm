package handlers

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func decodeIndependentPieceworkPayrollJSONRequest(c *gin.Context, target any) error {
	decoder := json.NewDecoder(c.Request.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		return err
	}
	var trailing any
	if err := decoder.Decode(&trailing); err != io.EOF {
		return errors.New("exactly one JSON object is required")
	}
	return nil
}

func GetPieceworkPayItemsHandler(c *gin.Context) {
	items, err := services.ListPieceworkPayItems(auditContextFromGin(c))
	if err != nil {
		respondIndependentPieceworkPayrollError(c, err)
		return
	}
	c.JSON(http.StatusOK, items)
}

func SavePieceworkPayItemHandler(c *gin.Context) {
	var request services.PieceworkPayItemCommand
	if err := decodeIndependentPieceworkPayrollJSONRequest(c, &request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] " + err.Error()})
		return
	}
	item, err := services.SavePieceworkPayItem(auditContextFromGin(c), request)
	if err != nil {
		respondIndependentPieceworkPayrollError(c, err)
		return
	}
	c.JSON(http.StatusOK, item)
}

func GetFinancePieceworkCalculationOptionsHandler(c *gin.Context) {
	options, err := services.ListFinancePieceworkCalculationOptions(c.Request.Context())
	if err != nil {
		respondIndependentPieceworkPayrollError(c, err)
		return
	}
	c.JSON(http.StatusOK, options)
}

func CalculateFinancePieceworkSalaryHandler(c *gin.Context) {
	var request services.FinancePieceworkSalaryCalculationRequest
	if err := decodeIndependentPieceworkPayrollJSONRequest(c, &request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] " + err.Error()})
		return
	}
	result, err := services.CalculateFinancePieceworkSalary(c.Request.Context(), request)
	if err != nil {
		respondIndependentPieceworkPayrollError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func respondIndependentPieceworkPayrollError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, services.ErrPieceworkRateVersionConflict):
		respondVersionConflict(c)
	case errors.Is(err, services.ErrInvalidFinancePieceworkCalculation), errors.Is(err, services.ErrInvalidPieceworkPayItem), errors.Is(err, services.ErrInvalidPieceworkRate):
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] " + err.Error()})
	case errors.Is(err, services.ErrPieceworkRateNotFound):
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 所选环节在计算日期没有生效工价"})
	case errors.Is(err, gorm.ErrRecordNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "记录不存在"})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 工资计算操作失败"})
	}
}
