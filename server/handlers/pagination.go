package handlers

import (
	"strconv"

	"github.com/gin-gonic/gin"
)

func parsePageAndSize(c *gin.Context, defaultPage, defaultPageSize int) (int, int) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", strconv.Itoa(defaultPage)))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", strconv.Itoa(defaultPageSize)))
	if page < 1 {
		page = defaultPage
	}
	if pageSize < 1 {
		pageSize = defaultPageSize
	}
	return page, pageSize
}
