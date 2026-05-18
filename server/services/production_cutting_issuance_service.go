// Package services - 切料发料执行(产品工程裁布料场景)。
//
// 业务背景: 复合材料生产中,从一卷预浸料按裁切计划划分尺寸 → 发到产线 → 关联到具体销售订单行。
// 本服务管理这条"卷料 → 裁料 → 发料 → 关联订单"的执行链:
//   - CreateCuttingIssuanceExecution    创建一次发料执行(支持多 batch 一次性下发)
//   - ListCuttingIssuanceExecutions     列表/筛选
//   - GetCuttingIssuanceTraceReport     按订单/批次回溯
//
// 关键不变量:
//   - 发料前必须校验销售订单线状态 + 模板兼容性(validateTemplateCompatibility)
//   - 发料过程加锁读销售单(loadSalesOrderLineSnapshot lock=true)避免并发超额
//   - 发料执行同步生成 ProductionTask(产线工单),后续工序消费
//   - 模板键(modelKey)规范化处理大小写/全角空白,保证匹配稳定
package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"sort"
	"strconv"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type CuttingIssuanceBatchRequest struct {
	BatchNo      int     `json:"batchNo"`
	RimQuantity  float64 `json:"rimQuantity"`
	LineQuantity float64 `json:"lineQuantity"`
}

type CreateCuttingIssuanceExecutionRequest struct {
	OrderNo           string                        `json:"orderNo"`
	OrderID           string                        `json:"orderId"`
	SalesOrderLineNo  int                           `json:"salesOrderLineNo"`
	ProductModel      string                        `json:"productModel"`
	ProductCode       string                        `json:"productCode"`
	ProductID         string                        `json:"productId"`
	HoleCount         int                           `json:"holeCount"`
	TemplateID        string                        `json:"templateId"`
	TemplateName      string                        `json:"templateName"`
	TemplateVersion   string                        `json:"templateVersion"`
	Quantity          float64                       `json:"quantity"`
	TotalLineQuantity float64                       `json:"totalLineQuantity"`
	Status            string                        `json:"status"`
	Batches           []CuttingIssuanceBatchRequest `json:"batches"`
}

type CuttingIssuanceListQuery struct {
	Page          int
	PageSize      int
	OrderNo       string
	Status        string
	ProductModel  string
	HoleCount     *int
	CreatedAtFrom *time.Time
	CreatedAtTo   *time.Time
}

type CuttingIssuanceBatchResponse struct {
	ID           string  `json:"id"`
	ExecutionID  string  `json:"executionId"`
	BatchNo      int     `json:"batchNo"`
	RimQuantity  float64 `json:"rimQuantity"`
	LineQuantity float64 `json:"lineQuantity"`
}

type CuttingIssuanceExecutionResponse struct {
	ID                string                         `json:"id"`
	ProductionPlanID  string                         `json:"productionPlanId"`
	OrderNo           string                         `json:"orderNo"`
	OrderID           string                         `json:"orderId"`
	SalesOrderLineNo  int                            `json:"salesOrderLineNo"`
	ProductModel      string                         `json:"productModel"`
	ProductCode       string                         `json:"productCode"`
	HoleCount         int                            `json:"holeCount"`
	TemplateID        string                         `json:"templateId"`
	TemplateName      string                         `json:"templateName"`
	TemplateVersion   string                         `json:"templateVersion"`
	Quantity          float64                        `json:"quantity"`
	TotalLineQuantity float64                        `json:"totalLineQuantity"`
	Status            string                         `json:"status"`
	Source            string                         `json:"source"`
	CreatedAt         string                         `json:"createdAt"`
	UpdatedAt         string                         `json:"updatedAt"`
	Batches           []CuttingIssuanceBatchResponse `json:"batches"`
}

type CuttingIssuanceExecutionListResponse struct {
	Items    []CuttingIssuanceExecutionResponse `json:"items"`
	Total    int64                              `json:"total"`
	Page     int                                `json:"page"`
	PageSize int                                `json:"pageSize"`
}

type CuttingIssuanceTraceSummary struct {
	ExecutionCount    int64   `json:"executionCount"`
	OrderCount        int64   `json:"orderCount"`
	BatchCount        int64   `json:"batchCount"`
	TotalRimQuantity  float64 `json:"totalRimQuantity"`
	TotalLineQuantity float64 `json:"totalLineQuantity"`
	EarliestCreatedAt string  `json:"earliestCreatedAt"`
	LatestCreatedAt   string  `json:"latestCreatedAt"`
}

type CuttingIssuanceTraceByStatusItem struct {
	Status            string  `json:"status"`
	ExecutionCount    int64   `json:"executionCount"`
	TotalRimQuantity  float64 `json:"totalRimQuantity"`
	TotalLineQuantity float64 `json:"totalLineQuantity"`
}

type CuttingIssuanceTraceByModelItem struct {
	ProductModel      string  `json:"productModel"`
	HoleCount         int     `json:"holeCount"`
	ExecutionCount    int64   `json:"executionCount"`
	TotalRimQuantity  float64 `json:"totalRimQuantity"`
	TotalLineQuantity float64 `json:"totalLineQuantity"`
}

type CuttingIssuanceTraceReportResponse struct {
	Summary  CuttingIssuanceTraceSummary        `json:"summary"`
	ByStatus []CuttingIssuanceTraceByStatusItem `json:"byStatus"`
	ByModel  []CuttingIssuanceTraceByModelItem  `json:"byModel"`
}

const (
	cuttingIssuanceSource      = "APS_CUTTING_ISSUANCE"
	cuttingIssuanceProcessName = "CUTTING_ISSUANCE"
	cuttingPlanSpecType        = "CUTTING_PLAN"
)

type cuttingPlanSnapshot struct {
	Name        string            `json:"name"`
	ProductName string            `json:"productName"`
	ProductCode string            `json:"productCode"`
	HoleCount   string            `json:"holeCount"`
	Status      string            `json:"status"`
	RevisionNo  string            `json:"revisionNo"`
	Lines       []json.RawMessage `json:"lines"`
}

type salesOrderLineSnapshot struct {
	OrderNo      string
	LineNo       int
	ProductModel string
	ProductCode  string
	HoleCount    int
	Quantity     float64
}

func normalizeCuttingIssuanceStatus(value string) string {
	status := strings.TrimSpace(value)
	if status == "" {
		return "SCHEDULED"
	}
	return strings.ToUpper(status)
}

func normalizeCuttingModelKey(value string) string {
	return strings.ToUpper(strings.ReplaceAll(strings.TrimSpace(value), " ", ""))
}

func parseNonNegativeInt(raw string) int {
	value, err := strconv.Atoi(strings.TrimSpace(raw))
	if err != nil || value < 0 {
		return 0
	}
	return value
}

func hasModelIntersection(valuesA []string, valuesB []string) bool {
	keys := make(map[string]struct{}, len(valuesA))
	for _, value := range valuesA {
		key := normalizeCuttingModelKey(value)
		if key == "" {
			continue
		}
		keys[key] = struct{}{}
	}
	for _, value := range valuesB {
		key := normalizeCuttingModelKey(value)
		if key == "" {
			continue
		}
		if _, exists := keys[key]; exists {
			return true
		}
	}
	return false
}

func loadSalesOrderLineSnapshot(tx *gorm.DB, req CreateCuttingIssuanceExecutionRequest, lock bool) (*salesOrderLineSnapshot, error) {
	var order models.SalesOrder
	query := tx.Preload("Lines").Where("id = ?", req.OrderID)
	if lock {
		query = query.Clauses(clause.Locking{Strength: "UPDATE"})
	}
	if err := query.First(&order).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("orderId not found")
		}
		return nil, err
	}
	if strings.TrimSpace(order.OrderNo) != req.OrderNo {
		return nil, errors.New("orderNo does not match orderId")
	}

	for _, line := range order.Lines {
		if line.LineNo == req.SalesOrderLineNo {
			return &salesOrderLineSnapshot{
				OrderNo:      strings.TrimSpace(order.OrderNo),
				LineNo:       line.LineNo,
				ProductModel: strings.TrimSpace(line.ProductModel),
				ProductCode:  strings.TrimSpace(line.ProductCode),
				HoleCount:    line.HoleCount,
				Quantity:     line.Qty,
			}, nil
		}
	}
	return nil, errors.New("salesOrderLineNo not found in order")
}

func loadCuttingPlanSnapshot(tx *gorm.DB, templateID string) (*cuttingPlanSnapshot, error) {
	var template models.EngineeringSpec
	if err := tx.Where("id = ? AND type = ?", strings.TrimSpace(templateID), cuttingPlanSpecType).First(&template).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("templateId not found")
		}
		return nil, err
	}
	if !template.Active {
		return nil, errors.New("template is inactive")
	}

	var snapshot cuttingPlanSnapshot
	if len(template.CuttingData) > 0 {
		if err := json.Unmarshal(template.CuttingData, &snapshot); err != nil {
			return nil, errors.New("template cuttingData is invalid")
		}
	}
	if strings.TrimSpace(snapshot.Name) == "" {
		snapshot.Name = strings.TrimSpace(template.Name)
	}
	return &snapshot, nil
}

func validateTemplateCompatibility(
	req CreateCuttingIssuanceExecutionRequest,
	line *salesOrderLineSnapshot,
	template *cuttingPlanSnapshot,
) error {
	if line == nil {
		return errors.New("order line snapshot is required")
	}
	if template == nil {
		return errors.New("template snapshot is required")
	}
	if strings.TrimSpace(template.Status) != "Active" {
		return errors.New("template status must be Active")
	}
	if len(template.Lines) == 0 {
		return errors.New("template has no cutting lines")
	}
	if line.Quantity <= 0 {
		return errors.New("order line quantity must be greater than zero")
	}
	if math.Abs(line.Quantity-req.Quantity) > 0.00001 {
		return errors.New("quantity must equal sales order line quantity")
	}

	lineModels := []string{line.ProductModel, line.ProductCode}
	templateModels := []string{template.ProductName, template.ProductCode}
	if !hasModelIntersection(lineModels, templateModels) {
		return errors.New("template model does not match sales order line model")
	}

	templateHoleCount := parseNonNegativeInt(template.HoleCount)
	if line.HoleCount > 0 {
		if templateHoleCount <= 0 {
			return errors.New("template holeCount is required for matched sales order line")
		}
		if templateHoleCount != line.HoleCount {
			return errors.New("template holeCount does not match sales order line holeCount")
		}
	}
	return nil
}

func normalizeCreateCuttingIssuanceExecutionRequest(input CreateCuttingIssuanceExecutionRequest) CreateCuttingIssuanceExecutionRequest {
	input.OrderNo = strings.TrimSpace(input.OrderNo)
	input.OrderID = strings.TrimSpace(input.OrderID)
	input.ProductModel = strings.TrimSpace(input.ProductModel)
	input.ProductCode = strings.TrimSpace(input.ProductCode)
	input.ProductID = strings.TrimSpace(input.ProductID)
	input.TemplateID = strings.TrimSpace(input.TemplateID)
	input.TemplateName = strings.TrimSpace(input.TemplateName)
	input.TemplateVersion = strings.TrimSpace(input.TemplateVersion)
	input.Status = normalizeCuttingIssuanceStatus(input.Status)
	if input.SalesOrderLineNo < 0 {
		input.SalesOrderLineNo = 0
	}
	if input.HoleCount < 0 {
		input.HoleCount = 0
	}
	return input
}

func validateCuttingIssuanceRequest(input CreateCuttingIssuanceExecutionRequest) error {
	if input.OrderNo == "" {
		return errors.New("orderNo is required")
	}
	if input.OrderID == "" {
		return errors.New("orderId is required")
	}
	if input.ProductModel == "" {
		return errors.New("productModel is required")
	}
	if input.TemplateID == "" {
		return errors.New("templateId is required")
	}
	if input.TemplateName == "" {
		return errors.New("templateName is required")
	}
	if input.Quantity <= 0 {
		return errors.New("quantity must be greater than zero")
	}
	if input.TotalLineQuantity <= 0 {
		return errors.New("totalLineQuantity must be greater than zero")
	}
	if !IsProductionPlanStatus(input.Status) {
		return fmt.Errorf("%w: %s", ErrInvalidProductionPlanStatus, input.Status)
	}
	if len(input.Batches) == 0 {
		return errors.New("batches is required")
	}
	seenBatchNo := make(map[int]struct{}, len(input.Batches))
	var rimTotal float64
	var lineTotal float64
	for index, batch := range input.Batches {
		if batch.BatchNo <= 0 {
			return fmt.Errorf("batch[%d].batchNo must be greater than zero", index)
		}
		if _, exists := seenBatchNo[batch.BatchNo]; exists {
			return fmt.Errorf("batch[%d].batchNo must be unique", index)
		}
		seenBatchNo[batch.BatchNo] = struct{}{}
		if batch.RimQuantity <= 0 {
			return fmt.Errorf("batch[%d].rimQuantity must be greater than zero", index)
		}
		if batch.LineQuantity <= 0 {
			return fmt.Errorf("batch[%d].lineQuantity must be greater than zero", index)
		}
		rimTotal += batch.RimQuantity
		lineTotal += batch.LineQuantity
	}
	if math.Abs(rimTotal-input.Quantity) > 0.00001 {
		return errors.New("sum of batches.rimQuantity must equal quantity")
	}
	if math.Abs(lineTotal-input.TotalLineQuantity) > 0.00001 {
		return errors.New("sum of batches.lineQuantity must equal totalLineQuantity")
	}
	return nil
}

func mapCuttingIssuanceBatchToResponse(batch models.CuttingIssuanceBatch) CuttingIssuanceBatchResponse {
	return CuttingIssuanceBatchResponse{
		ID:           batch.ID,
		ExecutionID:  batch.ExecutionID,
		BatchNo:      batch.BatchNo,
		RimQuantity:  batch.RimQuantity,
		LineQuantity: batch.LineQuantity,
	}
}

func mapCuttingIssuanceExecutionToResponse(item models.CuttingIssuanceExecution) CuttingIssuanceExecutionResponse {
	batches := make([]CuttingIssuanceBatchResponse, 0, len(item.Batches))
	for _, batch := range item.Batches {
		batches = append(batches, mapCuttingIssuanceBatchToResponse(batch))
	}
	sort.SliceStable(batches, func(i, j int) bool {
		return batches[i].BatchNo < batches[j].BatchNo
	})

	return CuttingIssuanceExecutionResponse{
		ID:                item.ID,
		ProductionPlanID:  item.ProductionPlanID,
		OrderNo:           item.OrderNo,
		OrderID:           item.OrderID,
		SalesOrderLineNo:  item.SalesOrderLineNo,
		ProductModel:      item.ProductModel,
		ProductCode:       item.ProductCode,
		HoleCount:         item.HoleCount,
		TemplateID:        item.TemplateID,
		TemplateName:      item.TemplateName,
		TemplateVersion:   item.TemplateVersion,
		Quantity:          item.Quantity,
		TotalLineQuantity: item.TotalLineQuantity,
		Status:            item.Status,
		Source:            item.Source,
		CreatedAt:         item.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:         item.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		Batches:           batches,
	}
}

func formatCuttingIssuanceTime(value *time.Time) string {
	if value == nil || value.IsZero() {
		return ""
	}
	return value.UTC().Format(time.RFC3339)
}

func applyCuttingIssuanceFilters(tx *gorm.DB, query CuttingIssuanceListQuery) *gorm.DB {
	orderNo := strings.TrimSpace(query.OrderNo)
	if orderNo != "" {
		tx = tx.Where("order_no ILIKE ?", "%"+orderNo+"%")
	}

	rawStatus := strings.TrimSpace(query.Status)
	if rawStatus != "" {
		tx = tx.Where("status = ?", normalizeCuttingIssuanceStatus(rawStatus))
	}

	productModel := strings.TrimSpace(query.ProductModel)
	if productModel != "" {
		tx = tx.Where("product_model ILIKE ?", "%"+productModel+"%")
	}

	if query.HoleCount != nil {
		tx = tx.Where("hole_count = ?", *query.HoleCount)
	}
	if query.CreatedAtFrom != nil {
		tx = tx.Where("created_at >= ?", query.CreatedAtFrom.UTC())
	}
	if query.CreatedAtTo != nil {
		tx = tx.Where("created_at <= ?", query.CreatedAtTo.UTC())
	}
	return tx
}

func buildProductionTasksFromCuttingBatches(batches []CuttingIssuanceBatchRequest, orderNo string, lineNo int) []models.ProductionTask {
	items := make([]models.ProductionTask, 0, len(batches))
	for _, batch := range batches {
		items = append(items, models.ProductionTask{
			BatchNo:     fmt.Sprintf("%s-%d-%d", orderNo, lineNo, batch.BatchNo),
			ProcessName: cuttingIssuanceProcessName,
			TargetQty:   batch.RimQuantity,
			ActualQty:   0,
			Status:      "PENDING",
		})
	}
	return items
}

func CreateCuttingIssuanceExecution(
	input CreateCuttingIssuanceExecutionRequest,
	actorID string,
	operator string,
) (CuttingIssuanceExecutionResponse, error) {
	req := normalizeCreateCuttingIssuanceExecutionRequest(input)
	if err := validateCuttingIssuanceRequest(req); err != nil {
		return CuttingIssuanceExecutionResponse{}, err
	}

	var created models.CuttingIssuanceExecution
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		// 1. 锁定并加载订单行快照 (防止并发重入)
		lineSnapshot, err := loadSalesOrderLineSnapshot(tx, req, true)
		if err != nil {
			return err
		}

		// 2. 幂等性检查：防止对同一订单行重复下发领料
		var existingCount int64
		if err := tx.Model(&models.CuttingIssuanceExecution{}).
			Where("order_id = ? AND sales_order_line_no = ?", req.OrderID, req.SalesOrderLineNo).
			Count(&existingCount).Error; err != nil {
			return err
		}
		if existingCount > 0 {
			return ErrCuttingIssuanceAlreadyExists
		}

		templateSnapshot, err := loadCuttingPlanSnapshot(tx, req.TemplateID)
		if err != nil {
			return err
		}
		if err := validateTemplateCompatibility(req, lineSnapshot, templateSnapshot); err != nil {
			return err
		}

		if strings.TrimSpace(lineSnapshot.ProductModel) != "" {
			req.ProductModel = strings.TrimSpace(lineSnapshot.ProductModel)
		}
		if strings.TrimSpace(lineSnapshot.ProductCode) != "" {
			req.ProductCode = strings.TrimSpace(lineSnapshot.ProductCode)
		}
		req.HoleCount = lineSnapshot.HoleCount
		if strings.TrimSpace(templateSnapshot.Name) != "" {
			req.TemplateName = strings.TrimSpace(templateSnapshot.Name)
		}
		if strings.TrimSpace(templateSnapshot.RevisionNo) != "" {
			req.TemplateVersion = strings.TrimSpace(templateSnapshot.RevisionNo)
		}
		if req.ProductID == "" {
			var lineProductID string
			if err := tx.Model(&models.SalesOrderLine{}).
				Where("sales_order_id = ? AND line_no = ?", req.OrderID, req.SalesOrderLineNo).
				Pluck("product_id", &lineProductID).Error; err == nil {
				req.ProductID = strings.TrimSpace(lineProductID)
			}
		}

		plan := models.ProductionPlan{
			OrderNo:     req.OrderNo,
			OrderID:     req.OrderID,
			ProductID:   req.ProductID,
			ProductName: req.ProductModel,
			Quantity:    req.Quantity,
			Status:      req.Status,
		}
		if err := tx.Create(&plan).Error; err != nil {
			return err
		}

		tasks := buildProductionTasksFromCuttingBatches(req.Batches, req.OrderNo, req.SalesOrderLineNo)
		for index := range tasks {
			tasks[index].PlanID = plan.ID
		}
		if len(tasks) > 0 {
			if err := tx.Create(&tasks).Error; err != nil {
				return err
			}
		}

		if err := tx.Preload("Tasks").Where("id = ?", plan.ID).First(&plan).Error; err != nil {
			return err
		}
		if err := DispatchProductionPlanStatusChangedTx(tx, plan, "", plan.Status, actorID, operator); err != nil {
			return err
		}
		for _, task := range plan.Tasks {
			if err := DispatchProductionTaskStatusChangedTx(tx, plan, task, "", task.Status, actorID, operator); err != nil {
				return err
			}
		}

		record := models.CuttingIssuanceExecution{
			ProductionPlanID:  plan.ID,
			OrderNo:           req.OrderNo,
			OrderID:           req.OrderID,
			SalesOrderLineNo:  req.SalesOrderLineNo,
			ProductModel:      req.ProductModel,
			ProductCode:       req.ProductCode,
			HoleCount:         req.HoleCount,
			TemplateID:        req.TemplateID,
			TemplateName:      req.TemplateName,
			TemplateVersion:   req.TemplateVersion,
			Quantity:          req.Quantity,
			TotalLineQuantity: req.TotalLineQuantity,
			Status:            plan.Status,
			Source:            cuttingIssuanceSource,
		}
		if err := tx.Create(&record).Error; err != nil {
			return err
		}

		batches := make([]models.CuttingIssuanceBatch, 0, len(req.Batches))
		for _, batch := range req.Batches {
			batches = append(batches, models.CuttingIssuanceBatch{
				ExecutionID:  record.ID,
				BatchNo:      batch.BatchNo,
				RimQuantity:  batch.RimQuantity,
				LineQuantity: batch.LineQuantity,
			})
		}
		if len(batches) > 0 {
			if err := tx.Create(&batches).Error; err != nil {
				return err
			}
		}

		if err := tx.Preload("Batches").Where("id = ?", record.ID).First(&created).Error; err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return CuttingIssuanceExecutionResponse{}, err
	}

	return mapCuttingIssuanceExecutionToResponse(created), nil
}

func ListCuttingIssuanceExecutions(query CuttingIssuanceListQuery) (CuttingIssuanceExecutionListResponse, error) {
	page := query.Page
	pageSize := query.PageSize
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	tx := applyCuttingIssuanceFilters(db.DB.Model(&models.CuttingIssuanceExecution{}), query)

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return CuttingIssuanceExecutionListResponse{}, err
	}

	var items []models.CuttingIssuanceExecution
	if err := tx.Preload("Batches").Order("created_at desc").Limit(pageSize).Offset((page - 1) * pageSize).Find(&items).Error; err != nil {
		return CuttingIssuanceExecutionListResponse{}, err
	}

	results := make([]CuttingIssuanceExecutionResponse, 0, len(items))
	for _, item := range items {
		results = append(results, mapCuttingIssuanceExecutionToResponse(item))
	}

	return CuttingIssuanceExecutionListResponse{
		Items:    results,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

func GetCuttingIssuanceTraceReport(query CuttingIssuanceListQuery) (CuttingIssuanceTraceReportResponse, error) {
	type summaryRow struct {
		ExecutionCount    int64      `gorm:"column:execution_count"`
		OrderCount        int64      `gorm:"column:order_count"`
		TotalRimQuantity  float64    `gorm:"column:total_rim_quantity"`
		TotalLineQuantity float64    `gorm:"column:total_line_quantity"`
		EarliestCreatedAt *time.Time `gorm:"column:earliest_created_at"`
		LatestCreatedAt   *time.Time `gorm:"column:latest_created_at"`
	}
	type byStatusRow struct {
		Status            string  `gorm:"column:status"`
		ExecutionCount    int64   `gorm:"column:execution_count"`
		TotalRimQuantity  float64 `gorm:"column:total_rim_quantity"`
		TotalLineQuantity float64 `gorm:"column:total_line_quantity"`
	}
	type byModelRow struct {
		ProductModel      string  `gorm:"column:product_model"`
		HoleCount         int     `gorm:"column:hole_count"`
		ExecutionCount    int64   `gorm:"column:execution_count"`
		TotalRimQuantity  float64 `gorm:"column:total_rim_quantity"`
		TotalLineQuantity float64 `gorm:"column:total_line_quantity"`
	}

	filteredExecutions := applyCuttingIssuanceFilters(db.DB.Model(&models.CuttingIssuanceExecution{}), query)

	var summary summaryRow
	if err := filteredExecutions.
		Select(`
			COUNT(*) AS execution_count,
			COUNT(DISTINCT order_no) AS order_count,
			COALESCE(SUM(quantity), 0) AS total_rim_quantity,
			COALESCE(SUM(total_line_quantity), 0) AS total_line_quantity,
			MIN(created_at) AS earliest_created_at,
			MAX(created_at) AS latest_created_at
		`).
		Scan(&summary).Error; err != nil {
		return CuttingIssuanceTraceReportResponse{}, err
	}

	filteredExecutionIDs := applyCuttingIssuanceFilters(db.DB.Model(&models.CuttingIssuanceExecution{}), query).Select("id")
	var batchCount int64
	if err := db.DB.
		Model(&models.CuttingIssuanceBatch{}).
		Where("execution_id IN (?)", filteredExecutionIDs).
		Count(&batchCount).Error; err != nil {
		return CuttingIssuanceTraceReportResponse{}, err
	}

	var byStatusRows []byStatusRow
	if err := applyCuttingIssuanceFilters(db.DB.Model(&models.CuttingIssuanceExecution{}), query).
		Select(`
			status,
			COUNT(*) AS execution_count,
			COALESCE(SUM(quantity), 0) AS total_rim_quantity,
			COALESCE(SUM(total_line_quantity), 0) AS total_line_quantity
		`).
		Group("status").
		Order("status asc").
		Scan(&byStatusRows).Error; err != nil {
		return CuttingIssuanceTraceReportResponse{}, err
	}

	var byModelRows []byModelRow
	if err := applyCuttingIssuanceFilters(db.DB.Model(&models.CuttingIssuanceExecution{}), query).
		Select(`
			product_model,
			hole_count,
			COUNT(*) AS execution_count,
			COALESCE(SUM(quantity), 0) AS total_rim_quantity,
			COALESCE(SUM(total_line_quantity), 0) AS total_line_quantity
		`).
		Group("product_model, hole_count").
		Order("product_model asc").
		Order("hole_count asc").
		Scan(&byModelRows).Error; err != nil {
		return CuttingIssuanceTraceReportResponse{}, err
	}

	byStatus := make([]CuttingIssuanceTraceByStatusItem, 0, len(byStatusRows))
	for _, row := range byStatusRows {
		byStatus = append(byStatus, CuttingIssuanceTraceByStatusItem{
			Status:            strings.TrimSpace(row.Status),
			ExecutionCount:    row.ExecutionCount,
			TotalRimQuantity:  row.TotalRimQuantity,
			TotalLineQuantity: row.TotalLineQuantity,
		})
	}

	byModel := make([]CuttingIssuanceTraceByModelItem, 0, len(byModelRows))
	for _, row := range byModelRows {
		byModel = append(byModel, CuttingIssuanceTraceByModelItem{
			ProductModel:      strings.TrimSpace(row.ProductModel),
			HoleCount:         row.HoleCount,
			ExecutionCount:    row.ExecutionCount,
			TotalRimQuantity:  row.TotalRimQuantity,
			TotalLineQuantity: row.TotalLineQuantity,
		})
	}

	return CuttingIssuanceTraceReportResponse{
		Summary: CuttingIssuanceTraceSummary{
			ExecutionCount:    summary.ExecutionCount,
			OrderCount:        summary.OrderCount,
			BatchCount:        batchCount,
			TotalRimQuantity:  summary.TotalRimQuantity,
			TotalLineQuantity: summary.TotalLineQuantity,
			EarliestCreatedAt: formatCuttingIssuanceTime(summary.EarliestCreatedAt),
			LatestCreatedAt:   formatCuttingIssuanceTime(summary.LatestCreatedAt),
		},
		ByStatus: byStatus,
		ByModel:  byModel,
	}, nil
}
