package services

import (
	"errors"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

var (
	ErrApprovalConfigNotFound  = errors.New("approval config not found")
	ErrApprovalRequestNotFound = errors.New("approval request not found")
	ErrApprovalAuthCodeInvalid = errors.New("approval auth code invalid")
	ErrApprovalAuthCodeExpired = errors.New("approval auth code expired")
)

type SaveApprovalConfigInput struct {
	Module      string
	Action      string
	Approver1ID string
	Approver2ID string
	IsActive    bool
	Description string
}

type RequestApprovalInput struct {
	Module      string
	Action      string
	TargetID    string
	Reason      string
	RequesterID string
}

type ApproveRequestInput struct {
	RequestID      string
	Status         string
	AuthCode       string
	ApproverUserID string
}

type VerifyAuthCodeInput struct {
	Module   string
	Action   string
	TargetID string
	AuthCode string
}

type ApprovalWorkflowResult struct {
	Request          models.ApprovalRequest
	NotifyAction     string
	NotifyTitle      string
	NotifyTargetUser string
}

func ListApprovalConfigs() ([]models.ApprovalConfig, error) {
	var configs []models.ApprovalConfig
	if err := db.DB.Preload("Approver1").Preload("Approver2").Find(&configs).Error; err != nil {
		return nil, err
	}
	return configs, nil
}

func SaveApprovalConfig(input SaveApprovalConfigInput) error {
	module := strings.TrimSpace(input.Module)
	action := strings.TrimSpace(input.Action)
	description := strings.TrimSpace(input.Description)

	var existing models.ApprovalConfig
	res := db.DB.Where("module = ? AND action = ?", module, action).First(&existing)

	if res.Error == nil {
		updates := map[string]interface{}{
			"module":       module,
			"action":       action,
			"approver1_id": input.Approver1ID,
			"approver2_id": nil,
			"is_active":    input.IsActive,
			"description":  description,
		}
		if input.Approver2ID != "" {
			updates["approver2_id"] = input.Approver2ID
		}
		return db.DB.Model(&existing).Updates(updates).Error
	}
	if !errors.Is(res.Error, gorm.ErrRecordNotFound) {
		return res.Error
	}

	config := models.ApprovalConfig{
		Module:      module,
		Action:      action,
		Approver1ID: input.Approver1ID,
		Approver2ID: input.Approver2ID,
		IsActive:    input.IsActive,
		Description: description,
	}

	createTx := db.DB
	if input.Approver2ID == "" {
		createTx = createTx.Omit("Approver2ID")
	}
	return createTx.Create(&config).Error
}

func RequestApproval(input RequestApprovalInput) (ApprovalWorkflowResult, error) {
	var config models.ApprovalConfig
	err := db.DB.Where("module = ? AND action = ? AND is_active = true", input.Module, input.Action).First(&config).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return ApprovalWorkflowResult{}, ErrApprovalConfigNotFound
	}
	if err != nil {
		return ApprovalWorkflowResult{}, err
	}

	request := models.ApprovalRequest{
		ConfigID:      config.ID,
		RequesterID:   input.RequesterID,
		TargetID:      input.TargetID,
		Reason:        input.Reason,
		Module:        input.Module,
		Action:        input.Action,
		Status:        "PENDING",
		CurrentLevel:  1,
	}

	if err := db.DB.Create(&request).Error; err != nil {
		return ApprovalWorkflowResult{}, err
	}

	return ApprovalWorkflowResult{
		Request:          request,
		NotifyAction:     "REQUEST",
		NotifyTitle:      "您有一条新的待处理审批申请",
		NotifyTargetUser: config.Approver1ID,
	}, nil
}

func ApproveRequest(input ApproveRequestInput, now time.Time, generateCode func() string) (ApprovalWorkflowResult, error) {
	var request models.ApprovalRequest
	if err := db.DB.Preload("Config").First(&request, "id = ?", input.RequestID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ApprovalWorkflowResult{}, ErrApprovalRequestNotFound
		}
		return ApprovalWorkflowResult{}, err
	}

	result := ApprovalWorkflowResult{Request: request}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		switch request.CurrentLevel {
		case 1:
			if request.Config == nil || request.Config.Approver1ID != input.ApproverUserID {
				return errors.New("您不是当前节点的一级审批人")
			}

			if input.Status == "REJECTED" {
				request.Status = "REJECTED"
				return tx.Model(&request).Update("status", request.Status).Error
			}

			if request.Config.Approver2ID != "" {
				request.Status = "APPROVED_L1"
				request.CurrentLevel = 2
				if err := tx.Model(&request).Updates(map[string]interface{}{
					"status":        request.Status,
					"current_level": request.CurrentLevel,
				}).Error; err != nil {
					return err
				}

				result.NotifyAction = "L2_WAITING"
				result.NotifyTitle = "一级审批已通过，等待您的二审"
				result.NotifyTargetUser = request.Config.Approver2ID
				return nil
			}

			code := strings.TrimSpace(input.AuthCode)
			if code == "" && generateCode != nil {
				code = generateCode()
			}
			expiresAt := now.Add(1 * time.Hour)
			request.Status = "APPROVED"
			request.AuthCode = code
			request.ExpiresAt = &expiresAt
			if err := tx.Model(&request).Updates(map[string]interface{}{
				"status":     request.Status,
				"auth_code":  request.AuthCode,
				"expires_at": request.ExpiresAt,
			}).Error; err != nil {
				return err
			}

			result.NotifyAction = "APPROVED"
			result.NotifyTitle = "您的审批申请已被批准，授权码已发放"
			result.NotifyTargetUser = request.RequesterID
			return nil

		case 2:
			if request.Config == nil || request.Config.Approver2ID != input.ApproverUserID {
				return errors.New("您不是当前节点的二级审批人")
			}

			if input.Status == "REJECTED" {
				request.Status = "REJECTED"
				return tx.Model(&request).Update("status", request.Status).Error
			}

			code := strings.TrimSpace(input.AuthCode)
			if code == "" && generateCode != nil {
				code = generateCode()
			}
			expiresAt := now.Add(1 * time.Hour)
			request.Status = "APPROVED"
			request.AuthCode = code
			request.ExpiresAt = &expiresAt
			if err := tx.Model(&request).Updates(map[string]interface{}{
				"status":     request.Status,
				"auth_code":  request.AuthCode,
				"expires_at": request.ExpiresAt,
			}).Error; err != nil {
				return err
			}

			result.NotifyAction = "APPROVED"
			result.NotifyTitle = "您的二级审批已通过内容已授权"
			result.NotifyTargetUser = request.RequesterID
			return nil

		default:
			return errors.New("不可识别的审批层级")
		}
	})
	if err != nil {
		return ApprovalWorkflowResult{}, err
	}

	result.Request = request
	return result, nil
}

func ListMyApprovals(userID string, role string) ([]models.ApprovalRequest, error) {
	var requests []models.ApprovalRequest
	query := db.DB.Preload("Config").Preload("Requester")

	if role == "admin" {
		if err := query.Find(&requests).Error; err != nil {
			return nil, err
		}
		return requests, nil
	}

	if err := query.Where(
		"requester_id = ? OR EXISTS(SELECT 1 FROM approval_configs WHERE id = approval_requests.config_id AND (approver1_id = ? OR approver2_id = ?))",
		userID, userID, userID,
	).Find(&requests).Error; err != nil {
		return nil, err
	}
	return requests, nil
}

func VerifyAuthCode(input VerifyAuthCodeInput, now time.Time) (models.ApprovalRequest, error) {
	var request models.ApprovalRequest
	err := db.DB.Where(
		"module = ? AND action = ? AND target_id = ? AND auth_code = ? AND status = 'APPROVED'",
		input.Module, input.Action, input.TargetID, input.AuthCode,
	).First(&request).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.ApprovalRequest{}, ErrApprovalAuthCodeInvalid
	}
	if err != nil {
		return models.ApprovalRequest{}, err
	}

	if request.ExpiresAt != nil && now.After(*request.ExpiresAt) {
		return models.ApprovalRequest{}, ErrApprovalAuthCodeExpired
	}

	if err := db.DB.Model(&request).Update("status", "VERIFIED").Error; err != nil {
		return models.ApprovalRequest{}, err
	}
	request.Status = "VERIFIED"
	return request, nil
}

func DeleteApprovalConfig(id string) error {
	return db.DB.Delete(&models.ApprovalConfig{}, "id = ?", id).Error
}

func CheckAndConsumeApproval(module, action, targetID, approvalID string) error {
	var config models.ApprovalConfig
	err := db.DB.Where("module = ? AND action = ? AND is_active = true", module, action).First(&config).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil
	}
	if err != nil {
		return err
	}

	if strings.TrimSpace(approvalID) == "" {
		return errors.New("该操作受系统保护，请先发起审批并获取授权码（Missing Approval ID）")
	}

	var request models.ApprovalRequest
	err = db.DB.Where(
		"id = ? AND module = ? AND action = ? AND target_id = ? AND status = 'VERIFIED'",
		approvalID, module, action, targetID,
	).First(&request).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return errors.New("审批令牌无效、目标不匹配或已经失效，请重新验证授权码")
	}
	if err != nil {
		return err
	}

	return db.DB.Model(&request).Update("status", "CONSUMED").Error
}
