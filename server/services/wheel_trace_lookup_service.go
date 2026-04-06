package services

import (
	"fmt"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
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
	Status       string `json:"status"`
	LineID       string `json:"lineId,omitempty"`
	LineCode     string `json:"lineCode,omitempty"`
	LineName     string `json:"lineName,omitempty"`
	SegmentID    string `json:"segmentId,omitempty"`
	SegmentName  string `json:"segmentName,omitempty"`
	ProcessID    string `json:"processId,omitempty"`
	ProcessCode  string `json:"processCode,omitempty"`
	ProcessName  string `json:"processName,omitempty"`
	StationID    string `json:"stationId,omitempty"`
	StationCode  string `json:"stationCode,omitempty"`
	StationName  string `json:"stationName,omitempty"`
	TeamID       string `json:"teamId,omitempty"`
	TeamName     string `json:"teamName,omitempty"`
	OperatorID   string `json:"operatorId,omitempty"`
	OperatorName string `json:"operatorName,omitempty"`
	ScannedAt    string `json:"scannedAt,omitempty"`
}

type WheelTraceTimelineNode struct {
	ID           string `json:"id"`
	Time         string `json:"time"`
	Title        string `json:"title"`
	Description  string `json:"description"`
	Type         string `json:"type"`
	SegmentName  string `json:"segmentName,omitempty"`
	ProcessName  string `json:"processName,omitempty"`
	StationName  string `json:"stationName,omitempty"`
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

type wheelTraceRouteAnchor struct {
	LineID       string
	LineCode     string
	LineName     string
	SegmentID    string
	SegmentName  string
	ProcessID    string
	ProcessCode  string
	ProcessName  string
	StationID    string
	StationCode  string
	StationName  string
	TeamID       string
	TeamName     string
	OperatorName string
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

	anchor, anchorErr := resolveWheelTraceRouteAnchor()
	if anchorErr != nil {
		result.Warnings = append(result.Warnings, "生产拓扑读取失败，暂时无法给出工段锚点。")
	} else if anchor != nil {
		result.CurrentStage = WheelTraceStage{
			Status:       "partial",
			LineID:       anchor.LineID,
			LineCode:     anchor.LineCode,
			LineName:     anchor.LineName,
			SegmentID:    anchor.SegmentID,
			SegmentName:  anchor.SegmentName,
			ProcessID:    anchor.ProcessID,
			ProcessCode:  anchor.ProcessCode,
			ProcessName:  anchor.ProcessName,
			StationID:    anchor.StationID,
			StationCode:  anchor.StationCode,
			StationName:  anchor.StationName,
			TeamID:       anchor.TeamID,
			TeamName:     anchor.TeamName,
			OperatorName: anchor.OperatorName,
			ScannedAt:    now.Format(time.RFC3339),
		}

		result.Warnings = append(result.Warnings, "当前工段基于生产拓扑配置推断，尚未接入真实过站记录。")

		if request.IncludeTimeline {
			result.Timeline = append(result.Timeline, WheelTraceTimelineNode{
				ID:           parsed.RawCode + "-route-anchor",
				Time:         now.Format(time.RFC3339),
				Title:        "已匹配生产路线锚点",
				Description:  "根据当前启用的生产拓扑，返回一条可落地的工段、工序、站点锚点，供追溯页先行展示。",
				Type:         "production",
				SegmentName:  anchor.SegmentName,
				ProcessName:  anchor.ProcessName,
				StationName:  anchor.StationName,
				OperatorName: anchor.OperatorName,
				Status:       "partial",
			})
		}
	} else {
		result.Warnings = append(result.Warnings, "未找到启用中的生产拓扑配置，暂时无法显示工段锚点。")
	}

	result.Warnings = uniqueWheelTraceWarnings(result.Warnings)
	return result, nil
}

func resolveWheelTraceRouteAnchor() (*wheelTraceRouteAnchor, error) {
	if db.DB == nil {
		return nil, nil
	}

	var lines []models.ProductionLine
	err := db.DB.
		Where("is_active = ?", true).
		Order("code asc").
		Preload("Segments", func(tx *gorm.DB) *gorm.DB {
			return tx.Order("sort_order asc")
		}).
		Preload("Segments.Processes", func(tx *gorm.DB) *gorm.DB {
			return tx.Order("sort_order asc")
		}).
		Find(&lines).Error
	if err != nil {
		return nil, err
	}

	var anchor *wheelTraceRouteAnchor
	for _, line := range lines {
		for _, segment := range line.Segments {
			if len(segment.Processes) > 0 {
				process := segment.Processes[0]
				anchor = &wheelTraceRouteAnchor{
					LineID:      line.ID,
					LineCode:    line.Code,
					LineName:    line.Name,
					SegmentID:   segment.ID,
					SegmentName: segment.Name,
					ProcessID:   process.ID,
					ProcessCode: process.Code,
					ProcessName: process.Name,
				}

				team, teamErr := resolveWheelTraceTeam(anchor.SegmentName, anchor.ProcessName)
				if teamErr != nil {
					return nil, teamErr
				}
				if team != nil {
					anchor.TeamID = team.ID
					anchor.TeamName = team.Name
					anchor.OperatorName = team.Operator
				}
				break
			}
			if anchor != nil {
				break
			}
		}
		if anchor != nil {
			break
		}
	}

	return anchor, nil
}

func resolveWheelTraceTeam(segmentName, processName string) (*models.Team, error) {
	if db.DB == nil || (strings.TrimSpace(segmentName) == "" && strings.TrimSpace(processName) == "") {
		return nil, nil
	}

	query := db.DB.Model(&models.Team{}).Where("status = ?", "active")
	if strings.TrimSpace(segmentName) != "" {
		query = query.Where("section = ?", strings.TrimSpace(segmentName))
	}
	if strings.TrimSpace(processName) != "" {
		query = query.Where("process = ?", strings.TrimSpace(processName))
	}

	var team models.Team
	err := query.Order("step asc").First(&team).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &team, nil
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
