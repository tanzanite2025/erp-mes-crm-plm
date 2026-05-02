package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func PatchMaterialHandler(c *gin.Context) {
	id := c.Param("id")
	var req services.SDRTSDeltaHandlerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid material patch payload: " + err.Error()})
		return
	}
	if err := validateSupportedTopLevelDeltaKeys(req.Delta, "code", "name", "category", "spec", "internalDimensions", "externalDimensions", "uom", "minStock", "costPrice", "supplierId", "description", "images", "status", "revisionNo", "effectiveFrom", "effectiveTo", "changeType", "changeOrderNo", "siteCode", "isDefaultSite"); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid material delta: " + err.Error()})
		return
	}

	patch := services.PatchMaterialRequest{
		ID:              id,
		ExpectedVersion: int(req.Metadata.Version),
		DeltaKeys:       servicesDeltaKeys(req.Delta),
	}
	for key, raw := range req.Delta {
		valueRaw, err := extractDeltaNewValue(raw)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid material delta payload: " + err.Error()})
			return
		}

		switch key {
		case "code":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid material code payload"})
				return
			}
			patch.Code = &value
		case "name":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid material name payload"})
				return
			}
			patch.Name = &value
		case "category":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid material category payload"})
				return
			}
			patch.Category = &value
		case "spec":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid material spec payload"})
				return
			}
			patch.Spec = &value
		case "internalDimensions":
			patch.InternalDimensions = append(json.RawMessage(nil), valueRaw...)
			patch.InternalDimensionsSet = true
		case "externalDimensions":
			patch.ExternalDimensions = append(json.RawMessage(nil), valueRaw...)
			patch.ExternalDimensionsSet = true
		case "uom":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid material uom payload"})
				return
			}
			patch.UOM = &value
		case "minStock":
			var value float64
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid material minStock payload"})
				return
			}
			patch.MinStock = &value
		case "costPrice":
			var value float64
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid material costPrice payload"})
				return
			}
			patch.CostPrice = &value
		case "supplierId":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid material supplierId payload"})
				return
			}
			patch.SupplierID = &value
		case "description":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid material description payload"})
				return
			}
			patch.Description = &value
		case "images":
			patch.Images = append(json.RawMessage(nil), valueRaw...)
			patch.ImagesSet = true
		case "status":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid material status payload"})
				return
			}
			patch.Status = &value
		case "revisionNo":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid material revisionNo payload"})
				return
			}
			patch.RevisionNo = &value
		case "effectiveFrom":
			value, err := parseOptionalTimeValue(valueRaw)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid material effectiveFrom payload"})
				return
			}
			patch.EffectiveFrom = value
			patch.EffectiveFromSet = true
		case "effectiveTo":
			value, err := parseOptionalTimeValue(valueRaw)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid material effectiveTo payload"})
				return
			}
			patch.EffectiveTo = value
			patch.EffectiveToSet = true
		case "changeType":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid material changeType payload"})
				return
			}
			patch.ChangeType = &value
		case "changeOrderNo":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid material changeOrderNo payload"})
				return
			}
			patch.ChangeOrderNo = &value
		case "siteCode":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid material siteCode payload"})
				return
			}
			patch.SiteCode = &value
		case "isDefaultSite":
			var value bool
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid material isDefaultSite payload"})
				return
			}
			patch.IsDefaultSite = &value
		}
	}

	updated, err := services.PatchMaterial(auditContextFromGin(c), patch)
	if err != nil {
		if errors.Is(err, services.ErrMaterialPatchVersionConflict) {
			respondVersionConflict(c)
			return
		}
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "material not found"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": "[SERVER] failed to patch material: " + err.Error()})
		return
	}

	incrMaterialCacheVersion()
	c.JSON(http.StatusOK, toMaterialApiDTO(updated))
}
