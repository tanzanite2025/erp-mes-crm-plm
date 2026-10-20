package services

import (
	"context"
	"time"
	"xdfc-server/models"

	"gorm.io/gorm"
)

// ApprovalBusinessTransactionContract lets a business domain validate request
// creation and consume decisions inside the approval transaction. The shared
// approval engine owns node permissions and progression, never domain states.
type ApprovalBusinessTransactionContract interface {
	ValidateStandaloneRequest(input RequestApprovalInput) error
	ValidateRequestWithinTransaction(ctx context.Context, tx *gorm.DB, input RequestApprovalInput) error
	ApplyDecisionWithinTransaction(ctx context.Context, tx *gorm.DB, request models.ApprovalRequest, comment string, now time.Time) error
	IssuesAuthorizationCode() bool
	NotificationDestination(request models.ApprovalRequest) ApprovalBusinessNotificationDestination
}

type ApprovalBusinessNotificationDestination struct {
	SourceCode string
	ActionURL  string
}

type ApprovalService struct {
	businessTransactionContracts map[string]ApprovalBusinessTransactionContract
}

func NewApprovalServiceWithBusinessTransactionContracts(contracts map[string]ApprovalBusinessTransactionContract) *ApprovalService {
	service := &ApprovalService{businessTransactionContracts: make(map[string]ApprovalBusinessTransactionContract, len(contracts))}
	for module, contract := range contracts {
		service.businessTransactionContracts[module] = contract
	}
	return service
}

func (service *ApprovalService) assignFinalDecisionAuthorizationCode(request *models.ApprovalRequest, input ApproveRequestInput, now time.Time, generateCode func() string) {
	request.AuthCode, request.ExpiresAt = "", nil
	if contract := service.businessTransactionContracts[request.Module]; contract != nil && !contract.IssuesAuthorizationCode() {
		return
	}
	request.AuthCode = input.AuthCode
	if request.AuthCode == "" && generateCode != nil {
		request.AuthCode = generateCode()
	}
	expiresAt := now.Add(time.Hour)
	request.ExpiresAt = &expiresAt
}
