package handlers

import (
	"errors"
	"log"
	"net/http"
	"strings"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func respondQualityStandardWriteError(c *gin.Context, err error) {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "[NOT_FOUND] 品质标准不存在"})
		return
	}
	if errors.Is(err, ErrVersionConflict) || errors.Is(err, services.ErrQualityStandardVersionConflict) {
		respondVersionConflict(c)
		return
	}
	if strings.HasPrefix(err.Error(), "[VALIDATION]") {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if strings.HasPrefix(err.Error(), "[CONFLICT]") {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}
	log.Printf("[ERROR] Quality standard write failed: %v", err)
	c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 保存品质标准失败，事务已回滚"})
}
