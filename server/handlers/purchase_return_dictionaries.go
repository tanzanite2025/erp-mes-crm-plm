package handlers

import (
	"net/http"
	"strings"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func GetPurchaseReturnDictionariesHandler(c *gin.Context) {
	dictType := strings.TrimSpace(c.Query("type"))
	items, err := services.ListPurchaseReturnDictionaries(dictType)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}

