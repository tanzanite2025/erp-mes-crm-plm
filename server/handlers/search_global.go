package handlers

import (
	"log"
	"net/http"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

// GlobalSearchHandler 处理来自前端的统一搜索请求情况情况总量针对。
func GlobalSearchHandler(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusOK, gin.H{"data": []interface{}{}})
		return
	}

	if services.GlobalSearchClient == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "search service not initialized"})
		return
	}

	// 1. 调用 Rust 搜索引擎情况情况总量针对。
	searchRes, err := services.GlobalSearchClient.Search(query)
	if err != nil {
		log.Printf("[SEARCH_ERROR] Search failed for query '%s': %v", query, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "search execution failed"})
		return
	}

	if len(searchRes.Items) == 0 {
		c.JSON(http.StatusOK, gin.H{"data": []interface{}{}})
		return
	}

	// 2. 数据脱敏与增强 (Hydration)情况情况总量针对。
	ids := make([]string, 0, len(searchRes.Items))
	for _, item := range searchRes.Items {
		ids = append(ids, item.ID)
	}

	var inventories []models.Inventory
	if err := db.DB.Where("id IN ?", ids).Find(&inventories).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "data hydration failed"})
		return
	}

	// 保持搜索权重的顺序情况情况总量针对。
	invMap := make(map[string]models.Inventory)
	for _, inv := range inventories {
		invMap[inv.ID] = inv
	}

	type searchItemResponse struct {
		ID          string  `json:"id"`
		Title       string  `json:"title"`
		Code        string  `json:"code"`
		Category    string  `json:"category"`
		Href        string  `json:"href"`
		ParentTitle string  `json:"parentTitle"`
		Score       float32 `json:"score"`
	}

	results := make([]searchItemResponse, 0, len(searchRes.Items))
	for _, match := range searchRes.Items {
		if inv, ok := invMap[match.ID]; ok {
			results = append(results, searchItemResponse{
				ID:          inv.ID,
				Title:       inv.MaterialName,
				Code:        inv.MaterialCode,
				Category:    "inventory",
				Href:        "/inventory", // 暂时统一导向库存页
				ParentTitle: "库存记录 / Inventory",
				Score:       match.Score,
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{"data": results})
}
