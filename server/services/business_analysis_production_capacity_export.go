package services

import (
	"bytes"
	"context"
	"encoding/csv"
	"fmt"
	"strconv"
	"strings"
	"xdfc-server/db"
)

type BusinessAnalysisProductionCapacityCSVExport struct {
	FileName    string
	ContentType string
	Content     []byte
}

func ExportBusinessAnalysisProductionCapacityCSV(
	ctx context.Context,
	query BusinessAnalysisProductionCapacityQuery,
) (BusinessAnalysisProductionCapacityCSVExport, error) {
	return NewBusinessAnalysisService(db.DB).ExportProductionCapacityCSV(ctx, query)
}

func (s *BusinessAnalysisService) ExportProductionCapacityCSV(
	ctx context.Context,
	query BusinessAnalysisProductionCapacityQuery,
) (BusinessAnalysisProductionCapacityCSVExport, error) {
	response, err := s.QueryProductionCapacity(ctx, query)
	if err != nil {
		return BusinessAnalysisProductionCapacityCSVExport{}, err
	}

	var buffer bytes.Buffer
	buffer.WriteString("\uFEFF")
	writer := csv.NewWriter(&buffer)

	writeRecord := func(values ...string) error {
		if err := writer.Write(values); err != nil {
			return err
		}
		return nil
	}

	if err := writeRecord("经营分析", "月产能分析"); err != nil {
		return BusinessAnalysisProductionCapacityCSVExport{}, err
	}
	if err := writeRecord("统计开始日期", response.Filters.From); err != nil {
		return BusinessAnalysisProductionCapacityCSVExport{}, err
	}
	if err := writeRecord("统计结束日期（不含）", response.Filters.To); err != nil {
		return BusinessAnalysisProductionCapacityCSVExport{}, err
	}
	if err := writeRecord("客户ID", response.Filters.CustomerID); err != nil {
		return BusinessAnalysisProductionCapacityCSVExport{}, err
	}
	if err := writeRecord("产品ID", response.Filters.ProductID); err != nil {
		return BusinessAnalysisProductionCapacityCSVExport{}, err
	}
	if err := writeRecord("计划状态", response.Filters.Status); err != nil {
		return BusinessAnalysisProductionCapacityCSVExport{}, err
	}
	if err := writeRecord(
		"包含已取消计划",
		strconv.FormatBool(response.Filters.IncludeCanceled),
	); err != nil {
		return BusinessAnalysisProductionCapacityCSVExport{}, err
	}

	if err := writeRecord(""); err != nil {
		return BusinessAnalysisProductionCapacityCSVExport{}, err
	}
	if err := writeRecord("汇总指标", "数值"); err != nil {
		return BusinessAnalysisProductionCapacityCSVExport{}, err
	}
	summaryRows := []struct {
		label string
		value string
	}{
		{"计划量", formatBusinessAnalysisCSVQuantity(response.Summary.PlannedQuantity)},
		{"实际完工量", formatBusinessAnalysisCSVQuantity(response.Summary.CompletedQuantity)},
		{"合格量", formatBusinessAnalysisCSVOptionalQuantity(response.Summary.QualifiedQuantity)},
		{"报废量", formatBusinessAnalysisCSVOptionalQuantity(response.Summary.ScrapQuantity)},
		{"计划达成率", formatBusinessAnalysisCSVOptionalRate(response.Summary.AchievementRate)},
		{"良率", formatBusinessAnalysisCSVOptionalRate(response.Summary.YieldRate)},
		{"报废率", formatBusinessAnalysisCSVOptionalRate(response.Summary.ScrapRate)},
	}
	for _, row := range summaryRows {
		if err := writeRecord(row.label, row.value); err != nil {
			return BusinessAnalysisProductionCapacityCSVExport{}, err
		}
	}

	if err := writeRecord(""); err != nil {
		return BusinessAnalysisProductionCapacityCSVExport{}, err
	}
	if err := writeRecord("按产品型号", "产品ID", "产品名称", "计划量", "实际完工量"); err != nil {
		return BusinessAnalysisProductionCapacityCSVExport{}, err
	}
	for _, row := range response.Breakdowns.ByProduct {
		if err := writeRecord(
			"",
			row.ProductID,
			row.ProductName,
			formatBusinessAnalysisCSVQuantity(row.PlannedQuantity),
			formatBusinessAnalysisCSVQuantity(row.CompletedQuantity),
		); err != nil {
			return BusinessAnalysisProductionCapacityCSVExport{}, err
		}
	}

	if err := writeRecord(""); err != nil {
		return BusinessAnalysisProductionCapacityCSVExport{}, err
	}
	if err := writeRecord("按客户", "客户ID", "客户名称", "计划量", "实际完工量"); err != nil {
		return BusinessAnalysisProductionCapacityCSVExport{}, err
	}
	for _, row := range response.Breakdowns.ByCustomer {
		if err := writeRecord(
			"",
			row.CustomerID,
			row.CustomerName,
			formatBusinessAnalysisCSVQuantity(row.PlannedQuantity),
			formatBusinessAnalysisCSVQuantity(row.CompletedQuantity),
		); err != nil {
			return BusinessAnalysisProductionCapacityCSVExport{}, err
		}
	}

	if err := writeRecord(""); err != nil {
		return BusinessAnalysisProductionCapacityCSVExport{}, err
	}
	if err := writeRecord("按日期", "日期", "计划量", "实际完工量"); err != nil {
		return BusinessAnalysisProductionCapacityCSVExport{}, err
	}
	for _, row := range response.Breakdowns.ByDay {
		if err := writeRecord(
			"",
			row.Date,
			formatBusinessAnalysisCSVQuantity(row.PlannedQuantity),
			formatBusinessAnalysisCSVQuantity(row.CompletedQuantity),
		); err != nil {
			return BusinessAnalysisProductionCapacityCSVExport{}, err
		}
	}

	if err := writeRecord(""); err != nil {
		return BusinessAnalysisProductionCapacityCSVExport{}, err
	}
	if err := writeRecord("数据质量", "数值"); err != nil {
		return BusinessAnalysisProductionCapacityCSVExport{}, err
	}
	dataQualityRows := []struct {
		label string
		value string
	}{
		{"品质报废记录数", strconv.FormatInt(response.DataQuality.QualityScrapRecordCount, 10)},
		{"未关联品质记录数", strconv.FormatInt(response.DataQuality.UnlinkedQualityRecords, 10)},
		{"缺少报废数量记录数", strconv.FormatInt(response.DataQuality.MissingQuantityRecords, 10)},
		{"缺少报废发生时间记录数", strconv.FormatInt(response.DataQuality.MissingOccurrenceTimestampRecords, 10)},
		{"缺少完工时间记录数", strconv.FormatInt(response.DataQuality.MissingCompletionTimestampRecords, 10)},
		{"未关联销售订单计划数", strconv.FormatInt(response.DataQuality.UnlinkedProductionOrderRecords, 10)},
		{"报废数量可用", strconv.FormatBool(response.DataQuality.QualityQuantityAvailable)},
		{"品质生产关联可用", strconv.FormatBool(response.DataQuality.QualityProductionLinkageAvailable)},
		{"数据完整", strconv.FormatBool(response.DataQuality.IsComplete)},
		{"缺口代码", strings.Join(response.DataQuality.Notes, " | ")},
	}
	for _, row := range dataQualityRows {
		if err := writeRecord(row.label, row.value); err != nil {
			return BusinessAnalysisProductionCapacityCSVExport{}, err
		}
	}

	writer.Flush()
	if err := writer.Error(); err != nil {
		return BusinessAnalysisProductionCapacityCSVExport{}, err
	}

	return BusinessAnalysisProductionCapacityCSVExport{
		FileName: fmt.Sprintf(
			"business-analysis-production-capacity_%s_%s.csv",
			response.Filters.From,
			response.Filters.To,
		),
		ContentType: "text/csv; charset=utf-8",
		Content:     buffer.Bytes(),
	}, nil
}

func formatBusinessAnalysisCSVQuantity(value float64) string {
	return strconv.FormatFloat(value, 'f', -1, 64)
}

func formatBusinessAnalysisCSVOptionalQuantity(value *float64) string {
	if value == nil {
		return "暂不可用"
	}
	return formatBusinessAnalysisCSVQuantity(*value)
}

func formatBusinessAnalysisCSVOptionalRate(value *float64) string {
	if value == nil {
		return "暂不可用"
	}
	return fmt.Sprintf("%.2f%%", *value*100)
}
