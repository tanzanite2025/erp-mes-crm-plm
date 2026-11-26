package services

import (
	"fmt"
	"strings"
	"time"
)

type WheelTraceLookupRequest struct {
	RawCode                string `json:"rawCode"`
	IncludeTimeline        bool   `json:"includeTimeline"`
	RequestID              string `json:"requestId"`
	OperatorID             string `json:"operatorId"`
	TerminalID             string `json:"terminalId"`
	IncludeResolvedProduct bool   `json:"includeResolvedProduct"`
}

type WheelTraceStage struct {
	Status        string `json:"status"`
	LineID        string `json:"lineId,omitempty"`
	LineCode      string `json:"lineCode,omitempty"`
	LineName      string `json:"lineName,omitempty"`
	SegmentID     string `json:"segmentId,omitempty"`
	SegmentName   string `json:"segmentName,omitempty"`
	ProcessStepID string `json:"processStepId,omitempty"`
	ProcessName   string `json:"processName,omitempty"`
	TeamID        string `json:"teamId,omitempty"`
	TeamName      string `json:"teamName,omitempty"`
	OperatorID    string `json:"operatorId,omitempty"`
	OperatorName  string `json:"operatorName,omitempty"`
	ScannedAt     string `json:"scannedAt,omitempty"`
}

type WheelTraceTimelineNode struct {
	ID           string `json:"id"`
	Time         string `json:"time"`
	Title        string `json:"title"`
	Description  string `json:"description"`
	Type         string `json:"type"`
	SegmentName  string `json:"segmentName,omitempty"`
	ProcessName  string `json:"processName,omitempty"`
	OperatorName string `json:"operatorName,omitempty"`
	Status       string `json:"status,omitempty"`
}

type WheelTraceLookupMeta struct {
	RequestID   string `json:"requestId,omitempty"`
	Source      string `json:"source,omitempty"`
	GeneratedAt string `json:"generatedAt,omitempty"`
}

type WheelTraceLookupResult struct {
	RawCode      string                   `json:"rawCode"`
	CurrentStage WheelTraceStage          `json:"currentStage"`
	Timeline     []WheelTraceTimelineNode `json:"timeline"`
	Warnings     []string                 `json:"warnings"`
	Meta         *WheelTraceLookupMeta    `json:"meta,omitempty"`
}

func LookupWheelTrace(request WheelTraceLookupRequest) (*WheelTraceLookupResult, error) {
	parsed, err := ParseLinearBarcode(request.RawCode)
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	result := &WheelTraceLookupResult{
		RawCode: parsed.RawCode,
		CurrentStage: WheelTraceStage{
			Status:    "unknown",
			ScannedAt: now.Format(time.RFC3339),
		},
		Timeline: []WheelTraceTimelineNode{},
		Warnings: []string{},
		Meta: &WheelTraceLookupMeta{
			RequestID:   strings.TrimSpace(request.RequestID),
			Source:      "wheel-trace-api",
			GeneratedAt: now.Format(time.RFC3339),
		},
	}

	if request.IncludeTimeline {
		result.Timeline = append(result.Timeline, WheelTraceTimelineNode{
			ID:          parsed.RawCode + "-barcode",
			Time:        formatWheelTraceDateTime(parsed.ProductionDate, now),
			Title:       "条码解析完成",
			Description: fmt.Sprintf("已解析一维码，生产日期 %s，型号 %s，外观 %s，孔型 %s%s，序号 %s。", parsed.ProductionDate, parsed.Segments.ModelCode, parsed.Segments.AppearanceCode, parsed.Segments.HolePrefix, parsed.Segments.Holes, parsed.Segments.Serial),
			Type:        "system",
			Status:      "parsed",
		})
	}

	if request.IncludeResolvedProduct {
		product, productErr := ResolveScanProductByModelCode(parsed.Segments.ModelCode)
		if productErr != nil {
			result.Warnings = append(result.Warnings, "产品档案匹配失败，已回退为纯条码解析结果。")
		} else if product != nil {
			if request.IncludeTimeline {
				result.Timeline = append(result.Timeline, WheelTraceTimelineNode{
					ID:          parsed.RawCode + "-product",
					Time:        now.Format(time.RFC3339),
					Title:       "产品档案已匹配",
					Description: fmt.Sprintf("已匹配产品 %s（%s），型号代码 %s。", product.Name, product.SKU, product.ModelCode),
					Type:        "system",
					Status:      "resolved",
				})
			}
		} else {
			result.Warnings = append(result.Warnings, fmt.Sprintf("未匹配到型号代码 %s 对应的产品档案。", parsed.Segments.ModelCode))
		}
	}

	result.Warnings = append(result.Warnings, "尚未关联该条码的生产计划和实际过站记录，无法确定当前产线或工序。")

	result.Warnings = uniqueWheelTraceWarnings(result.Warnings)
	return result, nil
}

func uniqueWheelTraceWarnings(items []string) []string {
	if len(items) == 0 {
		return items
	}

	seen := make(map[string]struct{}, len(items))
	unique := make([]string, 0, len(items))
	for _, item := range items {
		normalized := strings.TrimSpace(item)
		if normalized == "" {
			continue
		}
		if _, exists := seen[normalized]; exists {
			continue
		}
		seen[normalized] = struct{}{}
		unique = append(unique, normalized)
	}

	return unique
}

func formatWheelTraceDateTime(date string, fallback time.Time) string {
	parsed, err := time.Parse("2006-01-02", strings.TrimSpace(date))
	if err != nil {
		return fallback.Format(time.RFC3339)
	}

	return parsed.UTC().Format(time.RFC3339)
}
