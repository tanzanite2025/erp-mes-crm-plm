package handlers

import "github.com/gin-gonic/gin"

type inventoryErrorResponse struct {
	Error string `json:"error"`
	Code  string `json:"code"`
}

func respondInventoryError(c *gin.Context, status int, code, message string) {
	c.JSON(status, inventoryErrorResponse{
		Error: message,
		Code:  code,
	})
}
