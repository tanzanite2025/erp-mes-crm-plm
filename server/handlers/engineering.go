package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func validateSupportedEngineeringSpecDelta(delta map[string]json.RawMessage) error {
	if len(delta) == 0 {
		return errors.New("delta is required")
	}

	allowedTopLevel := map[string]struct{}{
		"name":          {},
		"code":          {},
		"type":          {},
		"description":   {},
		"active":        {},
		"revisionNo":    {},
		"effectiveFrom": {},
		"effectiveTo":   {},
		"changeType":    {},
		"changeOrderNo": {},
		"siteCode":      {},
		"isDefaultSite": {},
	}
	allowedPrefixes := []string{"specData.", "drillingData.", "cuttingData.", "labelingData."}

	for key := range delta {
		trimmed := strings.TrimSpace(key)
		if trimmed == "" {
			return errors.New("delta key must not be empty")
		}
		if strings.Contains(trimmed, "[") || strings.Contains(trimmed, "]") {
			return errors.New("unsupported patch field: " + trimmed)
		}
		if _, ok := allowedTopLevel[trimmed]; ok {
			continue
		}

		matched := false
		for _, prefix := range allowedPrefixes {
			if strings.HasPrefix(trimmed, prefix) && len(trimmed) > len(prefix) {
				matched = true
				break
			}
		}
		if !matched {
			return errors.New("unsupported patch field: " + trimmed)
		}
	}

	return nil
}

func GetEngineeringSpecsHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	isOptions := c.Query("options") == "true"
	items, total, err := services.ListEngineeringSpecs(services.EngineeringSpecListQuery{
		Page:     page,
		PageSize: pageSize,
		Options:  isOptions,
		SpecType: c.Query("type"),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to fetch engineering specs: " + err.Error()})
		return
	}

	if isOptions {
		c.JSON(http.StatusOK, mapEngineeringSpecsToResponseDTOs(items))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"items":    mapEngineeringSpecsToResponseDTOs(items),
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

func GetEngineeringSpecHandler(c *gin.Context) {
	id := c.Param("id")
	spec, err := services.GetEngineeringSpecByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "[CRITICAL] engineering spec not found: " + id})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to fetch engineering spec: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, mapEngineeringSpecToResponseDTO(spec))
}

func SaveEngineeringSpecHandler(c *gin.Context) {
	var input services.SaveEngineeringSpecInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid engineering spec payload: " + err.Error()})
		return
	}

	saved, err := services.SaveEngineeringSpec(auditContextFromGin(c), input)
	if err != nil {
		switch {
		case errors.As(err, new(*services.CuttingPlanValidationError)):
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] " + err.Error()})
		case errors.As(err, new(*services.PrepregMaterialSpecValidationError)):
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] " + err.Error()})
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "[CRITICAL] engineering spec not found"})
		case errors.Is(err, services.ErrEngineeringSpecVersionConflict):
			respondVersionConflict(c)
		case errors.Is(err, services.ErrEngineeringSpecDuplicateKey):
			c.JSON(http.StatusConflict, gin.H{"error": "[BUSINESS_RULE_VIOLATION] engineering spec duplicate normalized ratio key"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to save engineering spec: " + err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, mapEngineeringSpecToResponseDTO(saved))
}

func PatchEngineeringSpecHandler(c *gin.Context) {
	id := c.Param("id")

	var req services.SDRTSDeltaHandlerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid engineering spec patch payload: " + err.Error()})
		return
	}
	if err := validateSupportedEngineeringSpecDelta(req.Delta); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid engineering spec delta: " + err.Error()})
		return
	}

	patch := services.PatchEngineeringSpecRequest{
		ID:              id,
		ExpectedVersion: int(req.Metadata.Version),
		DeltaKeys:       servicesDeltaKeys(req.Delta),
		Values:          make(map[string]json.RawMessage, len(req.Delta)),
	}

	for key, raw := range req.Delta {
		valueRaw, err := extractDeltaNewValue(raw)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid engineering spec delta payload: " + err.Error()})
			return
		}
		patch.Values[key] = append(json.RawMessage(nil), valueRaw...)
	}

	updated, err := services.PatchEngineeringSpec(auditContextFromGin(c), patch)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrEngineeringSpecPatchVersionConflict):
			respondVersionConflict(c)
		case errors.Is(err, services.ErrEngineeringSpecDuplicateKey):
			c.JSON(http.StatusConflict, gin.H{"error": "[BUSINESS_RULE_VIOLATION] engineering spec duplicate normalized ratio key"})
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "[CRITICAL] engineering spec not found: " + id})
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": "[SERVER] failed to patch engineering spec: " + err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, mapEngineeringSpecToResponseDTO(updated))
}

func BulkSyncEngineeringSpecsHandler(c *gin.Context) {
	if !enforceBulkSyncPermissions(c) {
		return
	}

	var input []services.BulkSyncEngineeringSpecInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid bulk engineering payload: " + err.Error()})
		return
	}

	if err := services.BulkSyncEngineeringSpecs(input); err != nil {
		if strings.Contains(err.Error(), "name/code is required") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] name/code is required"})
			return
		}
		if errors.Is(err, services.ErrEngineeringSpecDuplicateKey) {
			c.JSON(http.StatusConflict, gin.H{"error": "[BUSINESS_RULE_VIOLATION] engineering spec duplicate normalized ratio key"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] bulk engineering sync failed: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "count": len(input)})
}

func DeleteEngineeringSpecHandler(c *gin.Context) {
	id := c.Param("id")
	err := services.DeleteEngineeringSpec(auditContextFromGin(c), id)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrEngineeringSpecLinkedProducts), errors.Is(err, services.ErrEngineeringSpecLinkedBOM):
			c.JSON(http.StatusForbidden, gin.H{"error": "[BUSINESS_RULE_VIOLATION] engineering spec is still referenced"})
		case errors.Is(err, services.ErrEngineeringSpecLinkedDrilling):
			c.JSON(http.StatusForbidden, gin.H{"error": "[BUSINESS_RULE_VIOLATION] engineering spec linked by drilling plan"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to delete engineering spec: " + err.Error()})
		}
		return
	}

	c.Status(http.StatusNoContent)
}
