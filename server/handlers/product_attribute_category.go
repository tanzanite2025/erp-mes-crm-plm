package handlers

import (
	"encoding/json"
	"net/http"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func GetProductAttributeCategoriesHandler(c *gin.Context) {
	items, err := services.ListProductAttributeCategories(services.ProductAttributeCategoryListQuery{
		ActiveOnly: c.Query("activeOnly") == "true",
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取产品属性分类失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}

func SaveProductAttributeCategoryHandler(c *gin.Context) {
	payload, body, err := decodeJSONBodyMap(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 无效的 JSON 映射"})
		return
	}

	if rawID, ok := payload["id"]; ok && string(rawID) != "null" && string(rawID) != `""` {
		var id string
		if err := json.Unmarshal(rawID, &id); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 无效的 ID 格式"})
			return
		}
		updates, err := services.BuildProductAttributeCategoryUpdates(payload)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		saved, err := services.PatchProductAttributeCategory(id, updates)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 差分保存产品属性分类失败: " + err.Error()})
			return
		}
		c.JSON(http.StatusOK, saved)
		return
	}

	var input models.ProductAttributeCategory
	if err := json.Unmarshal(body, &input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 产品属性分类格式错误"})
		return
	}

	saved, err := services.CreateProductAttributeCategory(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 创建产品属性分类失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, saved)
}

func DeleteProductAttributeCategoryHandler(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 缺少 ID"})
		return
	}
	if err := services.DeleteProductAttributeCategory(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 删除产品属性分类失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
}
