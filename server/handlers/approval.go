package handlers

import (
	"errors"
	"fmt"
	"math/rand"
	"net/http"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/middleware"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetApprovalConfigsHandler 获取所有审批职责配置
func GetApprovalConfigsHandler(c *gin.Context) {
	var configs []models.ApprovalConfig
	if err := db.DB.Preload("Approver1").Preload("Approver2").Find(&configs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取审批配置失败"})
		return
	}
	c.JSON(http.StatusOK, configs)
}

// SaveApprovalConfigHandler 保存或更新审批规则
func SaveApprovalConfigHandler(c *gin.Context) {
	var input models.ApprovalConfig
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的参数格式"})
		return
	}

	var existing models.ApprovalConfig
	input.Module = strings.TrimSpace(input.Module)
	input.Action = strings.TrimSpace(input.Action)
	input.Description = strings.TrimSpace(input.Description)

	approver1ID, err := normalizeOptionalUUIDString(input.Approver1ID)
	if err != nil || approver1ID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "涓€绾у鎵逛汉 ID 鏍煎紡鏃犳晥"})
		return
	}
	input.Approver1ID = approver1ID

	approver2ID, err := normalizeOptionalUUIDString(input.Approver2ID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "浜岀骇瀹℃壒浜?ID 鏍煎紡鏃犳晥"})
		return
	}
	input.Approver2ID = approver2ID

	res := db.DB.Where("module = ? AND action = ?", input.Module, input.Action).First(&existing)

	if res.Error == nil {
		updates := map[string]interface{}{
			"module":       input.Module,
			"action":       input.Action,
			"approver1_id": input.Approver1ID,
			"approver2_id": nil,
			"is_active":    input.IsActive,
			"description":  input.Description,
		}
		if input.Approver2ID != "" {
			updates["approver2_id"] = input.Approver2ID
		}
		if err := db.DB.Model(&existing).Updates(updates).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "更新配置失败"})
			return
		}
	} else {
		createTx := db.DB
		if input.Approver2ID == "" {
			createTx = createTx.Omit("Approver2ID")
		}
		if err := createTx.Create(&input).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "创建配置失败"})
			return
		}
	}
	c.JSON(http.StatusOK, gin.H{"message": "保存成功"})
}

// RequestApprovalHandler 发起审批申请 (根据模块动作自动匹配)
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

	// 1. 查找匹配的配置
	var config models.ApprovalConfig
	if err := db.DB.Where("module = ? AND action = ? AND is_active = true", input.Module, input.Action).First(&config).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "该操作未配置审批流，或默认允许执行"})
		return
	}

	requesterID := middleware.GetSafeUserID(c)
	request := models.ApprovalRequest{
		ConfigID:     config.ID,
		RequesterID:  requesterID,
		TargetID:     input.TargetID,
		Reason:       input.Reason,
		Module:       input.Module,
		Action:       input.Action,
		Status:       "PENDING",
		CurrentLevel: 1,
	}

	if err := db.DB.Create(&request).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "提交申请失败"})
		return
	}

	// [新增] 实时通知一级审批人
	NotifyTrigger("Approval", "REQUEST", "您有一条新的待处理审批申请", config.Approver1ID, request)

	c.JSON(http.StatusOK, request)
}

// ApproveRequestHandler 审批处理 (L1 -> L2, 或最终授权码)
func ApproveRequestHandler(c *gin.Context) {
	id := c.Param("id")
	var input struct {
		Status   string `json:"status"`   // APPROVED / REJECTED
		AuthCode string `json:"authCode"` // 仅最终阶段审批人设置，可选
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效参数"})
		return
	}

	var request models.ApprovalRequest
	if err := db.DB.Preload("Config").First(&request, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "申请不存在"})
		return
	}

	userID := middleware.GetSafeUserID(c)

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		// 校验是否有权限审批
		switch request.CurrentLevel {
		case 1:
			if request.Config.Approver1ID != userID {
				return errors.New("您不是当前节点的一级审批人")
			}

			if input.Status == "REJECTED" {
				return tx.Model(&request).Update("status", "REJECTED").Error
			}

			// 如果有二级审批
			if request.Config.Approver2ID != "" {
				err := tx.Model(&request).Updates(map[string]interface{}{
					"status":        "APPROVED_L1",
					"current_level": 2,
				}).Error
				if err == nil {
					// [新增] 通知二级审批人
					NotifyTrigger("Approval", "L2_WAITING", "一级审批已通过，等待您的二审", request.Config.Approver2ID, request)
				}
				return err
			}

			// 只有一级且通过，生成 6 位口令
			code := input.AuthCode
			if code == "" {
				code = fmt.Sprintf("%06d", rand.Intn(1000000))
			}
			expiresAt := time.Now().Add(1 * time.Hour)
			err := tx.Model(&request).Updates(map[string]interface{}{
				"status":     "APPROVED",
				"auth_code":  code,
				"expires_at": expiresAt,
			}).Error
			if err == nil {
				// [新增] 通知申请人口令已发放
				NotifyTrigger("Approval", "APPROVED", "您的审批申请已被批准，授权码已发放", request.RequesterID, request)
			}
			return err

		case 2:
			if request.Config.Approver2ID != userID {
				return errors.New("您不是当前节点的二级审批人")
			}

			if input.Status == "REJECTED" {
				return tx.Model(&request).Update("status", "REJECTED").Error
			}

			// 二级通过，生成最终 6 位口令
			code := input.AuthCode
			if code == "" {
				code = fmt.Sprintf("%06d", rand.Intn(1000000))
			}
			expiresAt := time.Now().Add(1 * time.Hour)
			err := tx.Model(&request).Updates(map[string]interface{}{
				"status":     "APPROVED",
				"auth_code":  code,
				"expires_at": expiresAt,
			}).Error
			if err == nil {
				NotifyTrigger("Approval", "APPROVED", "您的二级审批已通过内容已授权", request.RequesterID, request)
			}
			return err

		default:
			return errors.New("不可识别的审批层级")
		}
	})

	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "审批操作成功"})
}

// GetMyApprovalsHandler 获取跟我相关的审批 (我申请的 或 需要我审的)
func GetMyApprovalsHandler(c *gin.Context) {
	userID := middleware.GetSafeUserID(c)
	role, _ := c.Get("role")

	var requests []models.ApprovalRequest
	query := db.DB.Preload("Config").Preload("Requester")

	if role == "admin" {
		// 管理员看全部 (可选，建议只看跟自己有关的，或者有权限看全部)
		query.Find(&requests)
	} else {
		// 1. 我申请的
		// 2. 参与过的 (我是该配置的一审或二审人)
		query.Where("requester_id = ? OR EXISTS(SELECT 1 FROM approval_configs WHERE id = approval_requests.config_id AND (approver1_id = ? OR approver2_id = ?))",
			userID, userID, userID).Find(&requests)
	}

	c.JSON(http.StatusOK, requests)
}

// VerifyAuthCodeHandler 验证授权码并返回临时凭证
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

	var request models.ApprovalRequest
	err := db.DB.Where("module = ? AND action = ? AND target_id = ? AND auth_code = ? AND status = 'APPROVED'",
		input.Module, input.Action, input.TargetID, input.AuthCode).First(&request).Error

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "授权码错误或申请未获得最终批准"})
		return
	}

	if request.ExpiresAt != nil && time.Now().After(*request.ExpiresAt) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "授权码已过期"})
		return
	}

	// 标记为已验证但未消耗 (二阶段校验)
	db.DB.Model(&request).Update("status", "VERIFIED")

	// 返回成功标识，前端拿到该提示后即可继续原业务请求
	c.JSON(http.StatusOK, gin.H{
		"message": "验证通过",
		"token":   request.ID, // 将申请 ID 作为临时凭证回传
	})
}

// DeleteApprovalConfigHandler 删除审批配置
func DeleteApprovalConfigHandler(c *gin.Context) {
	id := c.Param("id")
	if err := db.DB.Delete(&models.ApprovalConfig{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "删除失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "已删除配置"})
}

// CheckAndConsumeApproval 为业务接口提供的通用审批校验钩子
func CheckAndConsumeApproval(module, action, targetId, approvalId string) error {
	// 1. 查找是否配置了针对该动作的生效审批流
	var config models.ApprovalConfig
	err := db.DB.Where("module = ? AND action = ? AND is_active = true", module, action).First(&config).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil // 未配置，默认允许执行
		}
		return err
	}

	// 2. 如果配置了，则强制校验审批令牌 (approvalId)
	if approvalId == "" {
		return errors.New("该操作受系统保护，请先发起审批并获取授权码（Missing Approval ID）")
	}

	var request models.ApprovalRequest
	err = db.DB.Where("id = ? AND module = ? AND action = ? AND target_id = ? AND status = 'VERIFIED'",
		approvalId, module, action, targetId).First(&request).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("审批令牌无效、目标不匹配或已经失效，请重新验证授权码")
		}
		return err
	}

	// 3. 校验通过，立即核销令牌
	return db.DB.Model(&request).Update("status", "CONSUMED").Error
}
