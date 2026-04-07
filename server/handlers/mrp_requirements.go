package handlers

import (
	"net/http"
	"strings"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func GetMrpRequirementsHandler(c *gin.Context) {
	selectedKeysRaw := strings.TrimSpace(c.Query("selectedKeys"))
	selectedKeys := make([]string, 0)
	if selectedKeysRaw != "" {
		for _, item := range strings.Split(selectedKeysRaw, ",") {
			trimmed := strings.TrimSpace(item)
			if trimmed != "" {
				selectedKeys = append(selectedKeys, trimmed)
			}
		}
	}

	result, err := services.GetMrpRequirements(services.GetMrpRequirementsParams{
		SelectedKeys: selectedKeys,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取 MRP 需求分析失败"})
		return
	}

	c.JSON(http.StatusOK, result)
}
