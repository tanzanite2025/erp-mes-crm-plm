package handlers

import (
	"errors"
	"net/http"
	"strings"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func ListBOMVersionHistoryHandler(c *gin.Context) {
	records, err := services.ListBOMVersionHistory(services.BOMVersionHistoryQuery{
		BOMID:     c.Query("bomId"),
		ProductID: c.Query("productId"),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to fetch BOM version history: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, records)
}

func GetBOMVersionHistoryEntryHandler(c *gin.Context) {
	entryID := strings.TrimSpace(c.Param("id"))
	entry, err := services.GetBOMVersionRecordByID(entryID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "[CRITICAL] BOM version record not found: " + entryID})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to fetch BOM version record: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, entry)
}
