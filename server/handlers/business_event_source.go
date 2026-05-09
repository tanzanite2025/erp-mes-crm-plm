package handlers

import (
	"errors"
	"net/http"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func GetBusinessEventPhaseCatalogHandler(c *gin.Context) {
	c.JSON(http.StatusOK, services.ListBusinessEventPhaseCatalog())
}

func GetBusinessEventSourcesHandler(c *gin.Context) {
	sources, err := services.ListBusinessEventSources()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取业务事件源失败: " + err.Error()})
		return
	}

	response, err := services.MapBusinessEventSourcesToResponse(sources)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 业务事件源序列化失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, response)
}

func SaveBusinessEventSourceHandler(c *gin.Context) {
	var input services.BusinessEventSourceRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 业务事件源数据格式错误: " + err.Error()})
		return
	}

	source, err := services.MapBusinessEventSourceRequestToModel(input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 业务事件源配置格式错误: " + err.Error()})
		return
	}

	saved, err := services.CreateBusinessEventSource(source)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 保存业务事件源失败: " + err.Error()})
		return
	}

	response, err := services.MapBusinessEventSourceToResponse(saved)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 业务事件源序列化失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, response)
}

func UpdateBusinessEventSourceHandler(c *gin.Context) {
	id := c.Param("id")
	var input services.BusinessEventSourceRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 业务事件源数据格式错误: " + err.Error()})
		return
	}

	source, err := services.MapBusinessEventSourceRequestToModel(input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 业务事件源配置格式错误: " + err.Error()})
		return
	}

	updated, err := services.UpdateBusinessEventSource(id, source)
	if err != nil {
		if errors.Is(err, services.ErrBusinessEventSourceNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "[CRITICAL] 业务事件源 ID " + id + " 不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 更新业务事件源失败: " + err.Error()})
		return
	}

	response, err := services.MapBusinessEventSourceToResponse(updated)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 业务事件源序列化失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, response)
}

func CommitBusinessEventStatusRenameTransactionHandler(c *gin.Context) {
	id := c.Param("id")
	var input services.BusinessEventStatusRenameTransactionRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 状态重命名事务数据格式错误: " + err.Error()})
		return
	}

	result, err := services.CommitBusinessEventStatusRenameTransaction(id, input)
	if err != nil {
		if errors.Is(err, services.ErrBusinessEventSourceNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "[CRITICAL] 业务事件源 ID " + id + " 不存在"})
			return
		}
		if errors.Is(err, services.ErrBusinessEventStatusTransactionConflict) {
			c.JSON(http.StatusConflict, gin.H{"error": "[CONFLICT] 状态重命名事务冲突: " + err.Error()})
			return
		}
		if errors.Is(err, services.ErrBusinessEventStatusTransactionBlocked) ||
			errors.Is(err, services.ErrBusinessEventStatusTransactionUnsupported) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 状态重命名事务被阻断: " + err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 状态重命名事务失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

func DeleteBusinessEventSourceHandler(c *gin.Context) {
	id := c.Param("id")
	if err := services.DeleteBusinessEventSource(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 删除业务事件源失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}
