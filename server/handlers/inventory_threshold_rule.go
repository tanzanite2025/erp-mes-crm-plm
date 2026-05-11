package handlers

import (
	"errors"
	"net/http"
	"strings"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

type InventoryThresholdRuleWriteRequest struct {
	TargetType   string  `json:"targetType"`
	MaterialID   *string `json:"materialId"`
	BOMID        *string `json:"bomId"`
	ThresholdQty float64 `json:"thresholdQty"`
	Enabled      bool    `json:"enabled"`
	Notes        string  `json:"notes"`
}

type InventoryThresholdRuleListResponse struct {
	Items []models.InventoryThresholdRule `json:"items"`
}

type InventoryThresholdTargetOptionsResponse struct {
	Materials []services.InventoryThresholdMaterialOption `json:"materials"`
	BOMs      []services.InventoryThresholdBOMOption      `json:"boms"`
}

func GetInventoryThresholdRulesHandler(c *gin.Context) {
	items, err := services.ListInventoryThresholdRules()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to load inventory threshold rules: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, InventoryThresholdRuleListResponse{Items: items})
}

func GetInventoryThresholdTargetOptionsHandler(c *gin.Context) {
	materials, boms, err := services.ListInventoryThresholdTargetOptions()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to load inventory threshold target options: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, InventoryThresholdTargetOptionsResponse{
		Materials: materials,
		BOMs:      boms,
	})
}

func SaveInventoryThresholdRuleHandler(c *gin.Context) {
	var input InventoryThresholdRuleWriteRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid inventory threshold rule payload"})
		return
	}

	rule, err := services.CreateInventoryThresholdRule(mapInventoryThresholdRuleWriteInput(input))
	if err != nil {
		respondInventoryThresholdRuleError(c, err, "create")
		return
	}

	c.JSON(http.StatusOK, rule)
}

func PatchInventoryThresholdRuleHandler(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "inventory threshold rule id is required"})
		return
	}

	var input InventoryThresholdRuleWriteRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid inventory threshold rule payload"})
		return
	}

	rule, err := services.UpdateInventoryThresholdRule(id, mapInventoryThresholdRuleWriteInput(input))
	if err != nil {
		respondInventoryThresholdRuleError(c, err, "update")
		return
	}

	c.JSON(http.StatusOK, rule)
}

func DeleteInventoryThresholdRuleHandler(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "inventory threshold rule id is required"})
		return
	}

	if err := services.DeleteInventoryThresholdRule(id); err != nil {
		respondInventoryThresholdRuleError(c, err, "delete")
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "inventory threshold rule deleted"})
}

func mapInventoryThresholdRuleWriteInput(input InventoryThresholdRuleWriteRequest) services.InventoryThresholdRuleWriteInput {
	return services.InventoryThresholdRuleWriteInput{
		TargetType:   strings.TrimSpace(input.TargetType),
		MaterialID:   input.MaterialID,
		BOMID:        input.BOMID,
		ThresholdQty: input.ThresholdQty,
		Enabled:      input.Enabled,
		Notes:        input.Notes,
	}
}

func respondInventoryThresholdRuleError(c *gin.Context, err error, action string) {
	switch {
	case errors.Is(err, services.ErrInventoryThresholdRuleNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "inventory threshold rule not found"})
	case errors.Is(err, services.ErrInventoryThresholdRuleDuplicateTarget):
		c.JSON(http.StatusBadRequest, gin.H{"error": "inventory threshold rule target already exists"})
	case errors.Is(err, services.ErrInventoryThresholdRuleInvalidTarget):
		c.JSON(http.StatusBadRequest, gin.H{"error": "inventory threshold rule target is invalid"})
	case errors.Is(err, services.ErrInventoryThresholdRuleInvalidTargetType):
		c.JSON(http.StatusBadRequest, gin.H{"error": "inventory threshold rule target type is invalid"})
	case errors.Is(err, services.ErrInventoryThresholdRuleInvalidThreshold):
		c.JSON(http.StatusBadRequest, gin.H{"error": "inventory threshold rule threshold qty must be non-negative"})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to " + action + " inventory threshold rule: " + err.Error()})
	}
}
