package services

import (
	"testing"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestProductionPlanRouteBindingUsesExactOrderLineScopeAndNoLineUsesBranchDefault(t *testing.T) {
	service, database := newProductionRouteLifecycleTestService(t)
	seedProductionRouteLifecycleReferences(t, database)
	require.NoError(t, database.Exec(`CREATE TABLE sales_orders (id TEXT PRIMARY KEY, deleted_at DATETIME)`).Error)
	require.NoError(t, database.Exec(`CREATE TABLE sales_order_lines (id INTEGER PRIMARY KEY, sales_order_id TEXT, product_id TEXT)`).Error)
	require.NoError(t, database.Exec(`INSERT INTO sales_orders (id) VALUES ('order-1')`).Error)
	require.NoError(t, database.Exec(`INSERT INTO sales_order_lines (id, sales_order_id, product_id) VALUES (101, 'order-1', 'product-g24'), (102, 'order-1', 'product-g24')`).Error)

	defaultRoute := productionRouteLifecycleDTO(productionRouteStatusDraft, "branch-operation-outer")
	defaultRoute.Code = "G24-DEFAULT"
	defaultDraft, err := service.SaveProductionRoute(SaveProductionRouteRequest{Route: defaultRoute})
	require.NoError(t, err)
	defaultPublished, err := service.PublishProductionRoute(defaultDraft.ID, defaultDraft.Version, "publisher", "")
	require.NoError(t, err)

	lineRoute := productionRouteLifecycleDTO(productionRouteStatusDraft, "branch-operation-forming")
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
	err = database.Transaction(func(tx *gorm.DB) error {
		return BindProductionPlanToCurrentPublishedRouteRevisionTx(tx, &planForLineWithoutRoute)
	})
	require.ErrorIs(t, err, ErrInvalidProductionPlanBOMBranch)
	require.Contains(t, err.Error(), "no route family exists for the selected sales order line")
}

func TestProductionRouteSalesOrderLineCandidatesOnlyReturnSelectedProduct(t *testing.T) {
	service, database := newProductionRouteLifecycleTestService(t)
	require.NoError(t, database.Exec(`CREATE TABLE sales_orders (id TEXT PRIMARY KEY, order_no TEXT, customer_name TEXT, order_date TEXT, deleted_at DATETIME)`).Error)
	require.NoError(t, database.Exec(`CREATE TABLE sales_order_lines (id INTEGER PRIMARY KEY, sales_order_id TEXT, line_no INTEGER, product_id TEXT, product_model TEXT, product_code TEXT, specification TEXT)`).Error)
	require.NoError(t, database.Exec(`INSERT INTO sales_orders (id, order_no) VALUES ('order-a', 'SO-A'), ('order-b', 'SO-B')`).Error)
	require.NoError(t, database.Exec(`INSERT INTO sales_order_lines (id, sales_order_id, line_no, product_id, product_model, product_code) VALUES (1, 'order-a', 1, 'product-a', 'MODEL-A', 'A'), (2, 'order-b', 1, 'product-b', 'MODEL-B', 'B')`).Error)

	candidates, err := service.ListProductionRouteSalesOrderLineCandidates("product-a")
	require.NoError(t, err)
	require.Len(t, candidates, 1)
	require.EqualValues(t, 1, candidates[0].ID)
	require.Equal(t, "SO-A", candidates[0].SalesOrderNo)
	require.Equal(t, "MODEL-A", candidates[0].ProductModel)
}

func TestSavingRouteDirectlyFromProcessLibraryCreatesVisibleBranchOperation(t *testing.T) {
	service, database := newProductionRouteLifecycleTestService(t)
	seedProductionRouteLifecycleReferences(t, database)
	require.NoError(t, database.Create(&models.ProcessStep{
		BaseModel: models.BaseModel{ID: "library-route-direct"}, Code: "DIRECT", Name: "路线直接选择工序", IsActive: true,
	}).Error)

	route := productionRouteLifecycleDTO(productionRouteStatusDraft, "branch-operation-forming")
	route.Code = "G24-DIRECT-PROCESS"
	route.Steps[0].ID = "route-g24-step-direct"
	route.Steps[0].BranchOperationID = ""
	route.Steps[0].ProcessLibraryID = "library-route-direct"
	savedRoute, err := service.SaveProductionRoute(SaveProductionRouteRequest{Route: route})
	require.NoError(t, err)
	require.Len(t, savedRoute.Steps, 1)

	var operation models.ProductionBOMBranchOperation
	require.NoError(t, database.First(&operation, "process_library_id = ?", "library-route-direct").Error)
	var selection models.ProductionBOMBranchOperationProcessLibrarySelection
	require.NoError(t, database.First(&selection, "branch_operation_id = ?", operation.ID).Error)
	require.Equal(t, operation.ID, selection.BranchOperationID)
	require.Equal(t, "library-route-direct", selection.ProcessLibraryID)

	branches, err := service.ListProductionRouteBOMBranches()
	require.NoError(t, err)
	var visibleOperation *ProductionBOMBranchOperationDTO
	for _, branch := range branches {
		if branch.ProductID != "product-g24" || branch.BOMVersionLevel != "std" {
			continue
		}
		for index := range branch.BranchOperations {
			if branch.BranchOperations[index].ID == operation.ID {
				visibleOperation = &branch.BranchOperations[index]
			}
		}
	}
	require.NotNil(t, visibleOperation)
	require.Equal(t, "路线直接选择工序", visibleOperation.Name)
}
