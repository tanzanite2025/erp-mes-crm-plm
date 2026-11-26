package handlers

import (
	"errors"
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

	if strings.TrimSpace(c.Query("bomSelections")) != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "manual BOM revision selection is not supported"})
		return
	}
	result, err := services.GetMrpRequirements(services.GetMrpRequirementsParams{
		SelectedKeys: selectedKeys,
	})
	if err != nil {
		if errors.Is(err, services.ErrInvalidProductionMaterialRequirementSelection) {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if errors.Is(err, services.ErrBOMActiveConflict) {
			c.JSON(http.StatusConflict, gin.H{"error": "[CRITICAL_BOM_SELECTION] " + err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to analyze MRP requirements: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}
