package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"xdfc-server/middleware"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func GetVehicleModelTemplatesHandler(c *gin.Context) {
	templates, err := services.ListVehicleModelTemplates(c.Query("seedVehicleSpecId"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "[SERVER] 获取车型模型模板失败: " + err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, templates)
}

func SaveVehicleModelTemplateHandler(c *gin.Context) {
	var request services.SaveVehicleModelTemplateRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "[VALIDATION] 车型模型模板数据格式错误: " + err.Error(),
		})
		return
	}
	request.ActorID = middleware.GetSafeUserID(c)
	request.Operator = middleware.GetSafeUsername(c)
	request.IP = c.ClientIP()

	response, err := services.SaveVehicleModelTemplate(request)
	if err != nil {
		writeVehicleModelTemplateServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, response)
}

func UpdateVehicleModelTemplateHandler(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "[VALIDATION] 车型模型模板 ID 不能为空",
		})
		return
	}

	var request services.SaveVehicleModelTemplateRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "[VALIDATION] 车型模型模板数据格式错误: " + err.Error(),
		})
		return
	}
	request.ActorID = middleware.GetSafeUserID(c)
	request.Operator = middleware.GetSafeUsername(c)
	request.IP = c.ClientIP()

	response, err := services.UpdateVehicleModelTemplate(id, request)
	if err != nil {
		writeVehicleModelTemplateServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, response)
}

func GetVehicleModelTemplateVersionsHandler(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "[VALIDATION] 车型模型模板 ID 不能为空",
		})
		return
	}

	response, err := services.ListVehicleModelTemplateVersions(id)
	if err != nil {
		writeVehicleModelTemplateServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, response)
}

func ParseVehicleModelTemplateGeometryHandler(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "[VALIDATION] 车型模型模板 ID 不能为空",
		})
		return
	}

	response, err := services.ParseVehicleModelTemplateGeometry(
		c.Request.Context(),
		id,
		services.ParseVehicleModelTemplateGeometryRequest{
			ActorID:  middleware.GetSafeUserID(c),
			Operator: middleware.GetSafeUsername(c),
			IP:       c.ClientIP(),
		},
	)
	if err != nil {
		writeVehicleModelTemplateServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, response)
}

func CreateVehicleModelTemplateGeometryParseTaskHandler(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "[VALIDATION] 车型模型模板 ID 不能为空",
		})
		return
	}

	response, err := services.EnqueueVehicleModelTemplateGeometryParseTask(
		id,
		services.ParseVehicleModelTemplateGeometryRequest{
			ActorID:  middleware.GetSafeUserID(c),
			Operator: middleware.GetSafeUsername(c),
			IP:       c.ClientIP(),
		},
	)
	if err != nil {
		writeVehicleModelTemplateServiceError(c, err)
		return
	}
	c.JSON(http.StatusAccepted, response)
}

func GetVehicleModelTemplateGeometryParseTaskHandler(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	taskID := strings.TrimSpace(c.Param("taskId"))
	if id == "" || taskID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "[VALIDATION] 车型模型模板 ID 和解析任务 ID 不能为空",
		})
		return
	}

	response, err := services.GetVehicleModelTemplateGeometryParseTask(id, taskID)
	if err != nil {
		writeVehicleModelTemplateServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, response)
}

func RetryVehicleModelTemplateGeometryParseTaskHandler(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	taskID := strings.TrimSpace(c.Param("taskId"))
	if id == "" || taskID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "[VALIDATION] 车型模型模板 ID 和解析任务 ID 不能为空",
		})
		return
	}

	response, err := services.RetryVehicleModelTemplateGeometryParseTask(id, taskID)
	if err != nil {
		writeVehicleModelTemplateServiceError(c, err)
		return
	}
	c.JSON(http.StatusAccepted, response)
}

func RestoreVehicleModelTemplateVersionHandler(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "[VALIDATION] 车型模型模板 ID 不能为空",
		})
		return
	}

	versionNumber, err := strconv.Atoi(strings.TrimSpace(c.Param("version")))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "[VALIDATION] 车型模型模板版本号不正确",
		})
		return
	}

	response, err := services.RestoreVehicleModelTemplateVersion(
		id,
		versionNumber,
		services.RestoreVehicleModelTemplateVersionRequest{
			ActorID:  middleware.GetSafeUserID(c),
			Operator: middleware.GetSafeUsername(c),
			IP:       c.ClientIP(),
		},
	)
	if err != nil {
		writeVehicleModelTemplateServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, response)
}

func writeVehicleModelTemplateServiceError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, services.ErrVehicleModelTemplateSeedVehicleNotFound),
		errors.Is(err, services.ErrVehicleModelTemplateNotFound),
		errors.Is(err, services.ErrVehicleModelTemplateSourceAssetFileNotFound),
		errors.Is(err, services.ErrVehicleModelTemplateParseTaskNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "[NOT_FOUND] " + err.Error()})
	case errors.Is(err, services.ErrVehicleModelTemplateNameRequired),
		errors.Is(err, services.ErrVehicleModelTemplateSourceURLRequired),
		errors.Is(err, services.ErrVehicleModelTemplateSourceURLInvalid),
		errors.Is(err, services.ErrVehicleModelTemplateSourceNameRequired),
		errors.Is(err, services.ErrVehicleModelTemplateSourceFormatInvalid),
		errors.Is(err, services.ErrVehicleModelTemplateStatusInvalid),
		errors.Is(err, services.ErrVehicleModelTemplateStatusParserOnly),
		errors.Is(err, services.ErrVehicleModelTemplateFootprintInvalid),
		errors.Is(err, services.ErrVehicleModelTemplateSeedVehicleImmutable),
		errors.Is(err, services.ErrVehicleModelTemplateVersionInvalid),
		errors.Is(err, services.ErrVehicleModelTemplateParserFailed),
		errors.Is(err, services.ErrVehicleModelTemplateParsedGeometryInvalid):
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] " + err.Error()})
	case errors.Is(err, services.ErrVehicleModelTemplateVersionNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "[NOT_FOUND] " + err.Error()})
	case errors.Is(err, services.ErrVehicleModelTemplateDuplicate),
		errors.Is(err, services.ErrVehicleModelTemplateChangedDuringParse),
		errors.Is(err, services.ErrVehicleModelTemplateParseTaskNotRetryable):
		c.JSON(http.StatusConflict, gin.H{"error": "[CONFLICT] " + err.Error()})
	case errors.Is(err, services.ErrVehicleModelTemplateParserUnavailable):
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] " + err.Error()})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "[SERVER] 保存车型模型模板失败: " + err.Error(),
		})
	}
}
