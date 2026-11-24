package db

import (
	"strings"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// EnsureDefaultQualityInspectionStages persists the default quality inspection
// stations without overwriting names, ordering or activation maintained by users.
func EnsureDefaultQualityInspectionStages(database *gorm.DB) error {
	return database.Transaction(func(tx *gorm.DB) error {
		for _, configuredStage := range models.DefaultQualityInspectionStages {
			stage := configuredStage
			stage.ID = uuid.NewString()
			stage.NormalizedName = strings.ToLower(stage.Name)
			if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&stage).Error; err != nil {
				return err
			}
		}
		return nil
	})
}
