package handlers

import (
	"net/http"
	"strings"
	"xdfc-server/middleware"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

// LookupWheelTraceHandler provides a read-only wheel trace lookup endpoint for the standalone scan page.
func LookupWheelTraceHandler(c *gin.Context) {
	var input services.WheelTraceLookupRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 追溯查询参数格式错误"})
		return
	}

	input.RawCode = strings.TrimSpace(input.RawCode)
	if input.RawCode == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] rawCode 不能为空"})
		return
	}

	if strings.TrimSpace(input.OperatorID) == "" {
		input.OperatorID = middleware.GetSafeUsername(c)
	}

	result, err := services.LookupWheelTrace(input)
	if err != nil {
		status := mapWheelTraceLookupErrorStatus(err)
		prefix := "[SERVER]"
		if status < http.StatusInternalServerError {
			prefix = "[VALIDATION]"
		}
		c.JSON(status, gin.H{"error": prefix + " 车圈追溯查询失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

func mapWheelTraceLookupErrorStatus(err error) int {
	if err == nil {
		return http.StatusOK
	}

	message := strings.ToLower(strings.TrimSpace(err.Error()))
	if strings.Contains(message, "linear barcode") {
		return http.StatusBadRequest
	}

	return http.StatusInternalServerError
}
