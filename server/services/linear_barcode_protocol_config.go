package services

import "time"

type LinearBarcodeProtocolRule struct {
	ID          string   `json:"id"`
	Range       string   `json:"range"`
	Name        string   `json:"name"`
	Length      int      `json:"length"`
	Description string   `json:"description"`
	Examples    []string `json:"examples"`
	Type        string   `json:"type"`
	IsEditable  bool     `json:"isEditable"`
}

type LinearBarcodeProtocolMockInput struct {
	Year        string `json:"year"`
	Month       string `json:"month"`
	Day         string `json:"day"`
	Model       string `json:"model"`
	Appearance  string `json:"appearance"`
	HolePrefix  string `json:"holePrefix"`
	Holes       string `json:"holes"`
	Serial      string `json:"serial"`
	IsDrainHole bool   `json:"isDrainHole"`
	WheelType   string `json:"wheelType"`
	ScopeCode   string `json:"scopeCode"`
}

type LinearBarcodeIngestDefaults struct {
	Symbology  string  `json:"symbology"`
	Scene      string  `json:"scene"`
	DeviceID   string  `json:"deviceId"`
	ScannedQty float64 `json:"scannedQty"`
	AutoSubmit bool    `json:"autoSubmit"`
}

type LinearBarcodeProtocolConfig struct {
	Version         string                         `json:"version"`
	SequenceRuleKey string                         `json:"sequenceRuleKey"`
	Rules           []LinearBarcodeProtocolRule    `json:"rules"`
	MockInput       LinearBarcodeProtocolMockInput `json:"mockInput"`
	IngestDefaults  LinearBarcodeIngestDefaults    `json:"ingestDefaults"`
}

func defaultLinearBarcodeMonthValue(now time.Time) string {
	month := int(now.Month())
	switch {
	case month <= 9:
		return string(rune('0' + month))
	case month == 10:
		return "0"
	case month == 11:
		return "N"
	default:
		return "D"
	}
}

func DefaultLinearBarcodeProtocolConfig() LinearBarcodeProtocolConfig {
	now := time.Now()

	return LinearBarcodeProtocolConfig{
		Version:         "1",
		SequenceRuleKey: "LINEAR_BARCODE_WHEEL",
		Rules: []LinearBarcodeProtocolRule{
			{ID: "year", Range: "01-02", Name: "生产年份", Length: 2, Description: "年份后两位，例如 2025 -> 25。", Examples: []string{"24", "25", "26"}, Type: "fixed", IsEditable: false},
			{ID: "month", Range: "03", Name: "生产月份", Length: 1, Description: "1-9 代表 1-9 月，0=10 月，N=11 月，D=12 月。", Examples: []string{"1", "9", "0=10月", "N=11月", "D=12月"}, Type: "mapping", IsEditable: false},
			{ID: "day", Range: "04-05", Name: "生产日期", Length: 2, Description: "自然日，范围 01-31。", Examples: []string{"01", "08", "31"}, Type: "fixed", IsEditable: false},
			{ID: "model", Range: "06-07", Name: "产品型号", Length: 2, Description: "与工程库产品型号双向对齐，使用两位型号编码。", Examples: []string{"01", "02", "15"}, Type: "fixed", IsEditable: false},
			{ID: "appearance", Range: "08", Name: "外观代码", Length: 1, Description: "1-9 外观映射，沿用现有外观字典配置。", Examples: []string{"1", "2", "3"}, Type: "mapping", IsEditable: true},
			{ID: "holes", Range: "09-11", Name: "孔型孔数", Length: 3, Description: "使用 R/D + 两位孔数，例如 R14、D18。", Examples: []string{"R14", "R24", "D18", "D32"}, Type: "fixed", IsEditable: false},
			{ID: "serial", Range: "12-15", Name: "流水号", Length: 4, Description: "通过业务编号规则 LINEAR_BARCODE_WHEEL 发号，推荐 pattern={SEQ}、padding=4。", Examples: []string{"0001", "0023", "9999"}, Type: "auto", IsEditable: false},
		},
		MockInput: LinearBarcodeProtocolMockInput{
			Year:        now.Format("06"),
			Month:       defaultLinearBarcodeMonthValue(now),
			Day:         now.Format("02"),
			Model:       "01",
			Appearance:  "1",
			HolePrefix:  "R",
			Holes:       "14",
			Serial:      "0001",
			IsDrainHole: false,
			WheelType:   "H",
			ScopeCode:   "",
		},
		IngestDefaults: LinearBarcodeIngestDefaults{
			Symbology:  "code128",
			Scene:      "general",
			DeviceID:   "PDA-01",
			ScannedQty: 1,
			AutoSubmit: false,
		},
	}
}

func NormalizeLinearBarcodeProtocolConfig(input LinearBarcodeProtocolConfig) LinearBarcodeProtocolConfig {
	defaults := DefaultLinearBarcodeProtocolConfig()

	if input.Version != "" {
		defaults.Version = input.Version
	}
	if input.SequenceRuleKey != "" {
		defaults.SequenceRuleKey = input.SequenceRuleKey
	}
	if len(input.Rules) > 0 {
		defaults.Rules = input.Rules
	}

	if input.MockInput.Year != "" {
		defaults.MockInput.Year = input.MockInput.Year
	}
	if input.MockInput.Month != "" {
		defaults.MockInput.Month = input.MockInput.Month
	}
	if input.MockInput.Day != "" {
		defaults.MockInput.Day = input.MockInput.Day
	}
	if input.MockInput.Model != "" {
		defaults.MockInput.Model = input.MockInput.Model
	}
	if input.MockInput.Appearance != "" {
		defaults.MockInput.Appearance = input.MockInput.Appearance
	}
	if input.MockInput.HolePrefix != "" {
		defaults.MockInput.HolePrefix = input.MockInput.HolePrefix
	}
	if input.MockInput.Holes != "" {
		defaults.MockInput.Holes = input.MockInput.Holes
	}
	if input.MockInput.Serial != "" {
		defaults.MockInput.Serial = input.MockInput.Serial
	}
	defaults.MockInput.IsDrainHole = input.MockInput.IsDrainHole
	if input.MockInput.WheelType != "" {
		defaults.MockInput.WheelType = input.MockInput.WheelType
	}
	defaults.MockInput.ScopeCode = input.MockInput.ScopeCode

	if input.IngestDefaults.Symbology != "" {
		defaults.IngestDefaults.Symbology = input.IngestDefaults.Symbology
	}
	if input.IngestDefaults.Scene != "" {
		defaults.IngestDefaults.Scene = input.IngestDefaults.Scene
	}
	if input.IngestDefaults.DeviceID != "" {
		defaults.IngestDefaults.DeviceID = input.IngestDefaults.DeviceID
	}
	if input.IngestDefaults.ScannedQty > 0 {
		defaults.IngestDefaults.ScannedQty = input.IngestDefaults.ScannedQty
	}
	defaults.IngestDefaults.AutoSubmit = input.IngestDefaults.AutoSubmit

	return defaults
}
