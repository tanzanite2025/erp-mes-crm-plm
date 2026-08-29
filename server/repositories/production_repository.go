package repositories

// ProductionRepository is the compatibility aggregate used by production
// services. Its concrete responsibilities are split by domain below.
type ProductionRepository interface {
	ProductionTopologyRepository
	ProductionRouteRepository
	ProductionProcessRepository
}

type GormProductionRepository struct{}

func NewProductionRepository() ProductionRepository {
	return GormProductionRepository{}
}

var _ ProductionRepository = GormProductionRepository{}
