package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"math/big"
	"strconv"
	"strings"
)

// Rules are stored with each standard item. Evaluation never consults a mutable
// grade catalog or treats a failed measurement as a scrap disposition.
type qualityInspectionGradeRule struct {
	Level          string   `json:"level"`
	LowerTolerance *float64 `json:"lowerTolerance,omitempty"`
	UpperTolerance *float64 `json:"upperTolerance,omitempty"`
	Result         string   `json:"result,omitempty"`
}

type qualityStandardInspectionCriterion struct {
	ID                  string                       `json:"id"`
	InspectionStageID   string                       `json:"inspectionStageId"`
	InspectionStageName string                       `json:"inspectionStageName"`
	Name                string                       `json:"name"`
	Order               int                          `json:"order"`
	CenterValue         *float64                     `json:"centerValue"`
	Unit                string                       `json:"unit"`
	IsRequired          *bool                        `json:"isRequired"`
	GradingMode         string                       `json:"gradingMode,omitempty"`
	Levels              []qualityInspectionGradeRule `json:"levels"`
	Remarks             string                       `json:"remarks"`
}

func decodeQualityStandardWeightInspectionCriteria(itemsJSON json.RawMessage) ([]qualityStandardInspectionCriterion, error) {
	decoder := json.NewDecoder(bytes.NewReader(itemsJSON))
	decoder.DisallowUnknownFields()
	var items []qualityStandardInspectionCriterion
	if err := decoder.Decode(&items); err != nil {
		return nil, domainValidationError("品质标准检验项目格式无效，请使用检验站、重量和上下偏差等级规则")
	}
	if err := decoder.Decode(&struct{}{}); err != io.EOF {
		return nil, domainValidationError("品质标准检验项目格式无效")
	}
	// Go accepts null for scalar fields, while the standard read contract rejects
	// it. Omitted optional fields are valid; explicit null must fail before save.
	var suppliedFields []map[string]json.RawMessage
	if err := json.Unmarshal(itemsJSON, &suppliedFields); err != nil {
		return nil, domainValidationError("品质标准检验项目格式无效")
	}
	for _, fields := range suppliedFields {
		// encoding/json matches struct fields case-insensitively. The saved JSON
		// is read by a case-sensitive schema, so require the exact wire names.
		for field := range fields {
			switch field {
			case "id", "inspectionStageId", "inspectionStageName", "name", "order", "centerValue", "unit", "isRequired", "gradingMode", "levels", "remarks":
			default:
				return nil, domainValidationError("品质标准检验项目格式无效，请使用准确的字段名称")
			}
		}
		var grades []map[string]json.RawMessage
		if err := json.Unmarshal(fields["levels"], &grades); err != nil {
			return nil, domainValidationError("品质标准检验项目格式无效")
		}
		for _, grade := range grades {
			for field := range grade {
				switch field {
				case "level", "lowerTolerance", "upperTolerance", "result":
				default:
					return nil, domainValidationError("品质标准检验项目格式无效，请使用准确的等级字段名称")
				}
			}
		}
		for field, label := range map[string]string{"order": "项目顺序", "isRequired": "必检标记", "remarks": "项目说明"} {
			if bytes.Equal(bytes.TrimSpace(fields[field]), []byte("null")) {
				return nil, domainValidationError(label + "不能为空值，请填写有效值或省略该字段")
			}
		}
	}
	return items, nil
}

func validateQualityInspectionCriterionGrading(item qualityStandardInspectionCriterion) error {
	if item.GradingMode != "DEVIATION_BANDS" {
		return domainValidationError("检验项目必须使用上下偏差等级规则")
	}
	if item.CenterValue == nil {
		return domainValidationError("重量项目必须配置中心值")
	}
	if !isFiniteQualityMeasurementNumber(*item.CenterValue) || len(item.Levels) == 0 || len(item.Levels) > 20 {
		return domainValidationError("检验项目必须配置有效中心值和 1 至 20 个等级")
	}
	names := map[string]bool{}
	previousLower, previousUpper := -1.0, -1.0
	hasFailGrade := false
	for index, level := range item.Levels {
		name := strings.TrimSpace(level.Level)
		if name == "" || name != level.Level || len([]rune(name)) > 40 || names[strings.ToUpper(name)] {
			return domainValidationError("等级名称不能为空、重复或超过 40 个字符")
		}
		names[strings.ToUpper(name)] = true
		if level.Result != "PASS" && level.Result != "FAIL" {
			return domainValidationError("等级判定必须为合格或不合格")
		}
		if hasFailGrade && level.Result != "FAIL" {
			return domainValidationError("不合格等级之后不能配置合格等级")
		}
		if level.Result == "FAIL" {
			hasFailGrade = true
		}
		if level.LowerTolerance == nil || level.UpperTolerance == nil {
			return domainValidationError("每个等级必须填写上下允许偏差")
		}
		lower, upper := *level.LowerTolerance, *level.UpperTolerance
		if !isFiniteQualityMeasurementNumber(lower) || !isFiniteQualityMeasurementNumber(upper) || lower < 0 || upper < 0 || !isFiniteQualityMeasurementNumber(*item.CenterValue-lower) || !isFiniteQualityMeasurementNumber(*item.CenterValue+upper) {
			return domainValidationError("等级上下偏差必须是有限的非负数")
		}
		if index > 0 && (lower <= previousLower || upper <= previousUpper) {
			return domainValidationError("等级上下允许偏差必须分别逐级递增")
		}
		if lower > 0 && *item.CenterValue-lower >= *item.CenterValue || upper > 0 && *item.CenterValue+upper <= *item.CenterValue {
			return domainValidationError("中心值与偏差精度无法表示，请调整数值")
		}
		previousLower, previousUpper = lower, upper
	}
	return nil
}

func isFiniteQualityMeasurementNumber(value float64) bool {
	return !math.IsInf(value, 0) && !math.IsNaN(value)
}

type qualityInspectionMeasurement struct {
	ItemID string   `json:"itemId"`
	Value  *float64 `json:"value"`
	Unit   string   `json:"unit"`
}
type qualityInspectionMeasurementInput struct {
	Measurements []qualityInspectionMeasurement `json:"measurements"`
}
type qualityInspectionItemEvaluation struct {
	ItemID   string  `json:"itemId"`
	ItemName string  `json:"itemName"`
	Value    float64 `json:"value"`
	Unit     string  `json:"unit"`
	Grade    string  `json:"grade,omitempty"`
	Result   string  `json:"result"`
}

// Decimal rational comparison avoids classifying 0.3 - 0.1 as greater than 0.2.
func qualityMeasurementDecimal(value float64) *big.Rat {
	result, _ := new(big.Rat).SetString(strconv.FormatFloat(value, 'f', -1, 64))
	return result
}

func evaluateQualityInspectionMeasurements(itemsJSON, inputJSON json.RawMessage) (string, json.RawMessage, error) {
	items, err := decodeQualityStandardWeightInspectionCriteria(itemsJSON)
	if err != nil {
		return "", nil, err
	}
	if len(items) == 0 {
		return "", nil, domainValidationError("标准没有可执行的检验项目")
	}
	var input qualityInspectionMeasurementInput
	if err := json.Unmarshal(inputJSON, &input); err != nil || len(input.Measurements) == 0 {
		return "", nil, domainValidationError("必须提交检验项目实测值")
	}
	measurements := map[string]qualityInspectionMeasurement{}
	for _, measured := range input.Measurements {
		if measured.ItemID == "" || measured.Value == nil || !isFiniteQualityMeasurementNumber(*measured.Value) {
			return "", nil, domainValidationError("实测项目和值无效")
		}
		if _, duplicate := measurements[measured.ItemID]; duplicate {
			return "", nil, domainValidationError("同一项目不能重复提交实测值")
		}
		measurements[measured.ItemID] = measured
	}
	evaluations := []qualityInspectionItemEvaluation{}
	knownItems := map[string]bool{}
	result := "PASS"
	for _, item := range items {
		if item.ID == "" || knownItems[item.ID] {
			return "", nil, domainValidationError("标准项目标识无效或重复")
		}
		knownItems[item.ID] = true
		if err := validateQualityInspectionCriterionGrading(item); err != nil {
			return "", nil, err
		}
		measured, exists := measurements[item.ID]
		if !exists {
			if item.IsRequired == nil || *item.IsRequired {
				return "", nil, domainValidationError(fmt.Sprintf("必检项目 %s 缺少实测值", item.Name))
			}
			continue
		}
		if measured.Unit != item.Unit || item.Unit == "" {
			return "", nil, domainValidationError("实测单位与标准不一致，请按标准单位录入")
		}
		evaluation := qualityInspectionItemEvaluation{ItemID: item.ID, ItemName: item.Name, Value: *measured.Value, Unit: measured.Unit, Result: "FAIL"}
		difference := new(big.Rat).Sub(qualityMeasurementDecimal(*measured.Value), qualityMeasurementDecimal(*item.CenterValue))
		negative := difference.Sign() < 0
		difference.Abs(difference)
		for _, level := range item.Levels {
			limit := level.UpperTolerance
			if negative {
				limit = level.LowerTolerance
			}
			if difference.Cmp(qualityMeasurementDecimal(*limit)) <= 0 {
				evaluation.Grade, evaluation.Result = level.Level, level.Result
				break
			}
		}
		if evaluation.Result == "FAIL" {
			result = "FAIL"
		}
		evaluations = append(evaluations, evaluation)
	}
	for id := range measurements {
		if !knownItems[id] {
			return "", nil, domainValidationError("提交了不属于当前标准的实测项目")
		}
	}
	if len(evaluations) == 0 {
		return "", nil, domainValidationError("至少需要一项实测值")
	}
	encoded, err := json.Marshal(evaluations)
	return result, encoded, err
}
