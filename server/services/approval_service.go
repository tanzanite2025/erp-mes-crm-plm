package services

import (
	"context"
	"encoding/json"
	"errors"
	"sort"
	"strings"
	"time"
	"xdfc-server/audit"
	"xdfc-server/authz"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
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
	Comment        string
}

type VerifyAuthCodeInput struct {
	Module   string
	Action   string
	TargetID string
	AuthCode string
}

type ApprovalWorkflowResult struct {
	Request models.ApprovalRequest
}

type ApprovalRequestSummary = models.ApprovalRequest

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

func approvalAuditContext(actorID, operator, source string) context.Context {
	return audit.NewContextWithActor(context.Background(), audit.AuditActor{
		UserID:   strings.TrimSpace(actorID),
		Username: strings.TrimSpace(operator),
		Source:   strings.TrimSpace(source),
	})
}

// RequestApprovalTx creates an approval request and records its audit event in
// the same transaction. Callers that already have an actor should use
// RequestApprovalTxWithContext so the audit row retains that identity.
func RequestApprovalTx(tx *gorm.DB, input RequestApprovalInput) (ApprovalWorkflowResult, error) {
	return RequestApprovalTxWithContext(context.Background(), tx, input)
}

// RequestApprovalTxWithContext is the transaction-safe approval creation
// primitive. The supplied *gorm.DB is used as-is so an outer business
// transaction can atomically include the request, audit row, and any related
// writes. A nil transaction gets its own transaction for compatibility with
// legacy callers.
func RequestApprovalTxWithContext(ctx context.Context, tx *gorm.DB, input RequestApprovalInput) (ApprovalWorkflowResult, error) {
	return defaultApprovalService.RequestApprovalWithinTransaction(ctx, tx, input)
}

func (service *ApprovalService) RequestApprovalWithinTransaction(ctx context.Context, tx *gorm.DB, input RequestApprovalInput) (ApprovalWorkflowResult, error) {
	if tx == nil {
		var result ApprovalWorkflowResult
		err := db.DB.Transaction(func(inner *gorm.DB) error {
			var err error
			result, err = service.RequestApprovalWithinTransaction(ctx, inner, input)
			return err
		})
		if err != nil {
			return ApprovalWorkflowResult{}, err
		}
		return result, nil
	}
	if contract := service.businessTransactionContracts[input.Module]; contract != nil {
		if err := contract.ValidateRequestWithinTransaction(ctx, tx, input); err != nil {
			return ApprovalWorkflowResult{}, err
		}
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
	if err := recordLegacyAuditEntryWithContext(ctx, tx, AuditModuleApprovalRequest, request.ID, "request", nil); err != nil {
		return ApprovalWorkflowResult{}, err
	}
	if err := service.createApprovalNotificationInboxEntryWithinTransaction(tx, request); err != nil {
		return ApprovalWorkflowResult{}, err
	}

	return ApprovalWorkflowResult{
		Request: request,
	}, nil
}

func RequestApproval(ctx context.Context, input RequestApprovalInput) (ApprovalWorkflowResult, error) {
	return defaultApprovalService.RequestApproval(ctx, input)
}

func (service *ApprovalService) RequestApproval(ctx context.Context, input RequestApprovalInput) (ApprovalWorkflowResult, error) {
	if contract := service.businessTransactionContracts[input.Module]; contract != nil {
		if err := contract.ValidateStandaloneRequest(input); err != nil {
			return ApprovalWorkflowResult{}, err
		}
	}
	var result ApprovalWorkflowResult
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var err error
		result, err = service.RequestApprovalWithinTransaction(ctx, tx, input)
		return err
	})
	if err != nil {
		return ApprovalWorkflowResult{}, err
	}

	return result, nil
}

func (service *ApprovalService) recordApprovalDecisionAndSynchronizeBusinessWithinTransaction(ctx context.Context, tx *gorm.DB, request models.ApprovalRequest, action string, input ApproveRequestInput, now time.Time) error {
	decisionDetails := mustJSONRawMessage(map[string]any{"comment": strings.TrimSpace(input.Comment), "status": request.Status, "currentLevel": request.CurrentLevel})
	if err := recordLegacyAuditEntryWithContext(ctx, tx, "ApprovalRequest", request.ID, action, decisionDetails); err != nil {
		return err
	}
	if contract := service.businessTransactionContracts[request.Module]; contract != nil {
		if err := contract.ApplyDecisionWithinTransaction(ctx, tx, request, input.Comment, now); err != nil {
			return err
		}
	}
	if err := service.resolvePreviousApprovalNotificationInboxEntriesWithinTransaction(tx, request); err != nil {
		return err
	}
	return service.createApprovalNotificationInboxEntryWithinTransaction(tx, request)
}

func ApproveRequest(ctx context.Context, input ApproveRequestInput, now time.Time, generateCode func() string) (ApprovalWorkflowResult, error) {
	return defaultApprovalService.ApproveRequest(ctx, input, now, generateCode)
}

func (service *ApprovalService) ApproveRequest(ctx context.Context, input ApproveRequestInput, now time.Time, generateCode func() string) (ApprovalWorkflowResult, error) {
	var request models.ApprovalRequest
	result := ApprovalWorkflowResult{Request: request}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&request, "id = ?", input.RequestID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrApprovalRequestNotFound
			}
			return err
		}
		result.Request = request
		if input.Status != "APPROVED" && input.Status != "REJECTED" {
			return domainValidationError("审批决定必须为通过或驳回")
		}
		if request.Status != "PENDING" && request.Status != "APPROVED_L1" {
			return domainConflictError("该审批申请已处理，请刷新后查看结果")
		}
		auditAction := "approve_" + strings.ToLower(input.Status)

		switch request.CurrentLevel {
		case 1:
			if effectiveApprover1(request) != input.ApproverUserID {
				return errors.New("您不是当前节点的一级审批人")
			}

			if input.Status == "REJECTED" {
				request.Status = "REJECTED"
				if err := tx.Model(&request).Update("status", request.Status).Error; err != nil {
					return err
				}
				return service.recordApprovalDecisionAndSynchronizeBusinessWithinTransaction(ctx, tx, request, auditAction, input, now)
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
				return service.recordApprovalDecisionAndSynchronizeBusinessWithinTransaction(ctx, tx, request, auditAction, input, now)
			}

			request.Status = "APPROVED"
			input.AuthCode = strings.TrimSpace(input.AuthCode)
			service.assignFinalDecisionAuthorizationCode(&request, input, now, generateCode)
			if err := tx.Model(&request).Updates(map[string]interface{}{
				"status":     request.Status,
				"auth_code":  request.AuthCode,
				"expires_at": request.ExpiresAt,
			}).Error; err != nil {
				return err
			}
			return service.recordApprovalDecisionAndSynchronizeBusinessWithinTransaction(ctx, tx, request, auditAction, input, now)

		case 2:
			if effectiveApprover2(request) != input.ApproverUserID {
				return errors.New("您不是当前节点的二级审批人")
			}

			if input.Status == "REJECTED" {
				request.Status = "REJECTED"
				if err := tx.Model(&request).Update("status", request.Status).Error; err != nil {
					return err
				}
				return service.recordApprovalDecisionAndSynchronizeBusinessWithinTransaction(ctx, tx, request, auditAction, input, now)
			}

			request.Status = "APPROVED"
			input.AuthCode = strings.TrimSpace(input.AuthCode)
			service.assignFinalDecisionAuthorizationCode(&request, input, now, generateCode)
			if err := tx.Model(&request).Updates(map[string]interface{}{
				"status":     request.Status,
				"auth_code":  request.AuthCode,
				"expires_at": request.ExpiresAt,
			}).Error; err != nil {
				return err
			}
			return service.recordApprovalDecisionAndSynchronizeBusinessWithinTransaction(ctx, tx, request, auditAction, input, now)

		default:
			return errors.New("unrecognized approval level")
		}
	})
	if err != nil {
		return ApprovalWorkflowResult{}, err
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

func GetLatestApprovalRequestSummaryByTargetID(targetID string) (*ApprovalRequestSummary, error) {
	targetID = strings.TrimSpace(targetID)
	if targetID == "" {
		return nil, nil
	}

	summaryMap, err := GetLatestApprovalRequestSummariesByTargetIDs([]string{targetID})
	if err != nil {
		return nil, err
	}

	return summaryMap[targetID], nil
}

func GetLatestApprovalRequestSummariesByTargetIDs(targetIDs []string) (map[string]*ApprovalRequestSummary, error) {
	normalizedTargetIDs := make([]string, 0, len(targetIDs))
	seen := make(map[string]struct{}, len(targetIDs))
	for _, targetID := range targetIDs {
		normalized := strings.TrimSpace(targetID)
		if normalized == "" {
			continue
		}
		if _, exists := seen[normalized]; exists {
			continue
		}
		seen[normalized] = struct{}{}
		normalizedTargetIDs = append(normalizedTargetIDs, normalized)
	}

	if len(normalizedTargetIDs) == 0 {
		return map[string]*ApprovalRequestSummary{}, nil
	}

	var requests []models.ApprovalRequest
	if err := db.DB.
		Where("target_id IN ?", normalizedTargetIDs).
		Order("created_at desc").
		Find(&requests).Error; err != nil {
		return nil, err
	}

	summaryMap := make(map[string]*ApprovalRequestSummary, len(normalizedTargetIDs))
	for _, request := range requests {
		targetID := strings.TrimSpace(request.TargetID)
		if targetID == "" {
			continue
		}
		if _, exists := summaryMap[targetID]; exists {
			continue
		}
		requestCopy := request
		summaryMap[targetID] = &requestCopy
	}

	keys := make([]string, 0, len(summaryMap))
	for key := range summaryMap {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	ordered := make(map[string]*ApprovalRequestSummary, len(summaryMap))
	for _, key := range keys {
		ordered[key] = summaryMap[key]
	}

	return ordered, nil
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

func VerifyAuthCode(ctx context.Context, input VerifyAuthCodeInput, now time.Time) (models.ApprovalRequest, error) {
	return defaultApprovalService.VerifyAuthCode(ctx, input, now)
}

func (service *ApprovalService) VerifyAuthCode(ctx context.Context, input VerifyAuthCodeInput, now time.Time) (models.ApprovalRequest, error) {
	actor, _ := audit.ActorFromContext(ctx)
	if actor.UserID == "" {
		return models.ApprovalRequest{}, errors.New("[CRITICAL] Identity required for auth code verification")
	}
	input.AuthCode = strings.TrimSpace(input.AuthCode)
	if input.AuthCode == "" {
		return models.ApprovalRequest{}, ErrApprovalAuthCodeInvalid
	}
	if contract := service.businessTransactionContracts[input.Module]; contract != nil && !contract.IssuesAuthorizationCode() {
		return models.ApprovalRequest{}, ErrApprovalAuthCodeInvalid
	}

	var request models.ApprovalRequest
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where(
			"module = ? AND action = ? AND target_id = ? AND auth_code = ? AND status = 'APPROVED'",
			input.Module, input.Action, input.TargetID, input.AuthCode,
		).First(&request).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrApprovalAuthCodeInvalid
			}
			return err
		}

		if request.ExpiresAt != nil && now.After(*request.ExpiresAt) {
			return ErrApprovalAuthCodeExpired
		}

		if err := tx.Model(&request).Updates(map[string]interface{}{
			"status":      "VERIFIED",
			"verifier_id": actor.UserID,
		}).Error; err != nil {
			return err
		}

		request.Status = "VERIFIED"
		request.VerifierID = actor.UserID
		request.UpdatedAt = now
		verifyDiff, _ := json.Marshal(map[string]any{
			"module":   input.Module,
			"action":   input.Action,
			"targetId": input.TargetID,
		})
		return recordLegacyAuditEntryWithContext(ctx, tx, "ApprovalRequest", request.ID, "verify_code", verifyDiff)
	})
	if err != nil {
		return models.ApprovalRequest{}, err
	}

	return request, nil
}
