package handlers

import (
	"encoding/json"
	"net/http"
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

	if _, isPatch := payload["op"]; isPatch {
		var request services.SDRTSDeltaHandlerRequest
		if err := json.Unmarshal(body, &request); err != nil || request.Op != "PATCH" || request.Metadata.ID == "" || request.Metadata.Version < 1 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 编辑产品属性需要差量、记录 ID 和有效版本"})
			return
		}
		updates, err := services.BuildProductAttributeCategoryUpdates(request.Delta)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		saved, err := services.PatchProductAttributeCategory(request.Metadata.ID, int(request.Metadata.Version), updates)
		if err != nil {
			respondDomainError(c, err, "[SERVER] 差分保存产品属性分类失败: ")
			return
		}
		c.JSON(http.StatusOK, saved)
		return
	}

	input := services.SaveProductAttributeCategoryInput{Active: true, IsDefaultSite: true}
	if err := json.Unmarshal(body, &input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 产品属性分类格式错误"})
		return
	}
	if input.ID != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 编辑产品属性必须使用带版本的差量格式"})
		return
	}

	saved, err := services.CreateProductAttributeCategory(input)
	if err != nil {
		respondDomainError(c, err, "[SERVER] 保存产品属性分类失败: ")
		return
	}
	c.JSON(http.StatusOK, saved)
}

func ReorderProductAttributeCategoriesHandler(c *gin.Context) {
	var input services.ProductAttributeReorderInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 产品属性分类排序参数格式错误"})
		return
	}
	if err := services.ReorderProductAttributeCategories(input); err != nil {
		respondDomainError(c, err, "[SERVER] 保存产品属性分类排序失败: ")
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "排序已保存"})
}

func DeleteProductAttributeCategoryHandler(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 缺少 ID"})
		return
	}
	if err := services.DeleteProductAttributeCategory(id); err != nil {
		respondDomainError(c, err, "[SERVER] 删除产品属性分类失败: ")
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
}
