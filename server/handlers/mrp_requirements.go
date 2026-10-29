package handlers

import (
	"encoding/json"
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

	var bomSelections []services.ProductionMaterialRequirementBOMSelection
	if raw := strings.TrimSpace(c.Query("bomSelections")); raw != "" {
		if err := json.Unmarshal([]byte(raw), &bomSelections); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid BOM selections"})
			return
		}
	}
	result, err := services.GetMrpRequirements(services.GetMrpRequirementsParams{
		SelectedKeys:  selectedKeys,
		BOMSelections: bomSelections,
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
