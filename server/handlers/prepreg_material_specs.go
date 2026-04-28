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

func GetPrepregMaterialSpecByIDHandler(c *gin.Context) {
	spec, err := services.GetPrepregMaterialSpecByID(c.Param("id"))
	if err != nil {
		if errors.Is(err, services.ErrPrepregMaterialSpecNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "[RAW_MATERIALS] 预浸料规格不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[RAW_MATERIALS] 预浸料规格详情读取失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, spec)
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
		if errors.Is(err, services.ErrPrepregMaterialSpecNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "[RAW_MATERIALS] 预浸料规格不存在"})
			return
		}
		if errors.Is(err, services.ErrPrepregMaterialSpecVersionConflict) {
			respondVersionConflict(c)
			return
		}
		if errors.Is(err, services.ErrPrepregBindingTokenExpired) {
			c.JSON(http.StatusGone, gin.H{"error": "[VALIDATION] 绑定二维码已过期，请重新生成"})
			return
		}
		if errors.Is(err, services.ErrPrepregBindingTokenConflict) {
			c.JSON(http.StatusConflict, gin.H{"error": "[VALIDATION] 该绑定二维码已绑定到其它预浸料规格"})
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
