package services

import (
	"errors"
	"strings"
	"time"
	"xdfc-server/authz"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var (
	ErrApprovalRequestNotFound = errors.New("approval request not found")
	ErrApprovalAuthCodeInvalid = errors.New("approval auth code invalid")
	ErrApprovalAuthCodeExpired = errors.New("approval auth code expired")
	ErrApprovalApproverMissing = errors.New("approval approver chain is empty")
)

type RequestApprovalInput struct {
	Module      string
	Action      string
	TargetID    string
	Reason      string
	RequesterID string
	Approver1ID string
	Approver2ID string
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

func normalizeApproverChain(approver1ID string, approver2ID string) (string, string) {
	primary := strings.TrimSpace(approver1ID)
	secondary := strings.TrimSpace(approver2ID)

	if primary == "" && secondary != "" {
		primary = secondary
		secondary = ""
	}
	if primary != "" && primary == secondary {
		secondary = ""
	}

	return primary, secondary
}

func resolveRequestApprovers(input RequestApprovalInput) (string, string) {
	return normalizeApproverChain(input.Approver1ID, input.Approver2ID)
}

func effectiveApprover1(request models.ApprovalRequest) string {
	if strings.TrimSpace(request.Approver1ID) != "" {
		return strings.TrimSpace(request.Approver1ID)
	}
	return ""
}

func effectiveApprover2(request models.ApprovalRequest) string {
	if strings.TrimSpace(request.Approver2ID) != "" {
		return strings.TrimSpace(request.Approver2ID)
	}
	return ""
}

func RequestApprovalTx(tx *gorm.DB, input RequestApprovalInput) (ApprovalWorkflowResult, error) {
	if tx == nil {
		tx = db.DB
	}

	approver1ID, approver2ID := resolveRequestApprovers(input)
	if approver1ID == "" {
		return ApprovalWorkflowResult{}, ErrApprovalApproverMissing
	}

	request := models.ApprovalRequest{
		BaseModel:    models.BaseModel{ID: uuid.NewString()},
		RequesterID:  input.RequesterID,
		TargetID:     input.TargetID,
		Reason:       input.Reason,
		Approver1ID:  approver1ID,
		Approver2ID:  approver2ID,
		Module:       input.Module,
		Action:       input.Action,
		Status:       "PENDING",
		CurrentLevel: 1,
	}

	createTx := tx
	if approver2ID == "" {
		createTx = createTx.Omit("Approver2ID")
	}
	if err := createTx.Create(&request).Error; err != nil {
		return ApprovalWorkflowResult{}, err
	}

	return ApprovalWorkflowResult{
		Request:          request,
		NotifyAction:     "REQUEST",
		NotifyTitle:      "您有一条新的待处理审批申请",
		NotifyTargetUser: approver1ID,
	}, nil
}

func RequestApproval(input RequestApprovalInput) (ApprovalWorkflowResult, error) {
	result, err := RequestApprovalTx(db.DB, input)
	if err != nil {
		return ApprovalWorkflowResult{}, err
	}
	syncApprovalRequestToSearch(result.Request)
	return result, nil
}

func ApproveRequest(input ApproveRequestInput, now time.Time, generateCode func() string) (ApprovalWorkflowResult, error) {
	var request models.ApprovalRequest
	if err := db.DB.First(&request, "id = ?", input.RequestID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ApprovalWorkflowResult{}, ErrApprovalRequestNotFound
		}
		return ApprovalWorkflowResult{}, err
	}

	result := ApprovalWorkflowResult{Request: request}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		switch request.CurrentLevel {
		case 1:
			if effectiveApprover1(request) != input.ApproverUserID {
				return errors.New("您不是当前节点的一级审批人")
			}

			if input.Status == "REJECTED" {
				request.Status = "REJECTED"
				return tx.Model(&request).Update("status", request.Status).Error
			}

			if effectiveApprover2(request) != "" {
				request.Status = "APPROVED_L1"
				request.CurrentLevel = 2
				if err := tx.Model(&request).Updates(map[string]interface{}{
					"status":        request.Status,
					"current_level": request.CurrentLevel,
				}).Error; err != nil {
					return err
				}

				result.NotifyAction = "L2_WAITING"
				result.NotifyTitle = "一级审批已通过，等待二级审批"
				result.NotifyTargetUser = effectiveApprover2(request)
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
			result.NotifyTitle = "您的审批申请已被批准，授权码已发送"
			result.NotifyTargetUser = request.RequesterID
			return nil

		case 2:
			if effectiveApprover2(request) != input.ApproverUserID {
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
			result.NotifyTitle = "您的二级审批已通过，内容已授权"
			result.NotifyTargetUser = request.RequesterID
			return nil

		default:
			return errors.New("unrecognized approval level")
		}
	})
	if err != nil {
		return ApprovalWorkflowResult{}, err
	}

	if err := db.DB.First(&request, "id = ?", input.RequestID).Error; err == nil {
		result.Request = request
		syncApprovalRequestToSearch(request)
	}

	result.Request = request
	return result, nil
}

func ListMyApprovals(userID string, permissionIDs []string) ([]models.ApprovalRequest, error) {
	var requests []models.ApprovalRequest
	query := db.DB.Preload("Requester")

	if hasApprovalFullAccess(permissionIDs) {
		if err := query.Find(&requests).Error; err != nil {
			return nil, err
		}
		return requests, nil
	}

	if err := query.Where(
		`requester_id = ?
		 OR approver1_id = ?
		 OR approver2_id = ?`,
		userID, userID, userID,
	).Find(&requests).Error; err != nil {
		return nil, err
	}
	return requests, nil
}

func hasApprovalFullAccess(permissionIDs []string) bool {
	normalized := authz.DeduplicatePermissionIDs(permissionIDs)
	for _, permissionID := range normalized {
		if permissionID == authz.PermissionManage {
			return true
		}
	}
	return false
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
	request.UpdatedAt = now
	syncApprovalRequestToSearch(request)
	return request, nil
}
