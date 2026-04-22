package handlers

import (
	"errors"
	"fmt"
	"math/rand"
	"net/http"
	"strings"
	"time"
	"xdfc-server/authz"
	"xdfc-server/middleware"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func normalizePermissionContext(value any) []string {
	switch v := value.(type) {
	case []string:
		return authz.DeduplicatePermissionIDs(v)
	case string:
		return authz.ParsePermissionIDs(v)
	case []any:
		permissions := make([]string, 0, len(v))
		for _, item := range v {
			if permission, ok := item.(string); ok {
				permissions = append(permissions, permission)
			}
		}
		return authz.DeduplicatePermissionIDs(permissions)
	default:
		stringValue := strings.TrimSpace(fmt.Sprint(v))
		if stringValue == "" || stringValue == "<nil>" {
			return nil
		}
		return authz.ParsePermissionIDs(stringValue)
	}
}

func RequestApprovalHandler(c *gin.Context) {
	var input struct {
		Module      string `json:"module"`
		Action      string `json:"action"`
		TargetID    string `json:"targetId"`
		Reason      string `json:"reason"`
		Approver1ID string `json:"approver1Id"`
		Approver2ID string `json:"approver2Id"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效参数"})
		return
	}

	approver1ID, err := normalizeOptionalUUIDString(input.Approver1ID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "一级审批人 ID 格式无效"})
		return
	}
	approver2ID, err := normalizeOptionalUUIDString(input.Approver2ID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "二级审批人 ID 格式无效"})
		return
	}

	result, err := services.RequestApproval(services.RequestApprovalInput{
		Module:      input.Module,
		Action:      input.Action,
		TargetID:    input.TargetID,
		Reason:      input.Reason,
		RequesterID: middleware.GetSafeUserID(c),
		Approver1ID: approver1ID,
		Approver2ID: approver2ID,
	})
	if errors.Is(err, services.ErrApprovalApproverMissing) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "未找到有效的审批链配置"})
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
		c.JSON(http.StatusNotFound, gin.H{"error": "审批申请不存在"})
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

func GetMyApprovalsHandler(c *gin.Context) {
	rawPermissions, _ := c.Get("permissions")
	requests, err := services.ListMyApprovals(middleware.GetSafeUserID(c), normalizePermissionContext(rawPermissions))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取审批列表失败"})
		return
	}
	c.JSON(http.StatusOK, requests)
}

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
