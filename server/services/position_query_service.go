package services

func (s *OrganizationService) ListPositions() ([]PositionListItemResponse, error) {
	positions, err := s.repository.ListPositions(s.txManager.DB())
	if err != nil {
		return nil, err
	}
	return MapPositionsToListItemResponse(positions), nil
}
