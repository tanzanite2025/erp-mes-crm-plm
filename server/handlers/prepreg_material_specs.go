package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

type PrepregMaterialSpecListPageApiDTO struct {
	Items    []models.PrepregMaterialSpec `json:"items"`
	Total    int64                        `json:"total"`
	Page     int                          `json:"page"`
	PageSize int                          `json:"pageSize"`
}

func GetPrepregMaterialSpecsHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))
	items, total, err := services.ListPrepregMaterialSpecs(services.PrepregMaterialSpecListQuery{
		Search:   c.Query("search"),
		Page:     page,
		PageSize: pageSize,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[RAW_MATERIALS] 预浸料规格加载失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, PrepregMaterialSpecListPageApiDTO{
		Items:    items,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	})
}

func SavePrepregMaterialSpecHandler(c *gin.Context) {
	var input services.SavePrepregMaterialSpecRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 预浸料规格数据格式错误: " + err.Error()})
		return
	}
	if input.Code == "" || input.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 产品编号和产品名称必填"})
		return
	}

	saved, err := services.SavePrepregMaterialSpec(input)
	if err != nil {
		if errors.Is(err, services.ErrPrepregMaterialSpecVersionConflict) {
			respondVersionConflict(c)
			return
		}
		var validationErr *services.PrepregMaterialSpecValidationError
		if errors.As(err, &validationErr) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] " + validationErr.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[RAW_MATERIALS] 预浸料规格保存失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, saved)
}

func DeletePrepregMaterialSpecHandler(c *gin.Context) {
	if err := services.DeletePrepregMaterialSpec(c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[RAW_MATERIALS] 预浸料规格删除失败: " + err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}
