package services

import "xdfc-server/repositories"

type PositionQueryService struct {
	txManager  transactionManager
	repository repositories.PositionRepository
}

func NewPositionQueryService(
	txManager transactionManager,
	repository repositories.PositionRepository,
) *PositionQueryService {
	return &PositionQueryService{
		txManager:  txManager,
		repository: repository,
	}
}

var defaultPositionQueryService = NewPositionQueryService(
	defaultOrgPersonnelRuntime.txManager,
	repositories.NewPositionRepository(),
)

func ListPositions() ([]PositionListItemResponse, error) {
	return defaultPositionQueryService.ListPositions()
}

func (s *PositionQueryService) ListPositions() ([]PositionListItemResponse, error) {
	positions, err := s.repository.ListPositions(s.txManager.DB())
	if err != nil {
		return nil, err
	}
	return MapPositionsToListItemResponse(positions), nil
}
