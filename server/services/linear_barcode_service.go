package services

import (
	"fmt"
	"strconv"
	"strings"
	"unicode"
)

var linearBarcodeMonthDisplay = map[string]string{
	"1": "1月",
	"2": "2月",
	"3": "3月",
	"4": "4月",
	"5": "5月",
	"6": "6月",
	"7": "7月",
	"8": "8月",
	"9": "9月",
	"0": "10月",
	"N": "11月",
	"D": "12月",
}

var linearBarcodeMonthNumber = map[string]int{
	"1": 1,
	"2": 2,
	"3": 3,
	"4": 4,
	"5": 5,
	"6": 6,
	"7": 7,
	"8": 8,
	"9": 9,
	"0": 10,
	"N": 11,
	"D": 12,
}

var linearBarcodeHolePrefixDisplay = map[string]string{
	"R": "公路圈",
	"D": "山地圈",
}

// LinearBarcodeSegments describes the fixed-position fields in the 15-char wheel barcode.
type LinearBarcodeSegments struct {
	Year            string `json:"year"`
	MonthCode       string `json:"monthCode"`
	MonthLabel      string `json:"monthLabel"`
	Day             string `json:"day"`
	ModelCode       string `json:"modelCode"`
	AppearanceCode  string `json:"appearanceCode"`
	HolePrefix      string `json:"holePrefix"`
	HolePrefixLabel string `json:"holePrefixLabel"`
	Holes           string `json:"holes"`
	Serial          string `json:"serial"`
}

// LinearBarcodeParseResult is the normalized backend representation used by scan ingest.
type LinearBarcodeParseResult struct {
	Protocol       string                `json:"protocol"`
	RawCode        string                `json:"rawCode"`
	ProductionDate string                `json:"productionDate"`
	Summary        string                `json:"summary"`
	ShortTag       string                `json:"shortTag"`
	Segments       LinearBarcodeSegments `json:"segments"`
}

// ParseLinearBarcode parses the 15-char code128 wheel barcode used by /linear-barcode.
func ParseLinearBarcode(rawCode string) (*LinearBarcodeParseResult, error) {
	code := strings.ToUpper(strings.TrimSpace(rawCode))
	if len(code) != 15 {
		return nil, fmt.Errorf("linear barcode length must be 15 characters")
	}

	for _, ch := range code {
		if unicode.IsSpace(ch) {
			return nil, fmt.Errorf("linear barcode cannot contain whitespace")
		}
	}

	segments := LinearBarcodeSegments{
		Year:           code[0:2],
		MonthCode:      code[2:3],
		Day:            code[3:5],
		ModelCode:      code[5:7],
		AppearanceCode: code[7:8],
		HolePrefix:     code[8:9],
		Holes:          code[9:11],
		Serial:         code[11:15],
	}

	if !allDigits(segments.Year) {
		return nil, fmt.Errorf("linear barcode year must be 2 digits")
	}

	monthNum, ok := linearBarcodeMonthNumber[segments.MonthCode]
	if !ok {
		return nil, fmt.Errorf("linear barcode month code is invalid")
	}
	segments.MonthLabel = linearBarcodeMonthDisplay[segments.MonthCode]

	dayNum, err := strconv.Atoi(segments.Day)
	if err != nil || dayNum < 1 || dayNum > 31 {
		return nil, fmt.Errorf("linear barcode day must be between 01 and 31")
	}

	if !allDigits(segments.ModelCode) {
		return nil, fmt.Errorf("linear barcode model code must be 2 digits")
	}

	if !allDigits(segments.AppearanceCode) {
		return nil, fmt.Errorf("linear barcode appearance code must be numeric")
	}

	holePrefixLabel, ok := linearBarcodeHolePrefixDisplay[segments.HolePrefix]
	if !ok {
		return nil, fmt.Errorf("linear barcode hole prefix must be R or D")
	}
	segments.HolePrefixLabel = holePrefixLabel

	if !allDigits(segments.Holes) {
		return nil, fmt.Errorf("linear barcode holes must be 2 digits")
	}

	if !allDigits(segments.Serial) {
		return nil, fmt.Errorf("linear barcode serial must be 4 digits")
	}

	productionDate := fmt.Sprintf("20%s-%02d-%02d", segments.Year, monthNum, dayNum)
	summary := fmt.Sprintf("20%s%s%s日 型号%s 外观%s %s%s 序号%s",
		segments.Year,
		segments.MonthLabel,
		segments.Day,
		segments.ModelCode,
		segments.AppearanceCode,
		holePrefixLabel,
		segments.Holes,
		segments.Serial,
	)

	return &LinearBarcodeParseResult{
		Protocol:       "linear-wheel-v1",
		RawCode:        code,
		ProductionDate: productionDate,
		Summary:        summary,
		ShortTag:       fmt.Sprintf("%s%s-A%s", segments.HolePrefix, segments.Holes, segments.AppearanceCode),
		Segments:       segments,
	}, nil
}

func allDigits(value string) bool {
	if strings.TrimSpace(value) == "" {
		return false
	}
	for _, ch := range value {
		if !unicode.IsDigit(ch) {
			return false
		}
	}
	return true
}
