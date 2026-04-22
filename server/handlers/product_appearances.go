package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ProductAppearanceApiDTO struct {
	ID                string `json:"id"`
	Name              string `json:"name"`
	BarcodeCode       string `json:"barcodeCode"`
	Description       string `json:"description"`
	ImageURL          string `json:"imageUrl"`
	ImageThumbnailURL string `json:"imageThumbnailUrl"`
	ImageName         string `json:"imageName"`
	Active            bool   `json:"active"`
	SortOrder         int    `json:"sortOrder"`
	RevisionNo        string `json:"revisionNo,omitempty"`
	EffectiveFrom     any    `json:"effectiveFrom,omitempty"`
	EffectiveTo       any    `json:"effectiveTo,omitempty"`
	ChangeType        string `json:"changeType,omitempty"`
	ChangeOrderNo     string `json:"changeOrderNo,omitempty"`
	SiteCode          string `json:"siteCode,omitempty"`
	IsDefaultSite     bool   `json:"isDefaultSite"`
	CreatedAt         any    `json:"createdAt"`
	UpdatedAt         any    `json:"updatedAt"`
	Version           int    `json:"version"`
}

func toProductAppearanceApiDTO(item models.ProductAppearance) ProductAppearanceApiDTO {
	return ProductAppearanceApiDTO{
		ID:                item.ID,
		Name:              item.Name,
		BarcodeCode:       item.BarcodeCode,
		Description:       item.Description,
		ImageURL:          item.ImageURL,
		ImageThumbnailURL: item.ImageThumbnailURL,
		ImageName:         item.ImageName,
		Active:            item.Active,
		SortOrder:         item.SortOrder,
		RevisionNo:        item.RevisionNo,
		EffectiveFrom:     item.EffectiveFrom,
		EffectiveTo:       item.EffectiveTo,
		ChangeType:        item.ChangeType,
		ChangeOrderNo:     item.ChangeOrderNo,
		SiteCode:          item.SiteCode,
		IsDefaultSite:     item.IsDefaultSite,
		CreatedAt:         item.CreatedAt,
		UpdatedAt:         item.UpdatedAt,
		Version:           item.Version,
	}
}

func toProductAppearanceApiDTOs(items []models.ProductAppearance) []ProductAppearanceApiDTO {
	result := make([]ProductAppearanceApiDTO, 0, len(items))
	for _, item := range items {
		result = append(result, toProductAppearanceApiDTO(item))
	}
	return result
}

func GetProductAppearancesHandler(c *gin.Context) {
	items, err := services.ListProductAppearances()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取产品外观失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, toProductAppearanceApiDTOs(items))
}

func SaveProductAppearanceHandler(c *gin.Context) {
	var input services.SaveProductAppearanceAPIRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 产品外观数据格式错误: " + err.Error()})
		return
	}

	saved, err := services.SaveProductAppearance(input)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrProductAppearanceVersionConflict):
			respondVersionConflict(c)
		case errors.Is(err, services.ErrProductAppearanceDuplicateBarcodeCode):
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 条码位值已被其他产品外观占用"})
		default:
			respondDomainError(c, err, "[SERVER] 保存产品外观失败: ")
		}
		return
	}

	c.JSON(http.StatusOK, toProductAppearanceApiDTO(saved))
}

func PatchProductAppearanceHandler(c *gin.Context) {
	id := c.Param("id")
	var req services.SDRTSDeltaHandlerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid product appearance patch payload: " + err.Error()})
		return
	}
	if err := validateSupportedTopLevelDeltaKeys(req.Delta,
		"name",
		"barcodeCode",
		"description",
		"imageUrl",
		"imageThumbnailUrl",
		"imageName",
		"active",
		"sortOrder",
		"revisionNo",
		"effectiveFrom",
		"effectiveTo",
		"changeType",
		"changeOrderNo",
		"siteCode",
		"isDefaultSite",
	); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid product appearance delta: " + err.Error()})
		return
	}

	patch := services.PatchProductAppearanceRequest{
		ID:              id,
		ExpectedVersion: int(req.Metadata.Version),
		DeltaKeys:       servicesDeltaKeys(req.Delta),
	}
	for key, raw := range req.Delta {
		valueRaw, err := extractDeltaNewValue(raw)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid product appearance delta payload: " + err.Error()})
			return
		}
		switch key {
		case "name":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid appearance name payload"})
				return
			}
			patch.Name = &value
		case "barcodeCode":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid appearance barcodeCode payload"})
				return
			}
			patch.BarcodeCode = &value
		case "description":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid appearance description payload"})
				return
			}
			patch.Description = &value
		case "imageUrl":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid appearance imageUrl payload"})
				return
			}
			patch.ImageURL = &value
		case "imageThumbnailUrl":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid appearance imageThumbnailUrl payload"})
				return
			}
			patch.ImageThumbnailURL = &value
		case "imageName":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid appearance imageName payload"})
				return
			}
			patch.ImageName = &value
		case "active":
			var value bool
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid appearance active payload"})
				return
			}
			patch.Active = &value
		case "sortOrder":
			var value int
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid appearance sortOrder payload"})
				return
			}
			patch.SortOrder = &value
		case "revisionNo":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid appearance revisionNo payload"})
				return
			}
			patch.RevisionNo = &value
		case "effectiveFrom":
			value, err := parseOptionalTimeValue(valueRaw)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid appearance effectiveFrom payload"})
				return
			}
			patch.EffectiveFrom = value
			patch.EffectiveFromSet = true
		case "effectiveTo":
			value, err := parseOptionalTimeValue(valueRaw)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid appearance effectiveTo payload"})
				return
			}
			patch.EffectiveTo = value
			patch.EffectiveToSet = true
		case "changeType":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid appearance changeType payload"})
				return
			}
			patch.ChangeType = &value
		case "changeOrderNo":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid appearance changeOrderNo payload"})
				return
			}
			patch.ChangeOrderNo = &value
		case "siteCode":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid appearance siteCode payload"})
				return
			}
			patch.SiteCode = &value
		case "isDefaultSite":
			var value bool
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid appearance isDefaultSite payload"})
				return
			}
			patch.IsDefaultSite = &value
		}
	}

	saved, err := services.PatchProductAppearance(patch)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrProductAppearancePatchVersionConflict):
			respondVersionConflict(c)
		case errors.Is(err, services.ErrProductAppearanceDuplicateBarcodeCode):
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 条码位值已被其他产品外观占用"})
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "[NOT_FOUND] 产品外观不存在"})
		default:
			respondDomainError(c, err, "[SERVER] failed to patch product appearance: ")
		}
		return
	}

	c.JSON(http.StatusOK, toProductAppearanceApiDTO(saved))
}

func DeleteProductAppearanceHandler(c *gin.Context) {
	id := c.Param("id")
	if err := services.DeleteProductAppearance(id); err != nil {
		respondDomainError(c, err, "[SERVER] 删除产品外观失败: ")
		return
	}
	c.Status(http.StatusNoContent)
}
