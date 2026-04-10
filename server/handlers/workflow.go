package handlers

import (
	"errors"
	"net/http"
	"strings"
	"xdfc-server/middleware"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

// GetWorkflowDefinitionsHandler returns workflow definitions.
func GetWorkflowDefinitionsHandler(c *gin.Context) {
	module := strings.TrimSpace(c.Query("module"))
	definitions, err := services.ListWorkflowDefinitions(module)
	if err != nil {
		respondWorkflowServer(c, "获取流程定义失败", err)
		return
	}
	c.JSON(http.StatusOK, definitions)
}

// SaveWorkflowDefinitionHandler creates or updates one workflow definition.
func SaveWorkflowDefinitionHandler(c *gin.Context) {
	payload, body, err := decodeJSONBodyMap(c)
	if err != nil {
		respondWorkflowValidation(c, "流程定义数据格式错误", err)
		return
	}

	definition, err := services.SaveWorkflowDefinitionFromJSON(payload, body)
	if err != nil {
		if errors.Is(err, services.ErrWorkflowDefinitionPayloadInvalid) {
			respondWorkflowValidation(c, "流程定义校验失败", err)
			return
		}
		respondWorkflowServer(c, "保存流程定义失败", err)
		return
	}

	c.JSON(http.StatusOK, definition)
}

// GetWorkflowInstancesHandler returns workflow instances with pagination.
func GetWorkflowInstancesHandler(c *gin.Context) {
	page, pageSize := parsePageAndSize(c, 1, 50)
	businessType := strings.TrimSpace(c.Query("businessType"))
	businessRefID := strings.TrimSpace(c.Query("businessRefId"))
	status := strings.TrimSpace(c.Query("status"))

	response, err := services.ListWorkflowInstances(services.WorkflowInstanceListQuery{
		Page:         page,
		PageSize:     pageSize,
		BusinessType: businessType,
		BusinessRef:  businessRefID,
		Status:       status,
	})
	if err != nil {
		respondWorkflowServer(c, "获取流程实例失败", err)
		return
	}
	c.JSON(http.StatusOK, response)
}

// CreateWorkflowInstanceHandler starts one workflow instance for business document.
func CreateWorkflowInstanceHandler(c *gin.Context) {
	var input services.CreateWorkflowInstanceRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		respondWorkflowValidation(c, "流程实例参数格式错误", err)
		return
	}

	input.Module = strings.TrimSpace(input.Module)
	input.BusinessType = strings.TrimSpace(input.BusinessType)
	input.BusinessRefID = strings.TrimSpace(input.BusinessRefID)
	input.RequesterID = strings.TrimSpace(input.RequesterID)
	if input.RequesterID == "" {
		input.RequesterID = middleware.GetSafeUserID(c)
	}

	if input.Module == "" || input.BusinessType == "" || input.BusinessRefID == "" {
		respondWorkflowValidation(c, "module/businessType/businessRefId 不能为空", nil)
		return
	}

	instance, err := services.CreateWorkflowInstance(input)
	if err != nil {
		if errors.Is(err, services.ErrWorkflowDefinitionMissing) {
			respondWorkflowCritical(c, http.StatusNotFound, "未找到可用流程定义", nil)
			return
		}
		respondWorkflowServer(c, "创建流程实例失败", err)
		return
	}

	c.JSON(http.StatusOK, instance)
}

// GetWorkflowTasksHandler returns workflow tasks.
func GetWorkflowTasksHandler(c *gin.Context) {
	instanceID := strings.TrimSpace(c.Query("instanceId"))
	assigneeUserID := strings.TrimSpace(c.Query("assigneeUserId"))
	status := strings.TrimSpace(c.Query("status"))
	if assigneeUserID == "" {
		assigneeUserID = middleware.GetSafeUserID(c)
	}

	tasks, err := services.ListWorkflowTasks(instanceID, assigneeUserID, status)
	if err != nil {
		respondWorkflowServer(c, "获取流程任务失败", err)
		return
	}
	c.JSON(http.StatusOK, tasks)
}

// ApproveWorkflowTaskHandler approves one workflow task.
func ApproveWorkflowTaskHandler(c *gin.Context) {
	handleWorkflowTaskDecision(c, true)
}

// RejectWorkflowTaskHandler rejects one workflow task.
func RejectWorkflowTaskHandler(c *gin.Context) {
	handleWorkflowTaskDecision(c, false)
}

func handleWorkflowTaskDecision(c *gin.Context, approved bool) {
	taskID := strings.TrimSpace(c.Param("id"))
	if taskID == "" {
		respondWorkflowValidation(c, "任务 ID 不能为空", nil)
		return
	}

	userID := middleware.GetSafeUserID(c)
	if strings.TrimSpace(userID) == "" {
		respondWorkflowCritical(c, http.StatusForbidden, "无法识别审批人身份", nil)
		return
	}

	var input services.WorkflowTaskDecisionRequest
	_ = c.ShouldBindJSON(&input)

	var (
		instance services.WorkflowInstanceResponse
		err      error
	)
	if approved {
		instance, err = services.ApproveWorkflowTask(taskID, userID, input.Comment)
	} else {
		instance, err = services.RejectWorkflowTask(taskID, userID, input.Comment)
	}
	if err != nil {
		switch {
		case errors.Is(err, services.ErrWorkflowTaskNotFound):
			respondWorkflowCritical(c, http.StatusNotFound, "流程任务不存在", nil)
			return
		case errors.Is(err, services.ErrWorkflowTaskAssigneeMismatch):
			respondWorkflowCritical(c, http.StatusForbidden, "当前用户不是该任务审批人", nil)
			return
		case errors.Is(err, services.ErrWorkflowTaskAlreadyHandled):
			respondWorkflowValidationWithStatus(c, http.StatusConflict, "该任务已处理，请勿重复提交", nil)
			return
		default:
			respondWorkflowServer(c, "审批处理失败", err)
			return
		}
	}

	c.JSON(http.StatusOK, instance)
}

func respondWorkflowValidation(c *gin.Context, message string, err error) {
	respondWorkflow(c, http.StatusBadRequest, "[VALIDATION]", message, err)
}

func respondWorkflowValidationWithStatus(c *gin.Context, status int, message string, err error) {
	respondWorkflow(c, status, "[VALIDATION]", message, err)
}

func respondWorkflowServer(c *gin.Context, message string, err error) {
	respondWorkflow(c, http.StatusInternalServerError, "[SERVER]", message, err)
}

func respondWorkflowCritical(c *gin.Context, status int, message string, err error) {
	respondWorkflow(c, status, "[CRITICAL]", message, err)
}

func respondWorkflow(c *gin.Context, status int, level string, message string, err error) {
	detail := strings.TrimSpace(message)
	if err != nil {
		detail += ": " + err.Error()
	}
	c.JSON(status, gin.H{"error": level + " " + detail})
}
