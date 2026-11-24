package services

import (
	"encoding/json"
	"errors"
	"xdfc-server/repositories"
)

var (
	ErrProductionLineVersionConflict                   = errors.New("production line version conflict")
	ErrInvalidProductionLineSegmentOwnership           = errors.New("invalid production line L2 ownership")
	ErrInvalidProductionLineTemplate                   = errors.New("invalid production line product template")
	ErrInvalidProductionLineBOMBranch                  = errors.New("invalid production line MBOM branch")
	ErrInvalidProductionPlanBOMBranch                  = errors.New("invalid production plan MBOM branch")
	ErrInvalidProductionBOMBranchOperation             = errors.New("invalid production MBOM branch operation")
	ErrProductionBOMBranchOperationSelectionConflict   = errors.New("production MBOM branch operation selection is referenced")
	ErrProductionBOMBranchOperationDeactivationBlocked = errors.New("production MBOM branch operation deactivation is blocked")
	ErrInvalidProductionWorkLocation                   = errors.New("invalid production work location")
	ErrProductionWorkLocationVersionConflict           = errors.New("production work location version conflict")
	ErrProductionRouteVersionConflict                  = errors.New("production route version conflict")
	ErrProductionRouteRevisionConflict                 = errors.New("production route revision conflict")
	ErrInvalidProductionRoute                          = errors.New("invalid production route")
	ErrInvalidProcessStep                              = errors.New("invalid process step")
	ErrProductionTopologyUnauthorized                  = errors.New("production topology unauthorized")
	ErrProductionRouteImmutable                        = errors.New("production route is immutable")
	ErrProductionRouteDeleteBlocked                    = errors.New("production route deletion is blocked")
	ErrInvalidProductionRouteStatus                    = errors.New("invalid production route status transition")
	ErrProductionProcessLibraryReferenceConflict       = errors.New("production process library entry is referenced")
)

type SaveProductionLineRequest struct {
	Line     ProductionLineDTO
	AuthCode string
	Operator string
	IP       string
}

type PatchProductionLineRequest struct {
	ID       string
	Delta    map[string]json.RawMessage
	Version  int64
	AuthCode string
	Operator string
	IP       string
}

type SaveProductionRouteRequest struct {
	Route    ProductionRouteDTO
	Operator string
	IP       string
}

type SaveProcessStepRequest struct {
	Step     ProcessStepDTO
	Operator string
	IP       string
}

type SaveProductionBOMBranchOperationRequest struct {
	Operation ProductionBOMBranchOperationDTO
	Operator  string
	IP        string
}

type SaveProductionBOMBranchOperationSelectionRequest struct {
	ProductID          string
	BOMOwnerType       string
	BOMOwnerCustomerID string
	BOMVersionLevel    string
	ProcessLibraryIDs  []string
	Operator           string
	IP                 string
}

type ProductionService struct {
	txManager        transactionManager
	repository       repositories.ProductionRepository
	systemConfigRepo repositories.SystemConfigRepository
}

func NewProductionService(
	txManager transactionManager,
	repository repositories.ProductionRepository,
	systemConfigRepo repositories.SystemConfigRepository,
) *ProductionService {
	return &ProductionService{
		txManager:        txManager,
		repository:       repository,
		systemConfigRepo: systemConfigRepo,
	}
}

var defaultProductionRuntime = defaultServiceRuntime()

var defaultProductionService = NewProductionService(
	defaultProductionRuntime.txManager,
	repositories.NewProductionRepository(),
	repositories.NewSystemConfigRepository(),
)
