package services

import (
	"errors"
	"strings"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func validateQualityStandardInspectionStageReferencesWithinTransaction(tx *gorm.DB, items []qualityStandardInspectionCriterion) error {
	itemIDOccurrences := make(map[string]int)
	for _, item := range items {
		itemIDOccurrences[item.ID]++
	}
	for _, item := range items {
		if item.InspectionStageID == "" {
			return domainValidationError("每个重量项目必须关联检验站")
		}
		if strings.TrimSpace(item.ID) == "" || itemIDOccurrences[item.ID] != 1 {
			return domainValidationError("关联检验站的检验项目必须具有唯一的项目标识")
		}
		if _, err := uuid.Parse(item.InspectionStageID); err != nil {
			return domainValidationError("检验站 ID 无效")
		}
		var stage models.QualityInspectionStage
		if err := tx.Clauses(clause.Locking{Strength: "SHARE"}).First(&stage, "id = ?", item.InspectionStageID).Error; errors.Is(err, gorm.ErrRecordNotFound) {
			return domainValidationError("检验站不存在，请刷新检验站目录后重试")
		} else if err != nil {
			return err
		}
		if !stage.Active {
			return domainValidationError("已停用的检验站不能用于保存或提交审批，请选择启用的检验站")
		}
		if strings.TrimSpace(item.InspectionStageName) == "" || item.InspectionStageName != stage.Name {
			return domainValidationError("检验站名称已变化，请重新选择检验站后保存")
		}
	}
	return nil
}
