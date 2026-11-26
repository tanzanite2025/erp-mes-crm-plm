package services

import (
	"encoding/json"
	"testing"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestProductionPlanRouteBindingUsesExactOrderLineScopeAndNoLineUsesBranchDefault(t *testing.T) {
	service, database := newProductionRouteLifecycleTestService(t)
	seedProductionRouteLifecycleReferences(t, database)
	require.NoError(t, database.Exec(`INSERT INTO sales_order_lines
		(id, sales_order_id, product_id, bom_owner_type, bom_owner_customer_id, bom_version_level, production_route_mode)
		VALUES (102, 'order-1', 'product-g24', 'INTERNAL', '', 'std', 'DEFAULT')`).Error)

	defaultBranch := models.ProductionRoute{
		ProductID: "product-g24", ProductSKU: "G24", ProductName: "G24产品",
		BOMOwnerType: "INTERNAL", BOMVersionLevel: "std",
	}
	var defaultFamily models.ProductionRouteFamily
	var defaultPublished models.ProductionRoute
	require.NoError(t, database.Transaction(func(tx *gorm.DB) error {
		var err error
		defaultFamily, defaultPublished, err = materializeCurrentBranchDefaultProductionRouteRevisionTx(tx, defaultBranch)
		return err
	}))
	require.NotEmpty(t, defaultFamily.ID)

	lineRoute := productionRouteLifecycleDTO(productionRouteStatusDraft, "library-forming")
	lineRoute.Code = "G24-ORDER-LINE"
	lineRoute.Steps[0].ID = "route-g24-step-line"
	lineRoute.ScopeType = productionRouteScopeSalesOrderLine
	lineRoute.SalesOrderLineID = 101
	lineDraft, err := service.SaveProductionRoute(SaveProductionRouteRequest{Route: lineRoute})
	require.NoError(t, err)
	linePublished, err := service.PublishProductionRoute(lineDraft.ID, lineDraft.Version, "publisher", "")
	require.NoError(t, err)

	planWithoutLine := models.ProductionPlan{
		OrderID: "order-1", ProductID: "product-g24", BOMOwnerType: "INTERNAL", BOMVersionLevel: "std",
	}
	require.NoError(t, database.Transaction(func(tx *gorm.DB) error {
		return BindProductionPlanToCurrentPublishedRouteRevisionTx(tx, &planWithoutLine)
	}))
	require.Equal(t, defaultPublished.ID, planWithoutLine.ProductionRouteRevisionID)

	firstSplitPlan := models.ProductionPlan{
		OrderID: "order-1", SalesOrderLineID: 101, ProductID: "product-g24", BOMOwnerType: "INTERNAL", BOMVersionLevel: "std",
	}
	require.NoError(t, database.Transaction(func(tx *gorm.DB) error {
		return BindProductionPlanToCurrentPublishedRouteRevisionTx(tx, &firstSplitPlan)
	}))
	require.Equal(t, linePublished.ID, firstSplitPlan.ProductionRouteRevisionID)

	newLineRevisionDraft, err := service.CreateProductionRouteRevision(linePublished.ID, "editor", "")
	require.NoError(t, err)
	newLineRevision, err := service.PublishProductionRoute(newLineRevisionDraft.ID, newLineRevisionDraft.Version, "publisher", "")
	require.NoError(t, err)
	secondSplitPlan := models.ProductionPlan{
		OrderID: "order-1", SalesOrderLineID: 101, ProductID: "product-g24", BOMOwnerType: "INTERNAL", BOMVersionLevel: "std",
	}
	require.NoError(t, database.Transaction(func(tx *gorm.DB) error {
		return BindProductionPlanToCurrentPublishedRouteRevisionTx(tx, &secondSplitPlan)
	}))
	require.Equal(t, linePublished.ID, firstSplitPlan.ProductionRouteRevisionID)
	require.Equal(t, newLineRevision.ID, secondSplitPlan.ProductionRouteRevisionID)

	planForLineWithoutRoute := models.ProductionPlan{
		OrderID: "order-1", SalesOrderLineID: 102, ProductID: "product-g24", BOMOwnerType: "INTERNAL", BOMVersionLevel: "std",
	}
	require.NoError(t, database.Transaction(func(tx *gorm.DB) error {
		return BindProductionPlanToCurrentPublishedRouteRevisionTx(tx, &planForLineWithoutRoute)
	}))
	require.Equal(t, defaultPublished.ID, planForLineWithoutRoute.ProductionRouteRevisionID)
}

func TestBranchDefaultProcessChangesCreateNewRouteRevisionAndKeepPreviousSnapshot(t *testing.T) {
	service, database := newProductionRouteLifecycleTestService(t)
	seedProductionRouteLifecycleReferences(t, database)
	branch := models.ProductionRoute{
		ProductID: "product-g24", ProductSKU: "G24", ProductName: "G24产品",
		BOMOwnerType: "INTERNAL", BOMVersionLevel: "std",
	}

	var firstRevision models.ProductionRoute
	require.NoError(t, database.Transaction(func(tx *gorm.DB) error {
		_, route, err := materializeCurrentBranchDefaultProductionRouteRevisionTx(tx, branch)
		firstRevision = route
		return err
	}))
	require.Equal(t, 1, firstRevision.RevisionNo)
	require.Equal(t, []string{"library-outer", "library-forming"}, []string{
		firstRevision.Steps[0].ProcessStepID,
		firstRevision.Steps[1].ProcessStepID,
	})

	_, err := service.SaveProductionMBOMBranchProcessSelection(SaveProductionMBOMBranchProcessSelectionRequest{
		ProductID: "product-g24", BOMOwnerType: "INTERNAL", BOMVersionLevel: "std",
		ProcessStepIDs: []string{"library-forming"},
	})
	require.NoError(t, err)

	var nextRevision models.ProductionRoute
	require.NoError(t, database.Transaction(func(tx *gorm.DB) error {
		_, route, err := materializeCurrentBranchDefaultProductionRouteRevisionTx(tx, branch)
		nextRevision = route
		return err
	}))
	require.NotEqual(t, firstRevision.ID, nextRevision.ID)
	require.Equal(t, 2, nextRevision.RevisionNo)
	require.Len(t, nextRevision.Steps, 1)
	require.Equal(t, "library-forming", nextRevision.Steps[0].ProcessStepID)

	previousRevision, err := loadProductionRouteRevisionForExecutionTx(database, firstRevision.ID)
	require.NoError(t, err)
	require.Len(t, previousRevision.Steps, 2)
	require.Equal(t, "library-outer", previousRevision.Steps[0].ProcessStepID)
	require.Equal(t, "library-forming", previousRevision.Steps[1].ProcessStepID)
}

func TestProductionRouteSalesOrderLineCandidatesIncludeBothModesForCurrentBranches(t *testing.T) {
	service, database := newProductionRouteLifecycleTestService(t)
	seedProductionRouteLifecycleReferences(t, database)
	require.NoError(t, database.Exec(`UPDATE sales_orders SET order_no = 'SO-A' WHERE id = 'order-1'`).Error)
	require.NoError(t, database.Exec(`INSERT INTO sales_orders (id, order_no) VALUES ('order-b', 'SO-B')`).Error)
	require.NoError(t, database.Exec(`INSERT INTO products (id, sku, name, status) VALUES ('product-b', 'B', '产品 B', 'Active')`).Error)
	require.NoError(t, database.Exec(`INSERT INTO boms (id, product_id, bom_type, status, owner_type, owner_customer_id, version_level)
		VALUES ('bom-b', 'product-b', 'MBOM', 'RELEASED', 'INTERNAL', '', 'std')`).Error)
	require.NoError(t, database.Exec(`INSERT INTO sales_order_lines
		(id, sales_order_id, line_no, product_id, product_model, product_code, production_route_mode, bom_owner_type, bom_owner_customer_id, bom_version_level)
		VALUES
		(103, 'order-b', 1, 'product-b', 'MODEL-B', 'B', 'CUSTOM', 'INTERNAL', '', 'std'),
		(104, 'order-1', 3, 'product-g24', 'MODEL-G24', 'G24', 'CUSTOM', 'INTERNAL', '', 'std'),
		(105, 'order-1', 2, 'product-g24', 'MODEL-G24', 'G24', 'DEFAULT', 'INTERNAL', '', 'std')`).Error)
	require.NoError(t, database.Exec(`INSERT INTO production_route_families
		(id, code, product_id, bom_owner_type, bom_owner_customer_id, bom_version_level, scope_type, sales_order_line_id)
		VALUES ('family-existing', 'EXISTING', 'product-g24', 'INTERNAL', '', 'std', 'SALES_ORDER_LINE', 104)`).Error)

	candidates, err := service.ListProductionRouteSalesOrderLineCandidates("product-g24")
	require.NoError(t, err)
	require.Len(t, candidates, 3)
	require.EqualValues(t, 101, candidates[0].ID)
	require.Equal(t, "SO-A", candidates[0].SalesOrderNo)
	require.Equal(t, "G24", candidates[0].ProductModel)
	require.Equal(t, "INTERNAL", candidates[0].BOMOwnerType)
	require.Equal(t, "CUSTOM", candidates[0].ProductionRouteMode)
	require.False(t, candidates[0].HasProductionRoute)
	require.EqualValues(t, 105, candidates[1].ID)
	require.Equal(t, "DEFAULT", candidates[1].ProductionRouteMode)
	require.False(t, candidates[1].HasProductionRoute)
	require.EqualValues(t, 104, candidates[2].ID)
	require.True(t, candidates[2].HasProductionRoute)

	encoded, err := json.Marshal(candidates[0])
	require.NoError(t, err)
	require.Contains(t, string(encoded), `"id":101`)
	require.Contains(t, string(encoded), `"salesOrderNo":"SO-A"`)
	require.Contains(t, string(encoded), `"bomOwnerType":"INTERNAL"`)
	require.Contains(t, string(encoded), `"productionRouteMode":"CUSTOM"`)
	require.Contains(t, string(encoded), `"hasProductionRoute":false`)
	require.NotContains(t, string(encoded), `"ID"`)
}

func TestOrderLineCanRestoreBranchDefaultUntilAProductionPlanExists(t *testing.T) {
	service, database := newProductionRouteLifecycleTestService(t)
	seedProductionRouteLifecycleReferences(t, database)
	require.NoError(t, database.Exec(`CREATE TABLE production_plans (
		id TEXT PRIMARY KEY, deleted_at DATETIME, sales_order_line_id INTEGER
	)`).Error)
	require.NoError(t, database.Exec(`INSERT INTO production_plans (id, sales_order_line_id) VALUES ('plan-1', 101)`).Error)

	err := service.ResetSalesOrderLineProductionRouteToBranchDefault(101, "route-editor", "")
	require.ErrorIs(t, err, ErrProductionSalesOrderLineRouteModeLocked)

	require.NoError(t, database.Exec(`DELETE FROM production_plans WHERE id = 'plan-1'`).Error)
	require.NoError(t, service.ResetSalesOrderLineProductionRouteToBranchDefault(101, "route-editor", ""))
	var orderLine models.SalesOrderLine
	require.NoError(t, database.First(&orderLine, "id = ?", 101).Error)
	require.Equal(t, "DEFAULT", orderLine.ProductionRouteMode)

	input := productionRouteLifecycleDTO(productionRouteStatusDraft, "library-outer")
	input.Code = "G24-ROUTE-AFTER-DEFAULT"
	input.Steps[0].ID = "route-g24-step-after-default"
	_, err = service.SaveProductionRoute(SaveProductionRouteRequest{Route: input})
	require.NoError(t, err)
	require.NoError(t, database.First(&orderLine, "id = ?", 101).Error)
	require.Equal(t, "CUSTOM", orderLine.ProductionRouteMode)
}

func TestSavingRouteRequiresExplicitConfiguredProcessStepID(t *testing.T) {
	service, database := newProductionRouteLifecycleTestService(t)
	seedProductionRouteLifecycleReferences(t, database)

	route := productionRouteLifecycleDTO(productionRouteStatusDraft, "library-forming")
	route.Code = "G24-EXISTING-BRANCH-PROCESS"
	route.Steps[0].ID = "route-g24-step-existing-branch-process"
	route.Steps[0].ProcessStepID = ""
	_, err := service.SaveProductionRoute(SaveProductionRouteRequest{Route: route})
	require.ErrorIs(t, err, ErrInvalidProductionRoute)
	require.Contains(t, err.Error(), "processStepId is required")
}

func TestSavingRouteRejectsProcessNotConfiguredForMBOMBranch(t *testing.T) {
	service, database := newProductionRouteLifecycleTestService(t)
	seedProductionRouteLifecycleReferences(t, database)
	require.NoError(t, database.Create(&models.ProcessStep{
		BaseModel: models.BaseModel{ID: "library-route-direct"}, Code: "DIRECT", Name: "路线直接选择工序", IsActive: true,
	}).Error)

	route := productionRouteLifecycleDTO(productionRouteStatusDraft, "library-forming")
	route.Code = "G24-UNCONFIGURED-PROCESS"
	route.Steps[0].ID = "route-g24-step-direct"
	route.Steps[0].ProcessStepID = ""
	route.Steps[0].ProcessStepID = "library-route-direct"
	_, err := service.SaveProductionRoute(SaveProductionRouteRequest{Route: route})
	require.ErrorIs(t, err, ErrInvalidProductionRoute)
	require.Contains(t, err.Error(), "not configured for the selected MBOM branch")

	var operationCount int64
	require.NoError(t, database.Model(&models.ProductionMBOMBranchProcessAssociation{}).
		Where("product_id = ? AND process_step_id = ?", "product-g24", "library-route-direct").Count(&operationCount).Error)
	require.Zero(t, operationCount)
}
