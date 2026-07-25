package services

import (
	"context"
	"errors"
	"time"
	"xdfc-server/repositories"
)

var (
	ErrOrganizationNameConflict              = errors.New("organization name conflict")
	ErrOrganizationNameRequired              = errors.New("organization name required")
	ErrOrganizationIDInvalid                 = errors.New("organization id invalid")
	ErrOrganizationParentIDInvalid           = errors.New("organization parent id invalid")
	ErrOrganizationHasChildren               = errors.New("organization has child departments")
	ErrOrganizationHasEmployees              = errors.New("organization has employees")
	ErrOrganizationParentNotFound            = errors.New("organization parent not found")
	ErrOrganizationHierarchyInvalid          = errors.New("organization hierarchy invalid")
	ErrOrganizationDepthExceeded             = errors.New("organization depth exceeded")
	ErrOrganizationLinkedArchitectureInvalid = errors.New("organization linked architecture invalid")
	ErrInvalidEmployeeStatus                 = errors.New("invalid employee status")
	ErrEmptyEmployeeIDs                      = errors.New("employee ids cannot be empty")
)

type OrganizationService struct {
	txManager  transactionManager
	repository repositories.OrganizationRepository
}

func NewOrganizationService(
	txManager transactionManager,
	repository repositories.OrganizationRepository,
) *OrganizationService {
	return &OrganizationService{
		txManager:  txManager,
		repository: repository,
	}
}

var defaultOrganizationRuntime = defaultServiceRuntime()

var defaultOrganizationService = NewOrganizationService(
	defaultOrganizationRuntime.txManager,
	repositories.NewOrganizationRepository(),
)

func ListOrganizationTree() ([]OrganizationTreeNodeResponse, error) {
	return defaultOrganizationService.ListOrganizationTree()
}

func SaveOrganization(ctx context.Context, input OrganizationSaveRequest) (OrganizationSaveResponse, error) {
	return defaultOrganizationService.SaveOrganization(ctx, input)
}

func DeleteOrganization(ctx context.Context, id string) error {
	return defaultOrganizationService.DeleteOrganization(ctx, id)
}

func ListEmployees() ([]EmployeeListItemResponse, error) {
	return defaultOrganizationService.ListEmployees()
}

func ListPositions() ([]PositionListItemResponse, error) {
	return defaultOrganizationService.ListPositions()
}

func GetEmployeeDetail(id string) (EmployeeDetailResponse, error) {
	return defaultOrganizationService.GetEmployeeDetail(id)
}

type BulkUpdateEmployeeStatusResult struct {
	Updated    int64
	OperatedAt time.Time
}

func BulkUpdateEmployeeStatus(ctx context.Context, ids []string, status string) (BulkUpdateEmployeeStatusResult, error) {
	return defaultOrganizationService.BulkUpdateEmployeeStatus(ctx, ids, status)
}

func SaveEmployee(ctx context.Context, input EmployeeSaveRequest) (EmployeeSaveResponse, error) {
	return defaultOrganizationService.SaveEmployee(ctx, input)
}

func PatchOrganization(ctx context.Context, input PatchOrganizationRequest) (OrganizationTreeNodeResponse, error) {
	return defaultOrganizationService.PatchOrganization(ctx, input)
}

func PatchEmployee(ctx context.Context, input PatchEmployeeRequest) (EmployeeListItemResponse, error) {
	return defaultOrganizationService.PatchEmployee(ctx, input)
}

func DeleteEmployees(ctx context.Context, ids []string) error {
	return defaultOrganizationService.DeleteEmployees(ctx, ids)
}

func BulkSyncOrganizations(ctx context.Context, input []BulkSyncOrganizationRequest) (int, error) {
	return defaultOrganizationService.BulkSyncOrganizations(ctx, input)
}

func BulkSyncEmployees(input []BulkSyncEmployeeRequest) (int, error) {
	return defaultOrganizationService.BulkSyncEmployees(input)
}
