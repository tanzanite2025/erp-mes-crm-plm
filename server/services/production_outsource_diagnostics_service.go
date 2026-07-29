package services

import (
	"fmt"
	"math"
	"sort"
	"strings"
	"time"
	"xdfc-server/models"

	"gorm.io/gorm"
)

const (
	OutsourceDiagnosticsSeverityInfo     = "INFO"
	OutsourceDiagnosticsSeverityWarning  = "WARNING"
	OutsourceDiagnosticsSeverityCritical = "CRITICAL"
)

const (
	outsourceDiagnosticsIssueLineTransferSummaryMismatch    = "LINE_TRANSFER_SUMMARY_MISMATCH"
	outsourceDiagnosticsIssueLineInspectionSummaryMismatch  = "LINE_INSPECTION_SUMMARY_MISMATCH"
	outsourceDiagnosticsIssueQuantityInvariantViolation     = "QUANTITY_INVARIANT_VIOLATION"
	outsourceDiagnosticsIssueMissingTransferEvent           = "MISSING_TRANSFER_EVENT"
	outsourceDiagnosticsIssueMissingInventoryLedger         = "MISSING_INVENTORY_LEDGER"
	outsourceDiagnosticsIssueInventoryLedgerMismatch        = "INVENTORY_LEDGER_MISMATCH"
	outsourceDiagnosticsIssueMissingInspectionTask          = "MISSING_INSPECTION_TASK"
	outsourceDiagnosticsIssueMissingInspectionOperation     = "MISSING_INSPECTION_OPERATION"
	outsourceDiagnosticsIssueInspectionWithoutReturnedFact  = "INSPECTION_WITHOUT_RETURNED_FACT"
	outsourceDiagnosticsIssueDuplicateTransferFact          = "DUPLICATE_TRANSFER_FACT"
	outsourceDiagnosticsIssueDuplicateInspectionFact        = "DUPLICATE_INSPECTION_FACT"
	outsourceDiagnosticsIssueNotificationFailure            = "NOTIFICATION_FAILURE"
	outsourceDiagnosticsMaxIssues                           = 100
	outsourceDiagnosticsRecentNotificationFailureIssueLimit = 10
)

type OutsourceDiagnosticsSummary struct {
	OpenOrders                int     `json:"openOrders"`
	ActiveLines               int     `json:"activeLines"`
	PendingReturnQuantity     float64 `json:"pendingReturnQuantity"`
	PendingInspectionQuantity float64 `json:"pendingInspectionQuantity"`
	TransferFacts             int     `json:"transferFacts"`
	InspectionFacts           int     `json:"inspectionFacts"`
	NotificationFailed        int     `json:"notificationFailed"`
	ReconciliationIssues      int     `json:"reconciliationIssues"`
	CriticalIssues            int     `json:"criticalIssues"`
	WarningIssues             int     `json:"warningIssues"`
	InfoIssues                int     `json:"infoIssues"`
	TotalIssues               int     `json:"totalIssues"`
	IssuesTruncated           bool    `json:"issuesTruncated"`
}

type OutsourceDiagnosticsIssue struct {
	ID             string            `json:"id"`
	Severity       string            `json:"severity"`
	Type           string            `json:"type"`
	OrderID        string            `json:"orderId"`
	OrderNo        string            `json:"orderNo"`
	LineID         string            `json:"lineId"`
	LineNo         int               `json:"lineNo"`
	ProductBarcode string            `json:"productBarcode"`
	Message        string            `json:"message"`
	QuantityDiff   float64           `json:"quantityDiff"`
	Metadata       map[string]string `json:"metadata"`
}

type OutsourceDiagnosticsResponse struct {
	GeneratedAt time.Time                   `json:"generatedAt"`
	Summary     OutsourceDiagnosticsSummary `json:"summary"`
	Issues      []OutsourceDiagnosticsIssue `json:"issues"`
}

type outsourceDiagnosticsLine struct {
	OrderID          string
	OrderNo          string
	OrderStatus      string
	LineID           string
	LineNo           int
	LineStatus       string
	ProductCode      string
	ProductName      string
	Quantity         float64
	UOM              string
	SentQuantity     float64
	ReturnedQuantity float64
	AcceptedQuantity float64
	RejectedQuantity float64
	ReworkQuantity   float64
	ScrapQuantity    float64
}

type outsourceDiagnosticsTransferAgg struct {
	Sent              float64
	Returned          float64
	SentByBarcode     map[string]float64
	ReturnedByBarcode map[string]float64
}

type outsourceDiagnosticsInspectionAgg struct {
	Inspected float64
	Accepted  float64
	Rejected  float64
	Rework    float64
	Scrap     float64
}

func GetOutsourceDiagnostics() (OutsourceDiagnosticsResponse, error) {
	return defaultProductionOutsourcingService.GetOutsourceDiagnostics()
}

func (s *ProductionOutsourcingService) GetOutsourceDiagnostics() (OutsourceDiagnosticsResponse, error) {
	database := s.txManager.DB()
	lines, err := loadOutsourceDiagnosticsLines(database)
	if err != nil {
		return OutsourceDiagnosticsResponse{}, err
	}

	lineByID := make(map[string]outsourceDiagnosticsLine, len(lines))
	lineIDs := make([]string, 0, len(lines))
	openOrderIDs := make(map[string]struct{})
	for _, line := range lines {
		lineByID[line.LineID] = line
		lineIDs = append(lineIDs, line.LineID)
		if line.OrderStatus != OutsourceOrderStatusClosed && line.OrderStatus != OutsourceOrderStatusCanceled {
			openOrderIDs[line.OrderID] = struct{}{}
		}
	}

	transfers, err := loadOutsourceDiagnosticsTransfers(database, lineIDs)
	if err != nil {
		return OutsourceDiagnosticsResponse{}, err
	}
	inspections, err := loadOutsourceDiagnosticsInspections(database, lineIDs)
	if err != nil {
		return OutsourceDiagnosticsResponse{}, err
	}
	transferEventIDs, err := loadOutsourceDiagnosticsTransferEventIDs(database, transfers)
	if err != nil {
		return OutsourceDiagnosticsResponse{}, err
	}
	ledgerByFactID, err := loadOutsourceDiagnosticsLedgerEntries(database, transfers)
	if err != nil {
		return OutsourceDiagnosticsResponse{}, err
	}
	unresolvedFailures, err := loadOutsourceDiagnosticsUnresolvedNotificationFailures(database)
	if err != nil {
		return OutsourceDiagnosticsResponse{}, err
	}

	response := OutsourceDiagnosticsResponse{
		GeneratedAt: time.Now().UTC(),
		Summary: OutsourceDiagnosticsSummary{
			OpenOrders:         len(openOrderIDs),
			TransferFacts:      len(transfers),
			InspectionFacts:    len(inspections),
			NotificationFailed: len(unresolvedFailures),
		},
		Issues: []OutsourceDiagnosticsIssue{},
	}
	addIssue := func(issue OutsourceDiagnosticsIssue) {
		if issue.Metadata == nil {
			issue.Metadata = map[string]string{}
		}
		issue.Severity = normalizeOutsourceDiagnosticsSeverity(issue.Severity)
		response.Summary.TotalIssues++
		switch issue.Severity {
		case OutsourceDiagnosticsSeverityCritical:
			response.Summary.CriticalIssues++
		case OutsourceDiagnosticsSeverityWarning:
			response.Summary.WarningIssues++
		default:
			response.Summary.InfoIssues++
		}
		if issue.Type != outsourceDiagnosticsIssueNotificationFailure {
			response.Summary.ReconciliationIssues++
		}
		if issue.ID == "" {
			issue.ID = fmt.Sprintf("%s:%d", issue.Type, response.Summary.TotalIssues)
		}
		if len(response.Issues) < outsourceDiagnosticsMaxIssues {
			response.Issues = append(response.Issues, issue)
		} else {
			response.Summary.IssuesTruncated = true
		}
	}

	transferAggByLine := make(map[string]outsourceDiagnosticsTransferAgg, len(lines))
	transferFactCountByKey := map[string]int{}
	for _, transfer := range transfers {
		line := lineByID[transfer.OutsourceOrderLineID]
		agg := transferAggByLine[transfer.OutsourceOrderLineID]
		if agg.SentByBarcode == nil {
			agg.SentByBarcode = map[string]float64{}
			agg.ReturnedByBarcode = map[string]float64{}
		}
		barcode := strings.TrimSpace(transfer.ProductBarcode)
		switch transfer.TransferType {
		case OutsourceTransferTypeSend:
			agg.Sent += transfer.Quantity
			agg.SentByBarcode[barcode] += transfer.Quantity
		case OutsourceTransferTypeReturn:
			agg.Returned += transfer.Quantity
			agg.ReturnedByBarcode[barcode] += transfer.Quantity
		}
		transferAggByLine[transfer.OutsourceOrderLineID] = agg

		transferFactCountByKey[strings.Join([]string{transfer.OutsourceOrderLineID, transfer.TransferType, barcode}, "|")]++
		checkOutsourceTransferFactCompleteness(transfer, line, transferEventIDs, ledgerByFactID, addIssue)
	}
	for key, count := range transferFactCountByKey {
		if count <= 1 {
			continue
		}
		parts := strings.Split(key, "|")
		line := lineByID[firstStringPart(parts, 0)]
		addIssue(OutsourceDiagnosticsIssue{
			Severity:       OutsourceDiagnosticsSeverityCritical,
			Type:           outsourceDiagnosticsIssueDuplicateTransferFact,
			OrderID:        line.OrderID,
			OrderNo:        line.OrderNo,
			LineID:         line.LineID,
			LineNo:         line.LineNo,
			ProductBarcode: firstStringPart(parts, 2),
			Message:        "同一委外明细、转移类型和产品条码存在重复转移事实，唯一约束或历史数据需要对账。",
			Metadata: map[string]string{
				"transferType": firstStringPart(parts, 1),
				"count":        fmt.Sprint(count),
			},
		})
	}

	inspectionAggByLine := make(map[string]outsourceDiagnosticsInspectionAgg, len(lines))
	inspectionFactCountByKey := map[string]int{}
	for _, inspection := range inspections {
		line := lineByID[inspection.OutsourceOrderLineID]
		agg := inspectionAggByLine[inspection.OutsourceOrderLineID]
		agg.Inspected += inspection.InspectedQuantity
		agg.Accepted += inspection.AcceptedQuantity
		agg.Rejected += inspection.RejectedQuantity
		agg.Rework += inspection.ReworkQuantity
		agg.Scrap += inspection.ScrapQuantity
		inspectionAggByLine[inspection.OutsourceOrderLineID] = agg

		barcode := strings.TrimSpace(inspection.ProductBarcode)
		inspectionFactCountByKey[strings.Join([]string{inspection.OutsourceOrderLineID, barcode}, "|")]++
		checkOutsourceInspectionFactCompleteness(inspection, line, transferAggByLine[inspection.OutsourceOrderLineID], addIssue)
	}
	for key, count := range inspectionFactCountByKey {
		if count <= 1 {
			continue
		}
		parts := strings.Split(key, "|")
		line := lineByID[firstStringPart(parts, 0)]
		addIssue(OutsourceDiagnosticsIssue{
			Severity:       OutsourceDiagnosticsSeverityCritical,
			Type:           outsourceDiagnosticsIssueDuplicateInspectionFact,
			OrderID:        line.OrderID,
			OrderNo:        line.OrderNo,
			LineID:         line.LineID,
			LineNo:         line.LineNo,
			ProductBarcode: firstStringPart(parts, 1),
			Message:        "同一委外明细和产品条码存在重复检验事实，品质桥接唯一约束或历史数据需要对账。",
			Metadata: map[string]string{
				"count": fmt.Sprint(count),
			},
		})
	}

	for _, line := range lines {
		if line.OrderStatus != OutsourceOrderStatusClosed && line.OrderStatus != OutsourceOrderStatusCanceled &&
			line.LineStatus != OutsourceOrderStatusClosed && line.LineStatus != OutsourceOrderStatusCanceled {
			response.Summary.ActiveLines++
		}
		disposed := line.AcceptedQuantity + line.ReworkQuantity + line.ScrapQuantity
		response.Summary.PendingReturnQuantity += math.Max(0, line.SentQuantity-line.ReturnedQuantity)
		response.Summary.PendingInspectionQuantity += math.Max(0, line.ReturnedQuantity-disposed)

		checkOutsourceLineQuantityInvariants(line, inspectionAggByLine[line.LineID], addIssue)
		checkOutsourceLineTransferSummary(line, transferAggByLine[line.LineID], addIssue)
		checkOutsourceLineInspectionSummary(line, inspectionAggByLine[line.LineID], addIssue)
	}

	for index, logEntry := range unresolvedFailures {
		if index >= outsourceDiagnosticsRecentNotificationFailureIssueLimit {
			break
		}
		addIssue(OutsourceDiagnosticsIssue{
			Severity: OutsourceDiagnosticsSeverityWarning,
			Type:     outsourceDiagnosticsIssueNotificationFailure,
			Message:  "委外消息通知存在未恢复的失败日志，需要重试或检查消息通道。",
			Metadata: map[string]string{
				"logId":           logEntry.ID,
				"eventKey":        strings.TrimSpace(logEntry.EventKey),
				"statusCode":      strings.TrimSpace(logEntry.StatusCode),
				"ruleName":        strings.TrimSpace(logEntry.RuleName),
				"errorMessage":    strings.TrimSpace(logEntry.ErrorMessage),
				"triggeredAt":     logEntry.TriggeredAt.Format(time.RFC3339),
				"executionStatus": strings.TrimSpace(logEntry.ExecutionStatus),
			},
		})
	}

	sort.SliceStable(response.Issues, func(i, j int) bool {
		left := outsourceDiagnosticsSeverityRank(response.Issues[i].Severity)
		right := outsourceDiagnosticsSeverityRank(response.Issues[j].Severity)
		if left != right {
			return left < right
		}
		return response.Issues[i].Type < response.Issues[j].Type
	})

	return response, nil
}

func loadOutsourceDiagnosticsLines(database *gorm.DB) ([]outsourceDiagnosticsLine, error) {
	var lines []outsourceDiagnosticsLine
	err := database.Table("production_outsource_order_lines AS lines").
		Select(`
			orders.id AS order_id,
			orders.order_no AS order_no,
			orders.status AS order_status,
			lines.id AS line_id,
			lines.line_no AS line_no,
			lines.status AS line_status,
			lines.product_code AS product_code,
			lines.product_name AS product_name,
			lines.quantity AS quantity,
			lines.uom AS uom,
			lines.sent_quantity AS sent_quantity,
			lines.returned_quantity AS returned_quantity,
			lines.accepted_quantity AS accepted_quantity,
			lines.rejected_quantity AS rejected_quantity,
			lines.rework_quantity AS rework_quantity,
			lines.scrap_quantity AS scrap_quantity
		`).
		Joins("JOIN production_outsource_orders AS orders ON orders.id = lines.outsource_order_id AND orders.deleted_at IS NULL").
		Where("lines.deleted_at IS NULL").
		Where("orders.status <> ?", OutsourceOrderStatusCanceled).
		Order("orders.created_at DESC, lines.line_no ASC").
		Scan(&lines).Error
	return lines, err
}

func loadOutsourceDiagnosticsTransfers(database *gorm.DB, lineIDs []string) ([]models.OutsourceTransfer, error) {
	if len(lineIDs) == 0 {
		return []models.OutsourceTransfer{}, nil
	}
	var transfers []models.OutsourceTransfer
	err := database.
		Where("outsource_order_line_id IN ?", lineIDs).
		Find(&transfers).Error
	return transfers, err
}

func loadOutsourceDiagnosticsInspections(database *gorm.DB, lineIDs []string) ([]models.OutsourceInspection, error) {
	if len(lineIDs) == 0 {
		return []models.OutsourceInspection{}, nil
	}
	var inspections []models.OutsourceInspection
	err := database.
		Where("outsource_order_line_id IN ?", lineIDs).
		Find(&inspections).Error
	return inspections, err
}

func loadOutsourceDiagnosticsTransferEventIDs(database *gorm.DB, transfers []models.OutsourceTransfer) (map[string]struct{}, error) {
	eventIDs := make([]string, 0, len(transfers))
	seen := map[string]struct{}{}
	for _, transfer := range transfers {
		eventID := strings.TrimSpace(transfer.TransferEventID)
		if eventID == "" {
			continue
		}
		if _, exists := seen[eventID]; exists {
			continue
		}
		seen[eventID] = struct{}{}
		eventIDs = append(eventIDs, eventID)
	}
	if len(eventIDs) == 0 {
		return map[string]struct{}{}, nil
	}
	var events []models.ProductBarcodeTransferEvent
	if err := database.Select("id").Where("id IN ?", eventIDs).Find(&events).Error; err != nil {
		return nil, err
	}
	existing := make(map[string]struct{}, len(events))
	for _, event := range events {
		existing[event.ID] = struct{}{}
	}
	return existing, nil
}

func loadOutsourceDiagnosticsLedgerEntries(database *gorm.DB, transfers []models.OutsourceTransfer) (map[string][]models.InventoryLedgerEntry, error) {
	transferIDs := make([]string, 0, len(transfers))
	seen := map[string]struct{}{}
	for _, transfer := range transfers {
		transferID := strings.TrimSpace(transfer.ID)
		if transferID == "" {
			continue
		}
		if _, exists := seen[transferID]; exists {
			continue
		}
		seen[transferID] = struct{}{}
		transferIDs = append(transferIDs, transferID)
	}
	if len(transferIDs) == 0 {
		return map[string][]models.InventoryLedgerEntry{}, nil
	}
	var entries []models.InventoryLedgerEntry
	if err := database.
		Where("source_type = ? AND source_fact_id IN ?", DedicatedInventorySourceProductionOutsource, transferIDs).
		Find(&entries).Error; err != nil {
		return nil, err
	}
	byFactID := make(map[string][]models.InventoryLedgerEntry, len(transferIDs))
	for _, entry := range entries {
		byFactID[strings.TrimSpace(entry.SourceFactID)] = append(byFactID[strings.TrimSpace(entry.SourceFactID)], entry)
	}
	return byFactID, nil
}

func loadOutsourceDiagnosticsUnresolvedNotificationFailures(database *gorm.DB) ([]models.RuleExecutionLog, error) {
	var failed []models.RuleExecutionLog
	if err := database.
		Where("source_code = ? AND execution_type = ? AND execution_status = ?", businessEventSourceProductionOutsource, "notify", "failed").
		Order("triggered_at DESC, created_at DESC").
		Find(&failed).Error; err != nil {
		return nil, err
	}
	if len(failed) == 0 {
		return []models.RuleExecutionLog{}, nil
	}

	var retries []models.RuleExecutionLog
	if err := database.
		Where("source_code = ? AND execution_type = ? AND execution_status = ?", businessEventSourceProductionOutsource, "notify", "success").
		Find(&retries).Error; err != nil {
		return nil, err
	}
	recovered := map[string]struct{}{}
	for _, retry := range retries {
		if retryOfLogID := decodeRuleExecutionRetryOfLogID(retry.Result); retryOfLogID != "" {
			recovered[retryOfLogID] = struct{}{}
		}
	}

	unresolved := make([]models.RuleExecutionLog, 0, len(failed))
	for _, logEntry := range failed {
		if _, ok := recovered[logEntry.ID]; ok {
			continue
		}
		unresolved = append(unresolved, logEntry)
	}
	return unresolved, nil
}

func checkOutsourceTransferFactCompleteness(
	transfer models.OutsourceTransfer,
	line outsourceDiagnosticsLine,
	transferEventIDs map[string]struct{},
	ledgerByFactID map[string][]models.InventoryLedgerEntry,
	addIssue func(OutsourceDiagnosticsIssue),
) {
	transferEventID := strings.TrimSpace(transfer.TransferEventID)
	if transferEventID == "" {
		addIssue(OutsourceDiagnosticsIssue{
			Severity:       OutsourceDiagnosticsSeverityCritical,
			Type:           outsourceDiagnosticsIssueMissingTransferEvent,
			OrderID:        line.OrderID,
			OrderNo:        line.OrderNo,
			LineID:         line.LineID,
			LineNo:         line.LineNo,
			ProductBarcode: strings.TrimSpace(transfer.ProductBarcode),
			Message:        "委外转移记录缺少产品条码转移事件 ID，条码持有方链路不完整。",
			Metadata:       outsourceDiagnosticsTransferMetadata(transfer),
		})
	} else if _, exists := transferEventIDs[transferEventID]; !exists {
		addIssue(OutsourceDiagnosticsIssue{
			Severity:       OutsourceDiagnosticsSeverityCritical,
			Type:           outsourceDiagnosticsIssueMissingTransferEvent,
			OrderID:        line.OrderID,
			OrderNo:        line.OrderNo,
			LineID:         line.LineID,
			LineNo:         line.LineNo,
			ProductBarcode: strings.TrimSpace(transfer.ProductBarcode),
			Message:        "委外转移记录引用的产品条码转移事件不存在，条码持有方链路不完整。",
			Metadata:       outsourceDiagnosticsTransferMetadata(transfer),
		})
	}

	ledgerEntries := ledgerByFactID[strings.TrimSpace(transfer.ID)]
	if len(ledgerEntries) != 2 {
		metadata := outsourceDiagnosticsTransferMetadata(transfer)
		metadata["ledgerCount"] = fmt.Sprint(len(ledgerEntries))
		addIssue(OutsourceDiagnosticsIssue{
			Severity:       OutsourceDiagnosticsSeverityCritical,
			Type:           outsourceDiagnosticsIssueMissingInventoryLedger,
			OrderID:        line.OrderID,
			OrderNo:        line.OrderNo,
			LineID:         line.LineID,
			LineNo:         line.LineNo,
			ProductBarcode: strings.TrimSpace(transfer.ProductBarcode),
			Message:        "委外转移没有对应的一出一入两条库存流水，专用库存适配器链路不完整。",
			Metadata:       metadata,
		})
		return
	}

	directionCount := map[string]int{}
	netQuantity := 0.0
	for _, entry := range ledgerEntries {
		direction := strings.ToUpper(strings.TrimSpace(entry.Direction))
		directionCount[direction]++
		netQuantity += entry.QuantityDelta
		expectedDelta := transfer.Quantity
		if direction == "OUT" {
			expectedDelta = -transfer.Quantity
		}
		if direction != "OUT" && direction != "IN" || !outsourceDiagnosticsFloatEqual(entry.QuantityDelta, expectedDelta) {
			metadata := outsourceDiagnosticsTransferMetadata(transfer)
			metadata["ledgerId"] = entry.ID
			metadata["direction"] = direction
			metadata["quantityDelta"] = formatOutsourceQuantity(entry.QuantityDelta)
			addIssue(OutsourceDiagnosticsIssue{
				Severity:       OutsourceDiagnosticsSeverityCritical,
				Type:           outsourceDiagnosticsIssueInventoryLedgerMismatch,
				OrderID:        line.OrderID,
				OrderNo:        line.OrderNo,
				LineID:         line.LineID,
				LineNo:         line.LineNo,
				ProductBarcode: strings.TrimSpace(transfer.ProductBarcode),
				Message:        "委外库存流水方向或数量与转移记录不一致，需要按转移事实和库存流水对账。",
				QuantityDiff:   entry.QuantityDelta - expectedDelta,
				Metadata:       metadata,
			})
		}
	}
	if directionCount["OUT"] != 1 || directionCount["IN"] != 1 || !outsourceDiagnosticsFloatEqual(netQuantity, 0) {
		metadata := outsourceDiagnosticsTransferMetadata(transfer)
		metadata["outCount"] = fmt.Sprint(directionCount["OUT"])
		metadata["inCount"] = fmt.Sprint(directionCount["IN"])
		metadata["netQuantity"] = formatOutsourceQuantity(netQuantity)
		addIssue(OutsourceDiagnosticsIssue{
			Severity:       OutsourceDiagnosticsSeverityCritical,
			Type:           outsourceDiagnosticsIssueInventoryLedgerMismatch,
			OrderID:        line.OrderID,
			OrderNo:        line.OrderNo,
			LineID:         line.LineID,
			LineNo:         line.LineNo,
			ProductBarcode: strings.TrimSpace(transfer.ProductBarcode),
			Message:        "委外库存流水不是一出一入净额为零，专用库存适配器对账失败。",
			QuantityDiff:   netQuantity,
			Metadata:       metadata,
		})
	}
}

func checkOutsourceInspectionFactCompleteness(
	inspection models.OutsourceInspection,
	line outsourceDiagnosticsLine,
	transferAgg outsourceDiagnosticsTransferAgg,
	addIssue func(OutsourceDiagnosticsIssue),
) {
	barcode := strings.TrimSpace(inspection.ProductBarcode)
	if strings.TrimSpace(inspection.InspectionTaskID) == "" {
		addIssue(OutsourceDiagnosticsIssue{
			Severity:       OutsourceDiagnosticsSeverityCritical,
			Type:           outsourceDiagnosticsIssueMissingInspectionTask,
			OrderID:        line.OrderID,
			OrderNo:        line.OrderNo,
			LineID:         line.LineID,
			LineNo:         line.LineNo,
			ProductBarcode: barcode,
			Message:        "委外检验记录缺少正式品质任务 ID，品质域桥接链路不完整。",
			Metadata:       outsourceDiagnosticsInspectionMetadata(inspection),
		})
	}
	if strings.TrimSpace(inspection.OperationID) == "" {
		addIssue(OutsourceDiagnosticsIssue{
			Severity:       OutsourceDiagnosticsSeverityCritical,
			Type:           outsourceDiagnosticsIssueMissingInspectionOperation,
			OrderID:        line.OrderID,
			OrderNo:        line.OrderNo,
			LineID:         line.LineID,
			LineNo:         line.LineNo,
			ProductBarcode: barcode,
			Message:        "委外检验记录缺少生产工序执行 ID，条码路线推进链路不完整。",
			Metadata:       outsourceDiagnosticsInspectionMetadata(inspection),
		})
	}
	returnedQuantity := transferAgg.ReturnedByBarcode[barcode]
	if returnedQuantity <= outsourceQuantityEpsilon {
		addIssue(OutsourceDiagnosticsIssue{
			Severity:       OutsourceDiagnosticsSeverityCritical,
			Type:           outsourceDiagnosticsIssueInspectionWithoutReturnedFact,
			OrderID:        line.OrderID,
			OrderNo:        line.OrderNo,
			LineID:         line.LineID,
			LineNo:         line.LineNo,
			ProductBarcode: barcode,
			Message:        "产品条码存在委外检验记录，但没有对应的回厂转移事实。",
			Metadata:       outsourceDiagnosticsInspectionMetadata(inspection),
		})
		return
	}
	if inspection.InspectedQuantity-returnedQuantity > outsourceQuantityEpsilon {
		addIssue(OutsourceDiagnosticsIssue{
			Severity:       OutsourceDiagnosticsSeverityCritical,
			Type:           outsourceDiagnosticsIssueQuantityInvariantViolation,
			OrderID:        line.OrderID,
			OrderNo:        line.OrderNo,
			LineID:         line.LineID,
			LineNo:         line.LineNo,
			ProductBarcode: barcode,
			Message:        "产品条码检验数量超过已回厂数量。",
			QuantityDiff:   inspection.InspectedQuantity - returnedQuantity,
			Metadata:       outsourceDiagnosticsInspectionMetadata(inspection),
		})
	}
}

func checkOutsourceLineQuantityInvariants(
	line outsourceDiagnosticsLine,
	inspectionAgg outsourceDiagnosticsInspectionAgg,
	addIssue func(OutsourceDiagnosticsIssue),
) {
	if line.SentQuantity-line.Quantity > outsourceQuantityEpsilon {
		addIssue(outsourceDiagnosticsQuantityInvariantIssue(line, "明细已发出数量超过委外数量。", line.SentQuantity-line.Quantity, "sentQuantity", line.SentQuantity, line.Quantity))
	}
	if line.ReturnedQuantity-line.SentQuantity > outsourceQuantityEpsilon {
		addIssue(outsourceDiagnosticsQuantityInvariantIssue(line, "明细已回厂数量超过已发出数量。", line.ReturnedQuantity-line.SentQuantity, "returnedQuantity", line.ReturnedQuantity, line.SentQuantity))
	}
	disposed := line.AcceptedQuantity + line.ReworkQuantity + line.ScrapQuantity
	if disposed-line.ReturnedQuantity > outsourceQuantityEpsilon {
		addIssue(outsourceDiagnosticsQuantityInvariantIssue(line, "明细已处置数量超过已回厂数量。", disposed-line.ReturnedQuantity, "disposedQuantity", disposed, line.ReturnedQuantity))
	}
	if inspectionAgg.Inspected-line.ReturnedQuantity > outsourceQuantityEpsilon {
		addIssue(outsourceDiagnosticsQuantityInvariantIssue(line, "明细检验事实数量超过已回厂数量。", inspectionAgg.Inspected-line.ReturnedQuantity, "inspectedFactQuantity", inspectionAgg.Inspected, line.ReturnedQuantity))
	}
}

func checkOutsourceLineTransferSummary(
	line outsourceDiagnosticsLine,
	transferAgg outsourceDiagnosticsTransferAgg,
	addIssue func(OutsourceDiagnosticsIssue),
) {
	if !outsourceDiagnosticsFloatEqual(transferAgg.Sent, line.SentQuantity) {
		addIssue(OutsourceDiagnosticsIssue{
			Severity:     OutsourceDiagnosticsSeverityCritical,
			Type:         outsourceDiagnosticsIssueLineTransferSummaryMismatch,
			OrderID:      line.OrderID,
			OrderNo:      line.OrderNo,
			LineID:       line.LineID,
			LineNo:       line.LineNo,
			Message:      "委外明细已发出汇总与发出事实表合计不一致。",
			QuantityDiff: transferAgg.Sent - line.SentQuantity,
			Metadata: outsourceDiagnosticsLineMetadata(line, map[string]string{
				"field":          "sentQuantity",
				"lineValue":      formatOutsourceQuantity(line.SentQuantity),
				"factTotalValue": formatOutsourceQuantity(transferAgg.Sent),
			}),
		})
	}
	if !outsourceDiagnosticsFloatEqual(transferAgg.Returned, line.ReturnedQuantity) {
		addIssue(OutsourceDiagnosticsIssue{
			Severity:     OutsourceDiagnosticsSeverityCritical,
			Type:         outsourceDiagnosticsIssueLineTransferSummaryMismatch,
			OrderID:      line.OrderID,
			OrderNo:      line.OrderNo,
			LineID:       line.LineID,
			LineNo:       line.LineNo,
			Message:      "委外明细已回厂汇总与回厂事实表合计不一致。",
			QuantityDiff: transferAgg.Returned - line.ReturnedQuantity,
			Metadata: outsourceDiagnosticsLineMetadata(line, map[string]string{
				"field":          "returnedQuantity",
				"lineValue":      formatOutsourceQuantity(line.ReturnedQuantity),
				"factTotalValue": formatOutsourceQuantity(transferAgg.Returned),
			}),
		})
	}
}

func checkOutsourceLineInspectionSummary(
	line outsourceDiagnosticsLine,
	inspectionAgg outsourceDiagnosticsInspectionAgg,
	addIssue func(OutsourceDiagnosticsIssue),
) {
	checkOutsourceLineInspectionQuantity("acceptedQuantity", "委外明细合格汇总与检验事实表合计不一致。", line, inspectionAgg.Accepted, line.AcceptedQuantity, addIssue)
	checkOutsourceLineInspectionQuantity("rejectedQuantity", "委外明细不合格汇总与检验事实表合计不一致。", line, inspectionAgg.Rejected, line.RejectedQuantity, addIssue)
	checkOutsourceLineInspectionQuantity("reworkQuantity", "委外明细返工汇总与检验事实表合计不一致。", line, inspectionAgg.Rework, line.ReworkQuantity, addIssue)
	checkOutsourceLineInspectionQuantity("scrapQuantity", "委外明细报废汇总与检验事实表合计不一致。", line, inspectionAgg.Scrap, line.ScrapQuantity, addIssue)
}

func checkOutsourceLineInspectionQuantity(
	field string,
	message string,
	line outsourceDiagnosticsLine,
	factTotal float64,
	lineValue float64,
	addIssue func(OutsourceDiagnosticsIssue),
) {
	if outsourceDiagnosticsFloatEqual(factTotal, lineValue) {
		return
	}
	addIssue(OutsourceDiagnosticsIssue{
		Severity:     OutsourceDiagnosticsSeverityCritical,
		Type:         outsourceDiagnosticsIssueLineInspectionSummaryMismatch,
		OrderID:      line.OrderID,
		OrderNo:      line.OrderNo,
		LineID:       line.LineID,
		LineNo:       line.LineNo,
		Message:      message,
		QuantityDiff: factTotal - lineValue,
		Metadata: outsourceDiagnosticsLineMetadata(line, map[string]string{
			"field":          field,
			"lineValue":      formatOutsourceQuantity(lineValue),
			"factTotalValue": formatOutsourceQuantity(factTotal),
		}),
	})
}

func outsourceDiagnosticsQuantityInvariantIssue(
	line outsourceDiagnosticsLine,
	message string,
	quantityDiff float64,
	field string,
	actual float64,
	expectedLimit float64,
) OutsourceDiagnosticsIssue {
	return OutsourceDiagnosticsIssue{
		Severity:     OutsourceDiagnosticsSeverityCritical,
		Type:         outsourceDiagnosticsIssueQuantityInvariantViolation,
		OrderID:      line.OrderID,
		OrderNo:      line.OrderNo,
		LineID:       line.LineID,
		LineNo:       line.LineNo,
		Message:      message,
		QuantityDiff: quantityDiff,
		Metadata: outsourceDiagnosticsLineMetadata(line, map[string]string{
			"field":         field,
			"actual":        formatOutsourceQuantity(actual),
			"expectedLimit": formatOutsourceQuantity(expectedLimit),
		}),
	}
}

func outsourceDiagnosticsTransferMetadata(transfer models.OutsourceTransfer) map[string]string {
	return map[string]string{
		"transferId":      strings.TrimSpace(transfer.ID),
		"transferNo":      strings.TrimSpace(transfer.TransferNo),
		"transferType":    strings.TrimSpace(transfer.TransferType),
		"transferEventId": strings.TrimSpace(transfer.TransferEventID),
		"quantity":        formatOutsourceQuantity(transfer.Quantity),
	}
}

func outsourceDiagnosticsInspectionMetadata(inspection models.OutsourceInspection) map[string]string {
	return map[string]string{
		"inspectionId":     strings.TrimSpace(inspection.ID),
		"inspectionNo":     strings.TrimSpace(inspection.InspectionNo),
		"inspectionTaskId": strings.TrimSpace(inspection.InspectionTaskID),
		"operationId":      strings.TrimSpace(inspection.OperationID),
		"result":           strings.TrimSpace(inspection.Result),
		"disposition":      strings.TrimSpace(inspection.Disposition),
		"quantity":         formatOutsourceQuantity(inspection.InspectedQuantity),
	}
}

func outsourceDiagnosticsLineMetadata(line outsourceDiagnosticsLine, extra map[string]string) map[string]string {
	metadata := map[string]string{
		"productCode": strings.TrimSpace(line.ProductCode),
		"productName": strings.TrimSpace(line.ProductName),
		"uom":         strings.TrimSpace(line.UOM),
	}
	for key, value := range extra {
		metadata[key] = value
	}
	return metadata
}

func normalizeOutsourceDiagnosticsSeverity(value string) string {
	switch strings.ToUpper(strings.TrimSpace(value)) {
	case OutsourceDiagnosticsSeverityCritical:
		return OutsourceDiagnosticsSeverityCritical
	case OutsourceDiagnosticsSeverityWarning:
		return OutsourceDiagnosticsSeverityWarning
	default:
		return OutsourceDiagnosticsSeverityInfo
	}
}

func outsourceDiagnosticsSeverityRank(value string) int {
	switch normalizeOutsourceDiagnosticsSeverity(value) {
	case OutsourceDiagnosticsSeverityCritical:
		return 0
	case OutsourceDiagnosticsSeverityWarning:
		return 1
	default:
		return 2
	}
}

func outsourceDiagnosticsFloatEqual(left float64, right float64) bool {
	return math.Abs(left-right) <= outsourceQuantityEpsilon
}

func firstStringPart(values []string, index int) string {
	if index < 0 || index >= len(values) {
		return ""
	}
	return values[index]
}
