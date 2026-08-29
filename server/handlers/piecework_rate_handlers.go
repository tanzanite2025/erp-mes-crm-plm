package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetPieceworkRatesHandler 获取工价清单
func GetPieceworkRatesHandler(c *gin.Context) {
	rates, err := services.ListPieceworkRates()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取工价标准失败"})
		return
	}
	c.JSON(http.StatusOK, rates)
}

func SavePieceworkRateHandler(c *gin.Context) {
	var input services.PieceworkRateWriteDTO
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 工价格式错误"})
		return
	}

	saved, err := services.SavePieceworkRateDTO(auditContextFromGin(c), input)
	if err != nil {
		respondPieceworkRateError(c, err)
		return
	}

	c.JSON(http.StatusOK, saved)
}

func PatchPieceworkRateHandler(c *gin.Context) {
	id := c.Param("id")
	var request services.SDRTSDeltaHandlerRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 无效的工价差分载荷: " + err.Error()})
		return
	}
	if request.Op != "" && request.Op != "update" && request.Op != "PATCH" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 工价差分 op 不受支持"})
		return
	}
	if request.Metadata.ID == "" || request.Metadata.ID != id {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 工价差分 ID 不匹配"})
		return
	}
	if err := services.ValidatePieceworkRateDelta(request.Delta); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 无效的工价差分: " + err.Error()})
		return
	}
	command, err := services.DecodePieceworkRatePatchDelta(request.Delta)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 无效的工价差分: " + err.Error()})
		return
	}

	updated, err := services.PatchPieceworkRate(
		auditContextFromGin(c),
		id,
		command,
		request.Metadata.Version,
	)
	if err != nil {
		respondPieceworkRateError(c, err)
		return
	}
	c.JSON(http.StatusOK, updated)
}

func DeletePieceworkRateHandler(c *gin.Context) {
	version, err := strconv.ParseInt(c.Query("version"), 10, 64)
	if err != nil || version <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 删除工价必须提供有效版本号"})
		return
	}
	if err := services.DeletePieceworkRate(auditContextFromGin(c), c.Param("id"), version); err != nil {
		respondPieceworkRateError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func respondPieceworkRateError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, services.ErrPieceworkRateVersionConflict):
		respondVersionConflict(c)
	case errors.Is(err, services.ErrInvalidPieceworkRate):
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] " + err.Error()})
	case errors.Is(err, gorm.ErrRecordNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "工价标准不存在"})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 工价标准操作失败: " + err.Error()})
	}
}
