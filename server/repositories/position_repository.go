package repositories

import (
	"xdfc-server/models"

	"gorm.io/gorm"
)

func (GormOrganizationRepository) ListPositions(database *gorm.DB) ([]models.Position, error) {
	if database == nil || !database.Migrator().HasTable("positions") {
		return []models.Position{}, nil
	}

	var positions []models.Position
	selectClause := "positions.*"
	query := database.Table("positions")
	if database.Migrator().HasTable("organizations") {
		selectClause += ", organizations.name as org_unit_name"
		query = query.Joins(positionOrganizationJoinClause())
	} else {
		selectClause += ", '' as org_unit_name"
	}

	err := query.
		Select(selectClause).
		Where("positions.deleted_at IS NULL").
		Order("CASE WHEN positions.status = 'active' THEN 0 ELSE 1 END").
		Order("positions.sort_order asc").
		Order("positions.name asc").
		Find(&positions).Error
	return positions, err
}

func positionOrganizationJoinClause() string {
	return "LEFT JOIN organizations ON positions.org_unit_id = organizations.id"
}
