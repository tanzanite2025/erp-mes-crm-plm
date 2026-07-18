package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func normalizeUserStatusFilters(statuses []string) []string {
	normalizedStatuses := make([]string, 0, len(statuses))
	for _, status := range statuses {
		normalized := strings.ToLower(strings.TrimSpace(status))
		if normalized != "" {
			normalizedStatuses = append(normalizedStatuses, normalized)
		}
	}
	return normalizedStatuses
}

func GetUsersHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))

	response, err := services.ListUsers(services.UserQuery{
		Page:     page,
		PageSize: pageSize,
		Username: c.Query("username"),
		Statuses: normalizeUserStatusFilters(c.QueryArray("status")),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch paginated users"})
		return
	}
	c.JSON(http.StatusOK, response)
}

func GetUserOptionsHandler(c *gin.Context) {
	options, err := services.ListUserOptions(services.UserQuery{
		Username: strings.TrimSpace(c.Query("username")),
		Statuses: normalizeUserStatusFilters(c.QueryArray("status")),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user options"})
		return
	}
	c.JSON(http.StatusOK, options)
}
