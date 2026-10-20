package services

import (
	"fmt"
	"xdfc-server/models"

	"gorm.io/gorm"
)

func (service *ApprovalService) approvalNotificationDestination(request models.ApprovalRequest) ApprovalBusinessNotificationDestination {
	if contract := service.businessTransactionContracts[request.Module]; contract != nil {
		return contract.NotificationDestination(request)
	}
	return ApprovalBusinessNotificationDestination{SourceCode: "APPROVAL", ActionURL: "/approval/requests"}
}

func (service *ApprovalService) createApprovalNotificationInboxEntryWithinTransaction(tx *gorm.DB, request models.ApprovalRequest) error {
	destination := service.approvalNotificationDestination(request)
	recipient, title, requiresAction := request.RequesterID, "审批申请已通过", false
	switch request.Status {
	case "PENDING":
		recipient, title, requiresAction = request.Approver1ID, "您有一条待审核申请", true
	case "APPROVED_L1":
		recipient, title, requiresAction = request.Approver2ID, "一级审批已通过，请进行二级审批", true
	case "REJECTED":
		title = "审批申请已驳回"
	}
	_, err := CreateSystemNotificationInboxEntryWithinTransaction(tx, SystemNotificationInboxCreationInput{
		RecipientUserID: recipient, SourceCode: destination.SourceCode, BusinessTargetID: request.TargetID, ApprovalRequestID: request.ID,
		EventKey:   fmt.Sprintf("APPROVAL:%s:%s:%d", request.ID, request.Status, request.CurrentLevel),
		PurposeKey: "approval-node-notification", Title: title, Content: request.Reason, ActionURL: destination.ActionURL,
		NotificationType: "SYSTEM_NOTICE", RequiresAction: requiresAction,
		Metadata: map[string]any{"approvalRequestId": request.ID, "module": request.Module, "status": request.Status, "currentLevel": request.CurrentLevel},
	})
	return err
}

func (service *ApprovalService) resolvePreviousApprovalNotificationInboxEntriesWithinTransaction(tx *gorm.DB, request models.ApprovalRequest) error {
	destination := service.approvalNotificationDestination(request)
	return ResolveSystemNotificationInboxEntriesWithinTransaction(tx, SystemNotificationInboxResolutionFilter{SourceCode: destination.SourceCode, ApprovalRequestID: request.ID})
}
