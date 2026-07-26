package services

import "xdfc-server/repositories"

type EmployeeQueryService struct {
	txManager  transactionManager
	repository repositories.EmployeeRepository
}

func NewEmployeeQueryService(
	txManager transactionManager,
	repository repositories.EmployeeRepository,
) *EmployeeQueryService {
	return &EmployeeQueryService{
		txManager:  txManager,
		repository: repository,
	}
}

var defaultEmployeeQueryService = NewEmployeeQueryService(
	defaultOrgPersonnelRuntime.txManager,
	repositories.NewEmployeeRepository(),
)

func ListEmployees() ([]EmployeeListItemResponse, error) {
	return defaultEmployeeQueryService.ListEmployees()
}

func GetEmployeeDetail(id string) (EmployeeDetailResponse, error) {
	return defaultEmployeeQueryService.GetEmployeeDetail(id)
}

func (s *EmployeeQueryService) ListEmployees() ([]EmployeeListItemResponse, error) {
	employees, err := s.repository.ListEmployees(s.txManager.DB())
	if err != nil {
		return nil, err
	}
	return MapEmployeesToListItemResponse(employees), nil
}

func (s *EmployeeQueryService) GetEmployeeDetail(id string) (EmployeeDetailResponse, error) {
	employee, err := loadEmployeeAggregate(s.txManager.DB(), id)
	if err != nil {
		return EmployeeDetailResponse{}, err
	}
	return MapEmployeeToDetailResponse(employee), nil
}
