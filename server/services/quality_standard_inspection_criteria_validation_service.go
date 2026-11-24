package services

import (
	"errors"
	"fmt"
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func validateQualityStandardInspectionCriteriaWithinTransaction(tx *gorm.DB, standard models.InspectionStandard) error {
	var items []qualityStandardInspectionCriterion
	if len(standard.Items) > 0 {
		var err error
		items, err = decodeQualityStandardWeightInspectionCriteria(standard.Items)
		if err != nil {
			return err
		}
	}
	if standard.Status == "PENDING_APPROVAL" && len(items) == 0 {
		return domainValidationError("提交品质标准审批前必须配置检验项目")
	}
	if err := validateQualityStandardInspectionStageReferencesWithinTransaction(tx, items); err != nil {
		return err
	}
	itemIDs := map[string]bool{}
	for index, item := range items {
		if strings.TrimSpace(item.ID) == "" || itemIDs[item.ID] {
			return domainValidationError("检验项目必须具有唯一的项目标识")
		}
		itemIDs[item.ID] = true
		if strings.TrimSpace(item.Name) == "" {
			return domainValidationError(fmt.Sprintf("第 %d 个检验项目名称不能为空", index+1))
		}
		if item.CenterValue != nil && item.Unit == "" {
			return domainValidationError("中心值检验项目必须选择系统配置的单位")
		}
		if item.Unit != "" {
			var unit models.Unit
			if err := tx.Clauses(clause.Locking{Strength: "SHARE"}).First(&unit, "code = ? AND status = ?", item.Unit, "active").Error; errors.Is(err, gorm.ErrRecordNotFound) {
				return domainValidationError("检验项目单位不存在或已停用，请重新选择系统单位")
			} else if err != nil {
				return err
			}
		}
		if err := validateQualityInspectionCriterionGrading(item); err != nil {
			return err
		}
	}
	return nil
}
