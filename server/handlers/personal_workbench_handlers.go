package handlers

import (
	"net/http"
	"strings"
	"xdfc-server/middleware"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type personalRecordAssetRequest struct {
	StoragePath string `json:"storagePath"`
	MimeType    string `json:"mimeType"`
	Width       int    `json:"width"`
	Height      int    `json:"height"`
	SizeBytes   int64  `json:"sizeBytes"`
}

type personalRecordRequest struct {
	Title         string                       `json:"title"`
	Note          string                       `json:"note"`
	ColumnKey     string                       `json:"columnKey"`
	SortOrder     int                          `json:"sortOrder"`
	CoverImageURL string                       `json:"coverImageUrl"`
	Assets        []personalRecordAssetRequest `json:"assets"`
}

type personalRecordReorderRequestItem struct {
	ID        string `json:"id"`
	ColumnKey string `json:"columnKey"`
	SortOrder int    `json:"sortOrder"`
}

func GetPersonalWorkbenchRecordsHandler(c *gin.Context) {
	ownerUserID := middleware.GetSafeUserID(c)
	if strings.TrimSpace(ownerUserID) == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "[AUTH] 当前用户身份无效"})
		return
	}
	items, err := services.ListPersonalRecordsByOwner(ownerUserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取个人记录失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items, "total": len(items)})
}

func CreatePersonalWorkbenchRecordHandler(c *gin.Context) {
	ownerUserID := middleware.GetSafeUserID(c)
	if strings.TrimSpace(ownerUserID) == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "[AUTH] 当前用户身份无效"})
		return
	}
	var req personalRecordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 个人记录数据格式错误: " + err.Error()})
		return
	}
	if strings.TrimSpace(req.Title) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 标题不能为空"})
		return
	}
	item, err := services.CreatePersonalRecord(ownerUserID, mapPersonalRecordRequest(req))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 创建个人记录失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}

func PatchPersonalWorkbenchRecordHandler(c *gin.Context) {
	ownerUserID := middleware.GetSafeUserID(c)
	if strings.TrimSpace(ownerUserID) == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "[AUTH] 当前用户身份无效"})
		return
	}
	var req personalRecordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 个人记录更新数据格式错误: " + err.Error()})
		return
	}
	if strings.TrimSpace(req.Title) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 标题不能为空"})
		return
	}
	item, err := services.UpdatePersonalRecord(ownerUserID, c.Param("id"), mapPersonalRecordRequest(req))
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "[NOT_FOUND] 未找到该个人记录"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 更新个人记录失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}

func ReorderPersonalWorkbenchRecordsHandler(c *gin.Context) {
	ownerUserID := middleware.GetSafeUserID(c)
	if strings.TrimSpace(ownerUserID) == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "[AUTH] 当前用户身份无效"})
		return
	}
	var req []personalRecordReorderRequestItem
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 个人记录排序数据格式错误: " + err.Error()})
		return
	}
	inputs := make([]services.PersonalRecordReorderInput, 0, len(req))
	for _, item := range req {
		if strings.TrimSpace(item.ID) == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 个人记录排序项缺少 id"})
			return
		}
		inputs = append(inputs, services.PersonalRecordReorderInput{
			ID:        item.ID,
			ColumnKey: item.ColumnKey,
			SortOrder: item.SortOrder,
		})
	}
	if err := services.ReorderPersonalRecords(ownerUserID, inputs); err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "[NOT_FOUND] 个人记录排序目标不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 更新个人记录排序失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func mapPersonalRecordRequest(req personalRecordRequest) services.PersonalRecordUpsertInput {
	assets := make([]services.PersonalRecordAssetInput, 0, len(req.Assets))
	for _, asset := range req.Assets {
		assets = append(assets, services.PersonalRecordAssetInput{
			StoragePath: asset.StoragePath,
			MimeType:    asset.MimeType,
			Width:       asset.Width,
			Height:      asset.Height,
			SizeBytes:   asset.SizeBytes,
		})
	}
	return services.PersonalRecordUpsertInput{
		Title:         req.Title,
		Note:          req.Note,
		ColumnKey:     req.ColumnKey,
		SortOrder:     req.SortOrder,
		CoverImageURL: req.CoverImageURL,
		Assets:        assets,
	}
}
