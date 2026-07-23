package services

import (
	"context"
	"errors"
	"sort"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

var (
	ErrBusinessAnalysisDatabaseUnavailable = errors.New("business analysis database is unavailable")
	ErrBusinessAnalysisInvalidDateRange    = errors.New("business analysis date range must have a positive duration")
)

// BusinessAnalysisProductionCapacityQuery is the stable read-only query contract
// for the first production analysis report.
//
// From is inclusive and To is exclusive. The production plan date is anchored
// to StartDate, falling back to CreatedAt when StartDate is not present.
type BusinessAnalysisProductionCapacityQuery struct {
	From            time.Time
	To              time.Time
	CustomerID      string
	ProductID       string
	Status          string
	IncludeCanceled bool
}

type BusinessAnalysisFilters struct {
	From            string `json:"from"`
	To              string `json:"to"`
	CustomerID      string `json:"customerId,omitempty"`
	ProductID       string `json:"productId,omitempty"`
	Status          string `json:"status,omitempty"`
	IncludeCanceled bool   `json:"includeCanceled"`
}

type BusinessAnalysisSummary struct {
	PlannedQuantity   float64  `json:"plannedQuantity"`
	CompletedQuantity float64  `json:"completedQuantity"`
	QualifiedQuantity *float64 `json:"qualifiedQuantity"`
	ScrapQuantity     *float64 `json:"scrapQuantity"`
	AchievementRate   *float64 `json:"achievementRate"`
	YieldRate         *float64 `json:"yieldRate"`
	ScrapRate         *float64 `json:"scrapRate"`
}

type BusinessAnalysisProductBreakdown struct {
	ProductID         string  `json:"productId"`
	ProductName       string  `json:"productName"`
	PlannedQuantity   float64 `json:"plannedQuantity"`
	CompletedQuantity float64 `json:"completedQuantity"`
}

type BusinessAnalysisCustomerBreakdown struct {
	CustomerID        string  `json:"customerId"`
	CustomerName      string  `json:"customerName"`
	PlannedQuantity   float64 `json:"plannedQuantity"`
	CompletedQuantity float64 `json:"completedQuantity"`
}

type BusinessAnalysisDayBreakdown struct {
	Date              string  `json:"date"`
	PlannedQuantity   float64 `json:"plannedQuantity"`
	CompletedQuantity float64 `json:"completedQuantity"`
}

type BusinessAnalysisBreakdowns struct {
	ByProduct  []BusinessAnalysisProductBreakdown  `json:"byProduct"`
	ByCustomer []BusinessAnalysisCustomerBreakdown `json:"byCustomer"`
	ByDay      []BusinessAnalysisDayBreakdown      `json:"byDay"`
}

type BusinessAnalysisDataQuality struct {
	QualityScrapRecordCount           int64    `json:"qualityScrapRecordCount"`
	UnlinkedQualityRecords            int64    `json:"unlinkedQualityRecords"`
	MissingQuantityRecords            int64    `json:"missingQuantityRecords"`
	MissingOccurrenceTimestampRecords int64    `json:"missingOccurrenceTimestampRecords"`
	MissingCompletionTimestampRecords int64    `json:"missingCompletionTimestampRecords"`
	UnlinkedProductionOrderRecords    int64    `json:"unlinkedProductionOrderRecords"`
	QualityQuantityAvailable          bool     `json:"qualityQuantityAvailable"`
	QualityProductionLinkageAvailable bool     `json:"qualityProductionLinkageAvailable"`
	IsComplete                        bool     `json:"isComplete"`
	Notes                             []string `json:"notes"`
}

type BusinessAnalysisProductionCapacityResponse struct {
	Filters     BusinessAnalysisFilters     `json:"filters"`
	Summary     BusinessAnalysisSummary     `json:"summary"`
	Breakdowns  BusinessAnalysisBreakdowns  `json:"breakdowns"`
	DataQuality BusinessAnalysisDataQuality `json:"dataQuality"`
}

type BusinessAnalysisFilterOption struct {
	ID    string `json:"id"`
	Label string `json:"label"`
	Code  string `json:"code,omitempty"`
}

type BusinessAnalysisProductionCapacityOptionsResponse struct {
	Customers []BusinessAnalysisFilterOption `json:"customers"`
	Products  []BusinessAnalysisFilterOption `json:"products"`
}

type BusinessAnalysisService struct {
	database *gorm.DB
}

func NewBusinessAnalysisService(database *gorm.DB) *BusinessAnalysisService {
	return &BusinessAnalysisService{database: database}
}

func QueryBusinessAnalysisProductionCapacity(
	ctx context.Context,
	query BusinessAnalysisProductionCapacityQuery,
) (BusinessAnalysisProductionCapacityResponse, error) {
	return NewBusinessAnalysisService(db.DB).QueryProductionCapacity(ctx, query)
}

func ListBusinessAnalysisProductionCapacityOptions(
	ctx context.Context,
) (BusinessAnalysisProductionCapacityOptionsResponse, error) {
	return NewBusinessAnalysisService(db.DB).ListProductionCapacityOptions(ctx)
}

func (s *BusinessAnalysisService) ListProductionCapacityOptions(
	ctx context.Context,
) (BusinessAnalysisProductionCapacityOptionsResponse, error) {
	if s == nil || s.database == nil {
		return BusinessAnalysisProductionCapacityOptionsResponse{}, ErrBusinessAnalysisDatabaseUnavailable
	}

	var customerRows []struct {
		ID   string `gorm:"column:id"`
		Name string `gorm:"column:name"`
		Code string `gorm:"column:code"`
	}
	if err := s.database.WithContext(ctx).
		Model(&models.Customer{}).
		Select("id, name, code").
		Where("deleted_at IS NULL").
		Order("name ASC").
		Scan(&customerRows).Error; err != nil {
		return BusinessAnalysisProductionCapacityOptionsResponse{}, err
	}

	var productRows []struct {
		ID        string `gorm:"column:id"`
		Name      string `gorm:"column:name"`
		SKU       string `gorm:"column:sku"`
		ModelCode string `gorm:"column:model_code"`
	}
	if err := s.database.WithContext(ctx).
		Model(&models.Product{}).
		Select("id, name, sku, model_code").
		Where("deleted_at IS NULL").
		Order("name ASC").
		Scan(&productRows).Error; err != nil {
		return BusinessAnalysisProductionCapacityOptionsResponse{}, err
	}

	response := BusinessAnalysisProductionCapacityOptionsResponse{
		Customers: make([]BusinessAnalysisFilterOption, 0, len(customerRows)),
		Products:  make([]BusinessAnalysisFilterOption, 0, len(productRows)),
	}
	for _, row := range customerRows {
		response.Customers = append(response.Customers, BusinessAnalysisFilterOption{
			ID:    row.ID,
			Label: strings.TrimSpace(row.Name),
			Code:  strings.TrimSpace(row.Code),
		})
	}
	for _, row := range productRows {
		label := strings.TrimSpace(row.Name)
		if modelCode := strings.TrimSpace(row.ModelCode); modelCode != "" {
			label = modelCode + " · " + label
		}
		if label == "" {
			label = strings.TrimSpace(row.SKU)
		}
		response.Products = append(response.Products, BusinessAnalysisFilterOption{
			ID:    row.ID,
			Label: label,
			Code:  strings.TrimSpace(row.SKU),
		})
	}

	return response, nil
}

func (s *BusinessAnalysisService) QueryProductionCapacity(
	ctx context.Context,
	query BusinessAnalysisProductionCapacityQuery,
) (BusinessAnalysisProductionCapacityResponse, error) {
	if s == nil || s.database == nil {
		return BusinessAnalysisProductionCapacityResponse{}, ErrBusinessAnalysisDatabaseUnavailable
	}
	if !query.To.After(query.From) {
		return BusinessAnalysisProductionCapacityResponse{}, ErrBusinessAnalysisInvalidDateRange
	}

	plans, err := s.loadProductionPlans(ctx, query)
	if err != nil {
		return BusinessAnalysisProductionCapacityResponse{}, err
	}

	response := BusinessAnalysisProductionCapacityResponse{
		Filters: BusinessAnalysisFilters{
			From:            query.From.Format("2006-01-02"),
			To:              query.To.Format("2006-01-02"),
			CustomerID:      strings.TrimSpace(query.CustomerID),
			ProductID:       strings.TrimSpace(query.ProductID),
			Status:          strings.TrimSpace(query.Status),
			IncludeCanceled: query.IncludeCanceled,
		},
		Breakdowns: BusinessAnalysisBreakdowns{
			ByProduct:  make([]BusinessAnalysisProductBreakdown, 0),
			ByCustomer: make([]BusinessAnalysisCustomerBreakdown, 0),
			ByDay:      make([]BusinessAnalysisDayBreakdown, 0),
		},
		DataQuality: BusinessAnalysisDataQuality{
			QualityQuantityAvailable:          true,
			QualityProductionLinkageAvailable: true,
			IsComplete:                        false,
			Notes:                             []string{"QUALITY_QUALIFIED_QUANTITY_MISSING"},
		},
	}

	productRows := make(map[string]*BusinessAnalysisProductBreakdown)
	customerRows := make(map[string]*BusinessAnalysisCustomerBreakdown)
	dayRows := make(map[string]*BusinessAnalysisDayBreakdown)

	for _, plan := range plans {
		planDate := productionPlanAnalysisDate(plan)
		planDateInRange := isWithinBusinessAnalysisRange(planDate, query.From, query.To)
		completedTasks := make([]models.ProductionTask, 0, len(plan.Tasks))
		for _, task := range plan.Tasks {
			if isCompletedProductionTask(task) && task.CompletedAt != nil &&
				task.ActualQty >= 0 &&
				isWithinBusinessAnalysisRange(*task.CompletedAt, query.From, query.To) {
				completedTasks = append(completedTasks, task)
			}
			if isCompletedProductionTask(task) && task.CompletedAt == nil && task.ActualQty > 0 {
				response.DataQuality.MissingCompletionTimestampRecords++
			}
		}

		if !planDateInRange && len(completedTasks) == 0 {
			continue
		}

		productKey := strings.TrimSpace(plan.ProductID)
		customerID, customerName := productionPlanCustomer(plan)
		customerKey := customerID
		if customerKey == "" {
			customerKey = "__unlinked__"
		}

		var productRow *BusinessAnalysisProductBreakdown
		if existing := productRows[productKey]; existing != nil {
			productRow = existing
		} else {
			productRow = &BusinessAnalysisProductBreakdown{
				ProductID:   productKey,
				ProductName: strings.TrimSpace(plan.ProductName),
			}
			productRows[productKey] = productRow
		}

		var customerRow *BusinessAnalysisCustomerBreakdown
		if existing := customerRows[customerKey]; existing != nil {
			customerRow = existing
		} else {
			customerRow = &BusinessAnalysisCustomerBreakdown{
				CustomerID:   customerID,
				CustomerName: customerName,
			}
			customerRows[customerKey] = customerRow
		}

		if planDateInRange {
			response.Summary.PlannedQuantity += plan.Quantity
			productRow.PlannedQuantity += plan.Quantity
			customerRow.PlannedQuantity += plan.Quantity

			dayKey := planDate.Format("2006-01-02")
			dayRow := dayRows[dayKey]
			if dayRow == nil {
				dayRow = &BusinessAnalysisDayBreakdown{Date: dayKey}
				dayRows[dayKey] = dayRow
			}
			dayRow.PlannedQuantity += plan.Quantity

			if strings.TrimSpace(plan.OrderID) == "" || plan.SalesOrder == nil {
				response.DataQuality.UnlinkedProductionOrderRecords++
			}
		}

		for _, task := range completedTasks {
			response.Summary.CompletedQuantity += task.ActualQty
			productRow.CompletedQuantity += task.ActualQty
			customerRow.CompletedQuantity += task.ActualQty

			completionDayKey := task.CompletedAt.Format("2006-01-02")
			completionDayRow := dayRows[completionDayKey]
			if completionDayRow == nil {
				completionDayRow = &BusinessAnalysisDayBreakdown{Date: completionDayKey}
				dayRows[completionDayKey] = completionDayRow
			}
			completionDayRow.CompletedQuantity += task.ActualQty
		}
	}

	qualityData, err := s.loadQualityDataQuality(ctx, query)
	if err != nil {
		return BusinessAnalysisProductionCapacityResponse{}, err
	}
	response.DataQuality.QualityScrapRecordCount = qualityData.QualityScrapRecordCount
	response.DataQuality.UnlinkedQualityRecords = qualityData.UnlinkedQualityRecords
	response.DataQuality.MissingQuantityRecords = qualityData.MissingQuantityRecords
	response.DataQuality.MissingOccurrenceTimestampRecords = qualityData.MissingOccurrenceTimestampRecords
	response.DataQuality.QualityQuantityAvailable = qualityData.MissingQuantityRecords == 0
	response.DataQuality.QualityProductionLinkageAvailable = qualityData.UnlinkedQualityRecords == 0
	if response.DataQuality.QualityQuantityAvailable &&
		response.DataQuality.QualityProductionLinkageAvailable {
		scrapQuantity := qualityData.ScrapQuantity
		response.Summary.ScrapQuantity = &scrapQuantity
	}
	response.DataQuality.Notes = businessAnalysisQualityNotes(qualityData)

	if response.Summary.PlannedQuantity > 0 {
		achievementRate := response.Summary.CompletedQuantity / response.Summary.PlannedQuantity
		response.Summary.AchievementRate = &achievementRate
	}

	response.Breakdowns.ByProduct = sortedProductBreakdowns(productRows)
	response.Breakdowns.ByCustomer = sortedCustomerBreakdowns(customerRows)
	response.Breakdowns.ByDay = sortedDayBreakdowns(dayRows)

	return response, nil
}

func (s *BusinessAnalysisService) loadProductionPlans(
	ctx context.Context,
	query BusinessAnalysisProductionCapacityQuery,
) ([]models.ProductionPlan, error) {
	planQuery := s.database.WithContext(ctx).
		Model(&models.ProductionPlan{}).
		Preload("Tasks").
		Preload("SalesOrder").
		Where("production_plans.deleted_at IS NULL").
		Where(
			"((production_plans.start_date >= ? AND production_plans.start_date < ?) OR "+
				"(production_plans.start_date IS NULL AND production_plans.created_at >= ? AND production_plans.created_at < ?) OR "+
				"EXISTS (SELECT 1 FROM production_tasks AS analysis_task WHERE analysis_task.plan_id = production_plans.id "+
				"AND UPPER(TRIM(analysis_task.status)) = 'DONE' AND analysis_task.actual_qty >= 0 "+
				"AND analysis_task.completed_at >= ? AND analysis_task.completed_at < ?))",
			query.From,
			query.To,
			query.From,
			query.To,
			query.From,
			query.To,
		)

	if !query.IncludeCanceled {
		planQuery = planQuery.Where("production_plans.status <> ?", "CANCELED")
	}
	if status := strings.TrimSpace(query.Status); status != "" && status != "ALL" {
		planQuery = planQuery.Where("production_plans.status = ?", status)
	}
	if productID := strings.TrimSpace(query.ProductID); productID != "" {
		planQuery = planQuery.Where("production_plans.product_id = ?", productID)
	}
	if customerID := strings.TrimSpace(query.CustomerID); customerID != "" {
		planQuery = planQuery.
			Joins("INNER JOIN sales_orders AS analysis_order ON analysis_order.id = production_plans.order_id AND analysis_order.deleted_at IS NULL").
			Where("analysis_order.customer_id = ?", customerID)
	}

	var plans []models.ProductionPlan
	if err := planQuery.Order("production_plans.created_at ASC").Find(&plans).Error; err != nil {
		return nil, err
	}
	return plans, nil
}

type businessAnalysisQualityDataQuality struct {
	QualityScrapRecordCount           int64
	UnlinkedQualityRecords            int64
	MissingQuantityRecords            int64
	MissingOccurrenceTimestampRecords int64
	ScrapQuantity                     float64
}

func (s *BusinessAnalysisService) loadQualityDataQuality(
	ctx context.Context,
	query BusinessAnalysisProductionCapacityQuery,
) (businessAnalysisQualityDataQuality, error) {
	var abnormalities []models.QualityAbnormality
	err := s.database.WithContext(ctx).
		Model(&models.QualityAbnormality{}).
		Preload("InspectionTask").
		Where("quality_abnormalities.deleted_at IS NULL").
		Where("UPPER(TRIM(quality_abnormalities.disposal_method)) = ?", "SCRAP").
		Where(
			"(quality_abnormalities.occurred_at >= ? AND quality_abnormalities.occurred_at < ?) OR "+
				"(quality_abnormalities.occurred_at IS NULL AND quality_abnormalities.created_at >= ? AND quality_abnormalities.created_at < ?)",
			query.From,
			query.To,
			query.From,
			query.To,
		).
		Order("quality_abnormalities.created_at ASC").
		Find(&abnormalities).Error
	if err != nil {
		return businessAnalysisQualityDataQuality{}, err
	}

	planIDs := make([]string, 0)
	orderIDs := make([]string, 0)
	seenPlanIDs := make(map[string]struct{})
	seenOrderIDs := make(map[string]struct{})
	for _, abnormality := range abnormalities {
		planID := strings.TrimSpace(abnormality.ProductionPlanID)
		orderID := strings.TrimSpace(abnormality.OrderID)
		if abnormality.InspectionTask != nil {
			if planID == "" {
				planID = strings.TrimSpace(abnormality.InspectionTask.ProductionPlanID)
			}
			if orderID == "" {
				orderID = strings.TrimSpace(abnormality.InspectionTask.OrderID)
			}
		}
		if planID != "" {
			if _, exists := seenPlanIDs[planID]; !exists {
				seenPlanIDs[planID] = struct{}{}
				planIDs = append(planIDs, planID)
			}
		}
		if orderID != "" {
			if _, exists := seenOrderIDs[orderID]; !exists {
				seenOrderIDs[orderID] = struct{}{}
				orderIDs = append(orderIDs, orderID)
			}
		}
	}

	plansByID := make(map[string]models.ProductionPlan, len(planIDs))
	if len(planIDs) > 0 {
		var plans []models.ProductionPlan
		if err := s.database.WithContext(ctx).
			Preload("SalesOrder").
			Where("production_plans.id IN ?", planIDs).
			Find(&plans).Error; err != nil {
			return businessAnalysisQualityDataQuality{}, err
		}
		for _, plan := range plans {
			plansByID[plan.ID] = plan
		}
	}

	ordersByID := make(map[string]models.SalesOrder, len(orderIDs))
	if len(orderIDs) > 0 {
		var orders []models.SalesOrder
		if err := s.database.WithContext(ctx).
			Where("sales_orders.id IN ?", orderIDs).
			Find(&orders).Error; err != nil {
			return businessAnalysisQualityDataQuality{}, err
		}
		for _, order := range orders {
			ordersByID[order.ID] = order
		}
	}

	var result businessAnalysisQualityDataQuality
	for _, abnormality := range abnormalities {
		planID, orderID, productID, batchNo := qualityAbnormalityLinkage(abnormality)
		plan := plansByID[planID]
		if planID != "" {
			if orderID == "" {
				orderID = strings.TrimSpace(plan.OrderID)
			}
			if productID == "" {
				productID = strings.TrimSpace(plan.ProductID)
			}
		}

		if query.Status != "" && query.Status != "ALL" &&
			(strings.TrimSpace(planID) == "" ||
				!strings.EqualFold(strings.TrimSpace(plan.Status), strings.TrimSpace(query.Status))) {
			continue
		}
		if !query.IncludeCanceled && strings.EqualFold(strings.TrimSpace(plan.Status), "CANCELED") {
			continue
		}
		if productIDFilter := strings.TrimSpace(query.ProductID); productIDFilter != "" {
			if productID == "" || productID != productIDFilter {
				if productID == "" {
					result.UnlinkedQualityRecords++
				}
				continue
			}
		}

		customerID := ""
		if orderID != "" {
			if order, exists := ordersByID[orderID]; exists {
				customerID = strings.TrimSpace(order.CustomerID)
			}
		}
		if plan.SalesOrder != nil && customerID == "" {
			customerID = strings.TrimSpace(plan.SalesOrder.CustomerID)
		}
		if customerIDFilter := strings.TrimSpace(query.CustomerID); customerIDFilter != "" {
			if customerID == "" || customerID != customerIDFilter {
				if customerID == "" {
					result.UnlinkedQualityRecords++
				}
				continue
			}
		}

		result.QualityScrapRecordCount++
		if abnormality.OccurredAt == nil {
			result.MissingOccurrenceTimestampRecords++
		}
		if abnormality.ScrapQuantity == nil || *abnormality.ScrapQuantity <= 0 {
			result.MissingQuantityRecords++
		} else {
			result.ScrapQuantity += *abnormality.ScrapQuantity
		}
		if qualityAbnormalityMissingProductionLinkage(planID, orderID, productID, batchNo) {
			result.UnlinkedQualityRecords++
		}
	}

	return result, nil
}

func qualityAbnormalityMissingProductionLinkage(planID, orderID, productID, batchNo string) bool {
	hasProductionAnchor := strings.TrimSpace(planID) != "" || strings.TrimSpace(orderID) != ""
	return !hasProductionAnchor || strings.TrimSpace(productID) == "" || strings.TrimSpace(batchNo) == ""
}

func qualityAbnormalityLinkage(abnormality models.QualityAbnormality) (string, string, string, string) {
	planID := strings.TrimSpace(abnormality.ProductionPlanID)
	orderID := strings.TrimSpace(abnormality.OrderID)
	productID := strings.TrimSpace(abnormality.ProductID)
	batchNo := strings.TrimSpace(abnormality.BatchNo)
	if abnormality.InspectionTask == nil {
		return planID, orderID, productID, batchNo
	}
	if planID == "" {
		planID = strings.TrimSpace(abnormality.InspectionTask.ProductionPlanID)
	}
	if orderID == "" {
		orderID = strings.TrimSpace(abnormality.InspectionTask.OrderID)
	}
	if productID == "" {
		productID = strings.TrimSpace(abnormality.InspectionTask.ProductID)
	}
	if batchNo == "" {
		batchNo = strings.TrimSpace(abnormality.InspectionTask.BatchNo)
	}
	return planID, orderID, productID, batchNo
}

func businessAnalysisQualityNotes(data businessAnalysisQualityDataQuality) []string {
	notes := make([]string, 0, 4)
	if data.MissingQuantityRecords > 0 {
		notes = append(notes, "QUALITY_SCRAP_QUANTITY_MISSING")
	}
	if data.UnlinkedQualityRecords > 0 {
		notes = append(notes, "QUALITY_PRODUCTION_LINKAGE_MISSING")
	}
	if data.MissingOccurrenceTimestampRecords > 0 {
		notes = append(notes, "QUALITY_OCCURRENCE_TIMESTAMP_MISSING")
	}
	// A scrap fact alone cannot prove the qualified quantity. That remains a
	// separate quality contract and must not be inferred from production output.
	notes = append(notes, "QUALITY_QUALIFIED_QUANTITY_MISSING")
	return notes
}

func productionPlanAnalysisDate(plan models.ProductionPlan) time.Time {
	if plan.StartDate != nil {
		return *plan.StartDate
	}
	return plan.CreatedAt
}

func productionPlanCustomer(plan models.ProductionPlan) (string, string) {
	if plan.SalesOrder == nil {
		return "", ""
	}
	return strings.TrimSpace(plan.SalesOrder.CustomerID), strings.TrimSpace(plan.SalesOrder.CustomerName)
}

func isWithinBusinessAnalysisRange(value, from, to time.Time) bool {
	return !value.Before(from) && value.Before(to)
}

func isCompletedProductionTask(task models.ProductionTask) bool {
	return strings.EqualFold(strings.TrimSpace(task.Status), "DONE")
}

func sortedProductBreakdowns(rows map[string]*BusinessAnalysisProductBreakdown) []BusinessAnalysisProductBreakdown {
	result := make([]BusinessAnalysisProductBreakdown, 0, len(rows))
	for _, row := range rows {
		result = append(result, *row)
	}
	sort.SliceStable(result, func(i, j int) bool {
		if result[i].CompletedQuantity == result[j].CompletedQuantity {
			return result[i].ProductName < result[j].ProductName
		}
		return result[i].CompletedQuantity > result[j].CompletedQuantity
	})
	return result
}

func sortedCustomerBreakdowns(rows map[string]*BusinessAnalysisCustomerBreakdown) []BusinessAnalysisCustomerBreakdown {
	result := make([]BusinessAnalysisCustomerBreakdown, 0, len(rows))
	for _, row := range rows {
		result = append(result, *row)
	}
	sort.SliceStable(result, func(i, j int) bool {
		if result[i].CompletedQuantity == result[j].CompletedQuantity {
			return result[i].CustomerName < result[j].CustomerName
		}
		return result[i].CompletedQuantity > result[j].CompletedQuantity
	})
	return result
}

func sortedDayBreakdowns(rows map[string]*BusinessAnalysisDayBreakdown) []BusinessAnalysisDayBreakdown {
	result := make([]BusinessAnalysisDayBreakdown, 0, len(rows))
	for _, row := range rows {
		result = append(result, *row)
	}
	sort.SliceStable(result, func(i, j int) bool {
		return result[i].Date < result[j].Date
	})
	return result
}
