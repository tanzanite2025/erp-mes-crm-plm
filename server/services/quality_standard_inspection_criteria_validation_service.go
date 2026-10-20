package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type qualityStandardInspectionCriterion struct {
	Name        string   `json:"name"`
	CenterValue *float64 `json:"centerValue"`
	Unit        string   `json:"unit"`
	Levels      []struct {
		Level                 string   `json:"level"`
		Tolerance             *float64 `json:"tolerance"`
		DeviationMinExclusive *float64 `json:"deviationMinExclusive"`
		Min                   *float64 `json:"min"`
		Max                   *float64 `json:"max"`
	} `json:"levels"`
}

func validateQualityStandardInspectionCriteriaWithinTransaction(tx *gorm.DB, standard models.InspectionStandard) error {
	var items []qualityStandardInspectionCriterion
	if len(standard.Items) > 0 && json.Unmarshal(standard.Items, &items) != nil {
		return domainValidationError("品质标准检验项目格式无效")
	}
	if standard.Status == "PENDING_APPROVAL" && len(items) == 0 {
		return domainValidationError("提交品质标准审批前必须配置检验项目")
	}
	for index, item := range items {
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
		if item.CenterValue == nil {
			continue
		}
		if len(item.Levels) != 3 {
			return domainValidationError("中心值检验项目必须配置 S、A、B 三个等级")
		}
		center := *item.CenterValue
		previousTolerance := 0.0
		for levelIndex, expectedLevel := range []string{"S", "A", "B"} {
			level := item.Levels[levelIndex]
			if level.Level != expectedLevel || level.Tolerance == nil || level.Min == nil || level.Max == nil {
				return domainValidationError("检验等级必须按 S、A、B 配置完整的中心值偏差范围")
			}
			tolerance := *level.Tolerance
			if levelIndex == 0 && tolerance != 0 || levelIndex > 0 && tolerance <= previousTolerance {
				return domainValidationError("S 等级必须等于中心值，且偏差必须满足 0 < A < B")
			}
			if levelIndex > 0 && (level.DeviationMinExclusive == nil || *level.DeviationMinExclusive != previousTolerance) {
				return domainValidationError("A、B 等级的偏差边界不连续")
			}
			if math.IsInf(center-tolerance, 0) || math.IsInf(center+tolerance, 0) || math.Abs(*level.Min-(center-tolerance)) > 1e-9 || math.Abs(*level.Max-(center+tolerance)) > 1e-9 {
				return domainValidationError("检验等级上下限必须以中心值对称计算")
			}
			previousTolerance = tolerance
		}
	}
	return nil
}
