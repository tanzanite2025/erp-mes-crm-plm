package handlers

import (
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

const queryParamWithLines = "withLines"
const queryParamStatus = "status"
const queryParamKeyword = "keyword"
const queryParamPaymentMethod = "paymentMethod"
const queryParamPaymentTerm = "paymentTerm"
const queryParamCurrency = "currency"
const queryParamOutstandingMin = "outstandingMin"
const queryParamOutstandingMax = "outstandingMax"
const queryParamSortBy = "sortBy"
const queryParamSortOrder = "sortOrder"
const queryParamSourceType = "sourceType"
const queryParamSourceRefID = "sourceRefId"

func queryIncludesLines(c *gin.Context) bool {
	if c == nil {
		return false
	}
	return strings.EqualFold(strings.TrimSpace(c.Query(queryParamWithLines)), "true")
}

func queryStatusFilter(c *gin.Context) string {
	if c == nil {
		return ""
	}
	return queryStringParam(c, queryParamStatus)
}

func queryKeywordFilter(c *gin.Context) string {
	return queryStringParam(c, queryParamKeyword)
}

func queryPaymentMethodFilter(c *gin.Context) string {
	return queryStringParam(c, queryParamPaymentMethod)
}

func queryPaymentTermFilter(c *gin.Context) string {
	return queryStringParam(c, queryParamPaymentTerm)
}

func queryCurrencyFilter(c *gin.Context) string {
	return queryStringParam(c, queryParamCurrency)
}

func queryOutstandingMin(c *gin.Context) float64 {
	return queryFloatParam(c, queryParamOutstandingMin)
}

func queryOutstandingMax(c *gin.Context) float64 {
	return queryFloatParam(c, queryParamOutstandingMax)
}

func querySortBy(c *gin.Context) string {
	return queryStringParam(c, queryParamSortBy)
}

func querySortOrder(c *gin.Context) string {
	return queryStringParam(c, queryParamSortOrder)
}

func querySourceType(c *gin.Context) string {
	return queryStringParam(c, queryParamSourceType)
}

func querySourceRefID(c *gin.Context) string {
	return queryStringParam(c, queryParamSourceRefID)
}

func queryStringParam(c *gin.Context, key string) string {
	if c == nil {
		return ""
	}
	return strings.TrimSpace(c.Query(key))
}

func queryFloatParam(c *gin.Context, key string) float64 {
	value, err := strconv.ParseFloat(queryStringParam(c, key), 64)
	if err != nil {
		return 0
	}
	return value
}
