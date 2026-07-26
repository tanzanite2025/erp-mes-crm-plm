package services

import (
	"context"
	"errors"
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
)

type OrganizationService struct {
	txManager  transactionManager
	repository repositories.OrganizationTreeRepository
}

func NewOrganizationService(
	txManager transactionManager,
	repository repositories.OrganizationTreeRepository,
) *OrganizationService {
	return &OrganizationService{
		txManager:  txManager,
		repository: repository,
	}
}

var defaultOrgPersonnelRuntime = defaultServiceRuntime()

var defaultOrganizationService = NewOrganizationService(
	defaultOrgPersonnelRuntime.txManager,
	repositories.NewOrganizationTreeRepository(),
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

func PatchOrganization(ctx context.Context, input PatchOrganizationRequest) (OrganizationTreeNodeResponse, error) {
	return defaultOrganizationService.PatchOrganization(ctx, input)
}

func BulkSyncOrganizations(ctx context.Context, input []BulkSyncOrganizationRequest) (int, error) {
	return defaultOrganizationService.BulkSyncOrganizations(ctx, input)
}
