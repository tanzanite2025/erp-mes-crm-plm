package handlers

import (
	"errors"
	"fmt"
	"math/rand"
	"net/http"
	"time"
	"xdfc-server/middleware"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

// GetApprovalConfigsHandler returns all approval configs.
func GetApprovalConfigsHandler(c *gin.Context) {
	configs, err := services.ListApprovalConfigs()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取审批配置失败"})
		return
	}
	c.JSON(http.StatusOK, configs)
}

// SaveApprovalConfigHandler creates or updates approval config.
func SaveApprovalConfigHandler(c *gin.Context) {
	var input struct {
		Module      string `json:"module"`
		Action      string `json:"action"`
		Approver1ID string `json:"approver1Id"`
		Approver2ID string `json:"approver2Id"`
		IsActive    bool   `json:"isActive"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的参数格式"})
		return
	}

	approver1ID, err := normalizeOptionalUUIDString(input.Approver1ID)
	if err != nil || approver1ID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "一级审批人 ID 格式无效"})
		return
	}

	approver2ID, err := normalizeOptionalUUIDString(input.Approver2ID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "二级审批人 ID 格式无效"})
		return
	}

	err = services.SaveApprovalConfig(services.SaveApprovalConfigInput{
		Module:      input.Module,
		Action:      input.Action,
		Approver1ID: approver1ID,
		Approver2ID: approver2ID,
		IsActive:    input.IsActive,
		Description: input.Description,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存审批配置失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "保存成功"})
}

// RequestApprovalHandler creates an approval request.
func RequestApprovalHandler(c *gin.Context) {
	var input struct {
		Module   string `json:"module"`
		Action   string `json:"action"`
		TargetID string `json:"targetId"`
		Reason   string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效参数"})
		return
	}

	result, err := services.RequestApproval(services.RequestApprovalInput{
		Module:      input.Module,
		Action:      input.Action,
		TargetID:    input.TargetID,
		Reason:      input.Reason,
		RequesterID: middleware.GetSafeUserID(c),
	})
	if errors.Is(err, services.ErrApprovalConfigNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "该操作未配置审批流，或默认允许执行"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "提交申请失败"})
		return
	}

	if result.NotifyTargetUser != "" {
		NotifyTrigger("Approval", result.NotifyAction, result.NotifyTitle, result.NotifyTargetUser, result.Request)
	}

	c.JSON(http.StatusOK, result.Request)
}

// ApproveRequestHandler performs L1/L2 approval.
func ApproveRequestHandler(c *gin.Context) {
	var input struct {
		Status   string `json:"status"`
		AuthCode string `json:"authCode"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效参数"})
		return
	}

	result, err := services.ApproveRequest(
		services.ApproveRequestInput{
			RequestID:      c.Param("id"),
			Status:         input.Status,
			AuthCode:       input.AuthCode,
			ApproverUserID: middleware.GetSafeUserID(c),
		},
		time.Now(),
		func() string { return fmt.Sprintf("%06d", rand.Intn(1000000)) },
	)
	if errors.Is(err, services.ErrApprovalRequestNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "申请不存在"})
		return
	}
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	if result.NotifyTargetUser != "" {
		NotifyTrigger("Approval", result.NotifyAction, result.NotifyTitle, result.NotifyTargetUser, result.Request)
	}

	c.JSON(http.StatusOK, gin.H{"message": "审批操作成功"})
}

// GetMyApprovalsHandler returns approvals relevant to current user.
func GetMyApprovalsHandler(c *gin.Context) {
	role, _ := c.Get("role")
	requests, err := services.ListMyApprovals(middleware.GetSafeUserID(c), fmt.Sprint(role))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取审批列表失败"})
		return
	}
	c.JSON(http.StatusOK, requests)
}

// VerifyAuthCodeHandler verifies auth code and returns token.
func VerifyAuthCodeHandler(c *gin.Context) {
	var input struct {
		Module   string `json:"module"`
		Action   string `json:"action"`
		TargetID string `json:"targetId"`
		AuthCode string `json:"authCode"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效参数"})
		return
	}

	request, err := services.VerifyAuthCode(services.VerifyAuthCodeInput{
		Module:   input.Module,
		Action:   input.Action,
		TargetID: input.TargetID,
		AuthCode: input.AuthCode,
	}, time.Now())
	if errors.Is(err, services.ErrApprovalAuthCodeInvalid) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "授权码错误或申请未获得最终批准"})
		return
	}
	if errors.Is(err, services.ErrApprovalAuthCodeExpired) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "授权码已过期"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "授权码校验失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "验证通过",
		"token":   request.ID,
	})
}

// DeleteApprovalConfigHandler deletes approval config.
func DeleteApprovalConfigHandler(c *gin.Context) {
	if err := services.DeleteApprovalConfig(c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "删除失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "已删除配置"})
}

// CheckAndConsumeApproval validates approval token and consumes it.
func CheckAndConsumeApproval(module, action, targetID, approvalID string) error {
	return services.CheckAndConsumeApproval(module, action, targetID, approvalID)
}
