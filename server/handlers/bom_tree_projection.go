package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

// GetBOMTreeProjection 获取 BOM 树投影
// @Summary 获取 BOM 树投影
// @Description 返回 BOM 的完整树投影数据，包括节点层级、折叠状态、元数据等
// @Tags BOM
// @Accept json
// @Produce json
// @Param id path string true "BOM ID"
// @Param collapseEmpty query bool false "折叠空节点"
// @Param maxDepth query int false "最大深度（0 = 无限制）"
// @Param expandedNodeIds query []string false "已展开的节点 ID"
// @Success 200 {object} services.TreeProjectionResponse
// @Failure 400 {object} map[string]string "请求参数错误"
// @Failure 404 {object} map[string]string "BOM 不存在"
// @Failure 500 {object} map[string]string "服务器内部错误"
// @Router /api/bom/{id}/tree-projection [get]
func GetBOMTreeProjection(c *gin.Context) {
	bomID := c.Param("id")

	// 验证 BOM ID
	if strings.TrimSpace(bomID) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "BOM ID is required"})
		return
	}

	// 解析请求参数
	var request services.TreeProjectionRequest

	// collapseEmpty 参数
	if collapseEmptyStr := c.Query("collapseEmpty"); collapseEmptyStr != "" {
		request.CollapseEmpty = collapseEmptyStr == "true"
	}

	// maxDepth 参数
	if maxDepthStr := c.Query("maxDepth"); maxDepthStr != "" {
		maxDepth, err := strconv.Atoi(maxDepthStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid maxDepth parameter"})
			return
		}
		if maxDepth < 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "maxDepth must be >= 0"})
			return
		}
		request.MaxDepth = maxDepth
	}

	// expandedNodeIds 参数（支持多个值）
	if expandedNodeIDs := c.QueryArray("expandedNodeIds"); len(expandedNodeIDs) > 0 {
		request.ExpandedNodeIDs = expandedNodeIDs
	}

	// 获取 BOM（包含 Items）
	var bom models.BOM
	if err := db.DB.
		Preload("Items").
		First(&bom, "id = ?", bomID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "BOM not found"})
		return
	}

	// 构建树投影
	projection, err := services.BuildTreeProjection(bom, request)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, projection)
}
