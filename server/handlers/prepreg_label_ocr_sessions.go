package handlers

import (
	"errors"
	"net/http"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func CreatePrepregLabelOcrSessionHandler(c *gin.Context) {
	session, err := services.CreatePrepregLabelOcrSession()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[RAW_MATERIALS] 标签采集会话创建失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, session)
}

func GetPrepregLabelOcrSessionHandler(c *gin.Context) {
	session, err := services.GetPrepregLabelOcrSession(c.Param("sessionId"))
	if err != nil {
		if errors.Is(err, services.ErrPrepregLabelOcrSessionNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "[RAW_MATERIALS] 标签采集会话不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[RAW_MATERIALS] 标签采集会话读取失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, session)
}

func SubmitPrepregLabelOcrSessionHandler(c *gin.Context) {
	var input services.SubmitPrepregLabelOcrSessionRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 标签采集提交格式错误: " + err.Error()})
		return
	}
	if input.Token == "" {
		input.Token = c.Query("token")
	}

	session, err := services.SubmitPrepregLabelOcrSession(c.Param("sessionId"), input)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrPrepregLabelOcrSessionNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "[RAW_MATERIALS] 标签采集会话不存在"})
		case errors.Is(err, services.ErrPrepregLabelOcrSessionExpired):
			c.JSON(http.StatusGone, gin.H{"error": "[RAW_MATERIALS] 标签采集会话已过期"})
		case errors.Is(err, services.ErrPrepregLabelOcrSessionToken):
			c.JSON(http.StatusForbidden, gin.H{"error": "[RAW_MATERIALS] 标签采集口令无效"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[RAW_MATERIALS] 标签采集提交失败: " + err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, session)
}
