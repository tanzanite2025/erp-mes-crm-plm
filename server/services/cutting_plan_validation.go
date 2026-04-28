package services

import (
	"encoding/json"
	"errors"
	"math"
	"strconv"
	"strings"
	"xdfc-server/models"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

const (
	cutSizeLibrarySpecType   = "CUT_SIZE_LIBRARY"
	cuttingPlanStatusDraft   = "Draft"
	cuttingPlanStatusActive  = "Active"
	cuttingPlanStatusArchive = "Archived"
)

type CuttingPlanValidationError struct {
	Message string
}

func (e *CuttingPlanValidationError) Error() string {
	return e.Message
}

type cuttingPlanConstraintProfile struct {
	RollGroupKey      string   `json:"rollGroupKey"`
	OrderSequence     string   `json:"orderSequence"`
	YarnDirectionMode string   `json:"yarnDirectionMode"`
	ProcessTags       []string `json:"processTags"`
	NoteKeywords      []string `json:"noteKeywords"`
}

type cuttingPlanLinePayload struct {
	ID                     string                       `json:"id"`
	SequenceNo             int                          `json:"sequenceNo"`
	RollOrder              string                       `json:"rollOrder"`
	YarnDirection          string                       `json:"yarnDirection"`
	CutSizeID              string                       `json:"cutSizeId"`
	CutSizeCode            string                       `json:"cutSizeCode"`
	CutSizeName            string                       `json:"cutSizeName"`
	SizeExpression         string                       `json:"sizeExpression"`
	RequiredSets           string                       `json:"requiredSets"`
	Priority               string                       `json:"priority"`
	MustFulfill            *bool                        `json:"mustFulfill"`
	AllowMixedPlan         *bool                        `json:"allowMixedPlan"`
	FAW                    string                       `json:"faw"`
	WeightG                string                       `json:"weightG"`
	AreaM2                 string                       `json:"areaM2"`
	OperationNote          string                       `json:"operationNote"`
	ConstraintProfile      cuttingPlanConstraintProfile `json:"constraintProfile"`
	ManualGroupBreakBefore *bool                        `json:"manualGroupBreakBefore"`
}

type cuttingPlanPayload struct {
	Name                      string                   `json:"name"`
	ProductID                 string                   `json:"productId"`
	ProductCode               string                   `json:"productCode"`
	ProductName               string                   `json:"productName"`
	HoleCount                 string                   `json:"holeCount"`
	DocumentNo                string                   `json:"documentNo"`
	RevisionNo                string                   `json:"revisionNo"`
	EffectiveDate             string                   `json:"effectiveDate"`
	CarbonFiberModel          string                   `json:"carbonFiberModel"`
	ResinModel                string                   `json:"resinModel"`
	ResinContentPercent       string                   `json:"resinContentPercent"`
	PrepregSpecID             string                   `json:"prepregSpecId"`
	PrepregSpecLabel          string                   `json:"prepregSpecLabel"`
	TotalInnerMaterialWeightG string                   `json:"totalInnerMaterialWeightG"`
	TotalMaterialWeightG      string                   `json:"totalMaterialWeightG"`
	Status                    string                   `json:"status"`
	Lines                     []cuttingPlanLinePayload `json:"lines"`
	Version                   int                      `json:"version"`
}

type cutSizeLibraryPayload struct {
	Code          string `json:"code"`
	Name          string `json:"name"`
	WidthMM       string `json:"widthMm"`
	LengthMM      string `json:"lengthMm"`
	PieceCount    string `json:"pieceCount"`
	AreaM2        string `json:"areaM2"`
	AreaWeightGsm string `json:"areaWeightGsm"`
	WeightG       string `json:"weightG"`
	Status        string `json:"status"`
}

type cuttingPlanCutSizeSnapshot struct {
	Code           string
	Name           string
	SizeExpression string
	FAW            string
	WeightG        string
	AreaM2         string
}

func validateAndNormalizeCuttingPlanSpec(tx *gorm.DB, input *models.EngineeringSpec) error {
	payload, err := parseCuttingPlanPayload(input.CuttingData)
	if err != nil {
		return err
	}

	normalizeCuttingPlanPayload(&payload)
	if err := validateCuttingPlanPayload(tx, &payload); err != nil {
		return err
	}

	normalizedPayload, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	input.Name = payload.Name
	input.CuttingData = datatypes.JSON(normalizedPayload)
	input.Active = payload.Status != cuttingPlanStatusArchive
	return nil
}

func parseCuttingPlanPayload(raw datatypes.JSON) (cuttingPlanPayload, error) {
	if len(raw) == 0 {
		return cuttingPlanPayload{}, &CuttingPlanValidationError{Message: "裁纱单缺少 cuttingData 载荷"}
	}

	var payload cuttingPlanPayload
	if err := json.Unmarshal(raw, &payload); err != nil {
		return cuttingPlanPayload{}, &CuttingPlanValidationError{Message: "裁纱单载荷格式错误"}
	}

	return payload, nil
}

func normalizeCuttingPlanPayload(payload *cuttingPlanPayload) {
	payload.Name = strings.TrimSpace(payload.Name)
	payload.ProductID = strings.TrimSpace(payload.ProductID)
	payload.ProductCode = strings.TrimSpace(payload.ProductCode)
	payload.ProductName = strings.TrimSpace(payload.ProductName)
	payload.HoleCount = strings.TrimSpace(payload.HoleCount)
	payload.DocumentNo = strings.TrimSpace(payload.DocumentNo)
	payload.RevisionNo = strings.TrimSpace(payload.RevisionNo)
	payload.EffectiveDate = strings.TrimSpace(payload.EffectiveDate)
	payload.CarbonFiberModel = strings.TrimSpace(payload.CarbonFiberModel)
	payload.ResinModel = strings.TrimSpace(payload.ResinModel)
	payload.ResinContentPercent = strings.TrimSpace(payload.ResinContentPercent)
	payload.PrepregSpecID = strings.TrimSpace(payload.PrepregSpecID)
	payload.PrepregSpecLabel = strings.TrimSpace(payload.PrepregSpecLabel)
	payload.TotalInnerMaterialWeightG = strings.TrimSpace(payload.TotalInnerMaterialWeightG)
	payload.TotalMaterialWeightG = strings.TrimSpace(payload.TotalMaterialWeightG)
	payload.Status = normalizeCuttingPlanStatus(payload.Status)
	if payload.Version <= 0 {
		payload.Version = 1
	}

	for index := range payload.Lines {
		line := &payload.Lines[index]
		line.ID = strings.TrimSpace(line.ID)
		line.SequenceNo = index + 1
		line.RollOrder = strings.TrimSpace(line.RollOrder)
		line.YarnDirection = strings.TrimSpace(line.YarnDirection)
		line.CutSizeID = strings.TrimSpace(line.CutSizeID)
		line.CutSizeCode = strings.TrimSpace(line.CutSizeCode)
		line.CutSizeName = strings.TrimSpace(line.CutSizeName)
		line.SizeExpression = strings.TrimSpace(line.SizeExpression)
		line.RequiredSets = strings.TrimSpace(line.RequiredSets)
		if line.RequiredSets == "" {
			line.RequiredSets = "1"
		}
		line.Priority = strings.TrimSpace(line.Priority)
		line.FAW = strings.TrimSpace(line.FAW)
		line.WeightG = strings.TrimSpace(line.WeightG)
		line.AreaM2 = strings.TrimSpace(line.AreaM2)
		line.OperationNote = strings.TrimSpace(line.OperationNote)
		line.ConstraintProfile.RollGroupKey = strings.TrimSpace(line.ConstraintProfile.RollGroupKey)
		line.ConstraintProfile.OrderSequence = strings.TrimSpace(line.ConstraintProfile.OrderSequence)
		line.ConstraintProfile.YarnDirectionMode = strings.TrimSpace(line.ConstraintProfile.YarnDirectionMode)
		line.ConstraintProfile.ProcessTags = normalizeCuttingPlanStringList(line.ConstraintProfile.ProcessTags)
		line.ConstraintProfile.NoteKeywords = normalizeCuttingPlanStringList(line.ConstraintProfile.NoteKeywords)
		if line.MustFulfill == nil {
			defaultValue := true
			line.MustFulfill = &defaultValue
		}
		if line.AllowMixedPlan == nil {
			defaultValue := false
			line.AllowMixedPlan = &defaultValue
		}
		if line.ManualGroupBreakBefore == nil {
			defaultValue := false
			line.ManualGroupBreakBefore = &defaultValue
		}
	}
}

func validateCuttingPlanPayload(tx *gorm.DB, payload *cuttingPlanPayload) error {
	if payload.ProductID == "" {
		return &CuttingPlanValidationError{Message: "裁纱单必须绑定产品型号"}
	}
	if payload.HoleCount == "" {
		return &CuttingPlanValidationError{Message: "裁纱单必须填写孔数"}
	}
	if len(payload.Lines) == 0 {
		return &CuttingPlanValidationError{Message: "裁纱单至少需要一条裁片明细"}
	}
	if payload.Status == "" {
		return &CuttingPlanValidationError{Message: "裁纱单状态不能为空"}
	}

	product, err := loadCuttingPlanProduct(tx, payload.ProductID)
	if err != nil {
		return err
	}
	payload.ProductCode = strings.TrimSpace(product.SKU)
	payload.ProductName = strings.TrimSpace(product.Name)

	payload.Name = buildValidatedCuttingPlanName(payload.ProductName, payload.ProductCode, payload.HoleCount)
	if payload.Name == "" {
		return &CuttingPlanValidationError{Message: "裁纱单名称生成失败，请检查产品型号和孔数"}
	}

	if payload.PrepregSpecID != "" {
		if err := ensureCuttingPlanPrepregSpecActive(tx, payload.PrepregSpecID); err != nil {
			return err
		}
	}

	for index := range payload.Lines {
		line := &payload.Lines[index]
		if line.ID == "" {
			return &CuttingPlanValidationError{Message: "裁纱单明细缺少行 ID"}
		}
		if line.CutSizeID == "" {
			return &CuttingPlanValidationError{Message: "裁纱单第 " + strconv.Itoa(index+1) + " 行未绑定尺寸库条目"}
		}

		unit, err := loadCutSizeLibraryPayload(tx, line.CutSizeID)
		if err != nil {
			return &CuttingPlanValidationError{Message: "裁纱单第 " + strconv.Itoa(index+1) + " 行引用的尺寸库条目不存在或未启用"}
		}
		snapshot := buildCuttingPlanCutSizeSnapshot(unit)
		line.CutSizeCode = snapshot.Code
		line.CutSizeName = snapshot.Name
		line.SizeExpression = snapshot.SizeExpression
		line.FAW = snapshot.FAW
		line.WeightG = snapshot.WeightG
		line.AreaM2 = snapshot.AreaM2
	}

	return nil
}

func loadCuttingPlanProduct(tx *gorm.DB, productID string) (models.Product, error) {
	var product models.Product
	err := tx.Select("id", "sku", "name", "status").Where("id = ?", productID).First(&product).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.Product{}, &CuttingPlanValidationError{Message: "裁纱单绑定的产品不存在，请重新选择"}
	}
	if err != nil {
		return models.Product{}, err
	}

	status := strings.TrimSpace(product.Status)
	if strings.EqualFold(status, "Archived") || strings.EqualFold(status, "Deleted") {
		return models.Product{}, &CuttingPlanValidationError{Message: "裁纱单绑定的产品已失效，请重新选择"}
	}
	return product, nil
}

func ensureCuttingPlanPrepregSpecActive(tx *gorm.DB, prepregSpecID string) error {
	var spec models.PrepregMaterialSpec
	err := tx.Select("id", "status").Where("id = ?", prepregSpecID).First(&spec).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return &CuttingPlanValidationError{Message: "裁纱单引用的预浸料规格不存在，请重新选择"}
	}
	if err != nil {
		return err
	}
	if strings.TrimSpace(spec.Status) != cuttingPlanStatusActive {
		return &CuttingPlanValidationError{Message: "裁纱单引用的预浸料规格未启用，请重新选择"}
	}
	return nil
}

func loadCutSizeLibraryPayload(tx *gorm.DB, cutSizeID string) (cutSizeLibraryPayload, error) {
	var spec models.EngineeringSpec
	err := tx.Select("id", "name", "code", "type", "cutting_data").Where("id = ? AND type = ?", cutSizeID, cutSizeLibrarySpecType).First(&spec).Error
	if err != nil {
		return cutSizeLibraryPayload{}, err
	}

	var payload cutSizeLibraryPayload
	if len(spec.CuttingData) > 0 {
		if err := json.Unmarshal(spec.CuttingData, &payload); err != nil {
			return cutSizeLibraryPayload{}, err
		}
	}
	payload.Code = firstNonEmptyCuttingPlanValue(strings.TrimSpace(payload.Code), strings.TrimSpace(spec.Code))
	payload.Name = firstNonEmptyCuttingPlanValue(strings.TrimSpace(payload.Name), strings.TrimSpace(spec.Name))
	payload.Status = firstNonEmptyCuttingPlanValue(strings.TrimSpace(payload.Status), cuttingPlanStatusActive)
	if payload.Status != cuttingPlanStatusActive {
		return cutSizeLibraryPayload{}, gorm.ErrRecordNotFound
	}
	return payload, nil
}

func buildCuttingPlanCutSizeSnapshot(unit cutSizeLibraryPayload) cuttingPlanCutSizeSnapshot {
	areaM2 := firstNonEmptyCuttingPlanValue(strings.TrimSpace(unit.AreaM2), deriveCuttingPlanAreaM2(unit.WidthMM, unit.LengthMM, unit.PieceCount))
	weightG := firstNonEmptyCuttingPlanValue(strings.TrimSpace(unit.WeightG), deriveCuttingPlanWeightG(unit.WidthMM, unit.LengthMM, unit.PieceCount, areaM2, unit.AreaWeightGsm))
	return cuttingPlanCutSizeSnapshot{
		Code:           strings.TrimSpace(unit.Code),
		Name:           strings.TrimSpace(unit.Name),
		SizeExpression: buildCuttingPlanSizeExpression(unit.WidthMM, unit.LengthMM, unit.PieceCount),
		FAW:            strings.TrimSpace(unit.AreaWeightGsm),
		WeightG:        weightG,
		AreaM2:         areaM2,
	}
}

func normalizeCuttingPlanStatus(raw string) string {
	switch strings.TrimSpace(raw) {
	case cuttingPlanStatusActive:
		return cuttingPlanStatusActive
	case cuttingPlanStatusArchive:
		return cuttingPlanStatusArchive
	default:
		return cuttingPlanStatusDraft
	}
}

func buildValidatedCuttingPlanName(productName string, productCode string, holeCount string) string {
	model := firstNonEmptyCuttingPlanValue(strings.TrimSpace(productName), strings.TrimSpace(productCode))
	hole := strings.TrimSpace(holeCount)
	if model == "" || hole == "" {
		return ""
	}
	return model + "-" + hole + "孔裁纱单"
}

func normalizeCuttingPlanStringList(values []string) []string {
	if len(values) == 0 {
		return []string{}
	}
	result := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		result = append(result, trimmed)
	}
	return result
}

func buildCuttingPlanSizeExpression(widthMM string, lengthMM string, pieceCount string) string {
	width := strings.TrimSpace(widthMM)
	length := strings.TrimSpace(lengthMM)
	count := firstNonEmptyCuttingPlanValue(strings.TrimSpace(pieceCount), "1")
	if width == "" || length == "" {
		return ""
	}
	return width + "x" + length + "x" + count
}

func deriveCuttingPlanAreaM2(widthMM string, lengthMM string, pieceCount string) string {
	width := parseCuttingPlanPositiveNumber(widthMM)
	length := parseCuttingPlanPositiveNumber(lengthMM)
	count := parseCuttingPlanPositiveNumber(firstNonEmptyCuttingPlanValue(pieceCount, "1"))
	if width == 0 || length == 0 || count == 0 {
		return ""
	}
	area := (width * length * count) / 1000000
	return formatCuttingPlanPositiveNumber(area, 6)
}

func deriveCuttingPlanWeightG(widthMM string, lengthMM string, pieceCount string, areaM2 string, areaWeightGsm string) string {
	area := parseCuttingPlanPositiveNumber(areaM2)
	if area == 0 {
		area = parseCuttingPlanPositiveNumber(deriveCuttingPlanAreaM2(widthMM, lengthMM, pieceCount))
	}
	faw := parseCuttingPlanPositiveNumber(areaWeightGsm)
	if area == 0 || faw == 0 {
		return ""
	}
	weight := area * faw
	return formatCuttingPlanPositiveNumber(weight, 3)
}

func parseCuttingPlanPositiveNumber(raw string) float64 {
	value := strings.TrimSpace(raw)
	if value == "" {
		return 0
	}
	parsed, err := strconv.ParseFloat(value, 64)
	if err != nil || parsed <= 0 {
		return 0
	}
	return parsed
}

func formatCuttingPlanPositiveNumber(value float64, digits int) string {
	if value <= 0 {
		return ""
	}
	factor := math.Pow(10, float64(digits))
	rounded := math.Round(value*factor) / factor
	return strconv.FormatFloat(rounded, 'f', -1, 64)
}

func firstNonEmptyCuttingPlanValue(values ...string) string {
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed != "" {
			return trimmed
		}
	}
	return ""
}
