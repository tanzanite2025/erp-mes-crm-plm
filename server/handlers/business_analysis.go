package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

const businessAnalysisDateLayout = "2006-01-02"

// GetBusinessAnalysisProductionCapacityHandler returns one canonical,
// read-only response for the monthly capacity report. The handler only
// translates HTTP parameters; aggregation and data-quality rules live in the
// business-analysis service.
func GetBusinessAnalysisProductionCapacityHandler(c *gin.Context) {
	query, err := parseBusinessAnalysisProductionCapacityQuery(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] " + err.Error()})
		return
	}

	response, err := services.QueryBusinessAnalysisProductionCapacity(
		c.Request.Context(),
		query,
	)
	if err != nil {
		if errors.Is(err, services.ErrBusinessAnalysisInvalidDateRange) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] " + err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取经营分析产能数据失败"})
		return
	}

	c.JSON(http.StatusOK, response)
}

func GetBusinessAnalysisProductionCapacityOptionsHandler(c *gin.Context) {
	response, err := services.ListBusinessAnalysisProductionCapacityOptions(
		c.Request.Context(),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取经营分析筛选项失败"})
		return
	}

	c.JSON(http.StatusOK, response)
}

func parseBusinessAnalysisProductionCapacityQuery(
	c *gin.Context,
) (services.BusinessAnalysisProductionCapacityQuery, error) {
	now := time.Now()
	defaultFrom := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	defaultTo := defaultFrom.AddDate(0, 1, 0)

	from, err := parseBusinessAnalysisDate(c.Query("from"), defaultFrom)
	if err != nil {
		return services.BusinessAnalysisProductionCapacityQuery{}, err
	}
	to, err := parseBusinessAnalysisDate(c.Query("to"), defaultTo)
	if err != nil {
		return services.BusinessAnalysisProductionCapacityQuery{}, err
	}

	includeCanceled := false
	if raw := strings.TrimSpace(c.Query("includeCanceled")); raw != "" {
		parsed, err := strconv.ParseBool(raw)
		if err != nil {
			return services.BusinessAnalysisProductionCapacityQuery{}, errors.New("includeCanceled 必须是 true 或 false")
		}
		includeCanceled = parsed
	}

	status := strings.TrimSpace(c.Query("status"))
	if status != "" && status != "ALL" && !services.IsProductionPlanStatus(status) {
		return services.BusinessAnalysisProductionCapacityQuery{}, errors.New("非法生产计划状态: " + status)
	}

	return services.BusinessAnalysisProductionCapacityQuery{
		From:            from,
		To:              to,
		CustomerID:      strings.TrimSpace(c.Query("customerId")),
		ProductID:       strings.TrimSpace(c.Query("productId")),
		Status:          status,
		IncludeCanceled: includeCanceled,
	}, nil
}

func parseBusinessAnalysisDate(raw string, fallback time.Time) (time.Time, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return fallback, nil
	}
	parsed, err := time.ParseInLocation(businessAnalysisDateLayout, raw, fallback.Location())
	if err != nil {
		return time.Time{}, errors.New("日期必须使用 YYYY-MM-DD 格式")
	}
	return parsed, nil
}
