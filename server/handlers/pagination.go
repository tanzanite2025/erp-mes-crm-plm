package handlers

import (
	"strconv"

	"github.com/gin-gonic/gin"
)

const (
	queryParamPage     = "page"
	queryParamPageSize = "pageSize"
)

func parsePageQuery(c *gin.Context, defaultPageSize int) (int, int) {
	return parsePageAndSize(c, 1, defaultPageSize)
}

func parsePageAndSize(c *gin.Context, defaultPage, defaultPageSize int) (int, int) {
	page, _ := strconv.Atoi(c.DefaultQuery(queryParamPage, strconv.Itoa(defaultPage)))
	pageSize, _ := strconv.Atoi(c.DefaultQuery(queryParamPageSize, strconv.Itoa(defaultPageSize)))
	if page < 1 {
		page = defaultPage
	}
	if pageSize < 1 {
		pageSize = defaultPageSize
	}
	return page, pageSize
}
