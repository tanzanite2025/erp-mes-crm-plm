package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
	"xdfc-server/middleware"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func isCuttingIssuanceValidationError(err error) bool {
	if err == nil {
		return false
	}
	message := strings.ToLower(strings.TrimSpace(err.Error()))
	validationTokens := []string{
		"invalid",
		"required",
		"greater than zero",
		"must be unique",
		"must equal",
	}
	for _, token := range validationTokens {
		if strings.Contains(message, token) {
			return true
		}
	}
	return false
}

func parseCuttingIssuanceTime(raw string, isEnd bool) (*time.Time, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return nil, nil
	}

	rfcParsed, err := time.Parse(time.RFC3339, trimmed)
	if err == nil {
		utc := rfcParsed.UTC()
		return &utc, nil
	}

	dateTimeParsed, err := time.Parse("2006-01-02 15:04:05", trimmed)
	if err == nil {
		utc := dateTimeParsed.UTC()
		return &utc, nil
	}

	dateOnlyParsed, err := time.Parse("2006-01-02", trimmed)
	if err == nil {
		utc := dateOnlyParsed.UTC()
		if isEnd {
			utc = utc.Add(24*time.Hour - time.Nanosecond)
		}
		return &utc, nil
	}

	return nil, fmt.Errorf("time format must be RFC3339 or yyyy-mm-dd")
}

func parseCuttingIssuanceListQuery(c *gin.Context, includePagination bool) (services.CuttingIssuanceListQuery, error) {
	query := services.CuttingIssuanceListQuery{
		OrderNo:      strings.TrimSpace(c.Query("orderNo")),
		Status:       strings.TrimSpace(c.Query("status")),
		ProductModel: strings.TrimSpace(c.Query("productModel")),
	}

	if includePagination {
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))
		query.Page = page
		query.PageSize = pageSize
	}

	if holeCountRaw := strings.TrimSpace(c.Query("holeCount")); holeCountRaw != "" {
		holeCount, err := strconv.Atoi(holeCountRaw)
		if err != nil || holeCount < 0 {
			return services.CuttingIssuanceListQuery{}, fmt.Errorf("holeCount must be a non-negative integer")
		}
		query.HoleCount = &holeCount
	}

	createdAtFromRaw := strings.TrimSpace(c.Query("createdAtFrom"))
	if createdAtFromRaw == "" {
		createdAtFromRaw = strings.TrimSpace(c.Query("dateFrom"))
	}
	createdAtFrom, err := parseCuttingIssuanceTime(createdAtFromRaw, false)
	if err != nil {
		return services.CuttingIssuanceListQuery{}, fmt.Errorf("createdAtFrom %w", err)
	}
	createdAtToRaw := strings.TrimSpace(c.Query("createdAtTo"))
	if createdAtToRaw == "" {
		createdAtToRaw = strings.TrimSpace(c.Query("dateTo"))
	}
	createdAtTo, err := parseCuttingIssuanceTime(createdAtToRaw, true)
	if err != nil {
		return services.CuttingIssuanceListQuery{}, fmt.Errorf("createdAtTo %w", err)
	}
	if createdAtFrom != nil && createdAtTo != nil && createdAtFrom.After(*createdAtTo) {
		return services.CuttingIssuanceListQuery{}, fmt.Errorf("createdAtFrom must be less than or equal to createdAtTo")
	}

	query.CreatedAtFrom = createdAtFrom
	query.CreatedAtTo = createdAtTo
	return query, nil
}

func GetCuttingIssuanceExecutionsHandler(c *gin.Context) {
	query, err := parseCuttingIssuanceListQuery(c, true)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] " + err.Error()})
		return
	}

	response, err := services.ListCuttingIssuanceExecutions(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to list cutting issuance executions: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}

func GetCuttingIssuanceTraceReportHandler(c *gin.Context) {
	query, err := parseCuttingIssuanceListQuery(c, false)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] " + err.Error()})
		return
	}

	response, err := services.GetCuttingIssuanceTraceReport(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to build cutting issuance trace report: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}

func CreateCuttingIssuanceExecutionHandler(c *gin.Context) {
	var req services.CreateCuttingIssuanceExecutionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid cutting issuance payload: " + err.Error()})
		return
	}

	response, err := services.CreateCuttingIssuanceExecution(
		req,
		middleware.GetSafeUserID(c),
		middleware.GetSafeUsername(c),
	)
	if err != nil {
		if isCuttingIssuanceValidationError(err) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] " + err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to create cutting issuance execution: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}
