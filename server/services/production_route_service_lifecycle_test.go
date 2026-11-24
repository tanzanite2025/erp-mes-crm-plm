package services

import (
	"errors"
	"testing"
	"xdfc-server/models"
	"xdfc-server/repositories"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type productionRouteLifecycleTestTxManager struct {
	db *gorm.DB
}

func (m productionRouteLifecycleTestTxManager) DB() *gorm.DB {
	return m.db
}

func (m productionRouteLifecycleTestTxManager) WithinTransaction(fn func(tx *gorm.DB) error) error {
	return m.db.Transaction(fn)
}

func newProductionRouteLifecycleTestService(t *testing.T) (*ProductionService, *gorm.DB) {
	t.Helper()

	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)
	createProductionRouteLifecycleTestSchema(t, database)

	service := NewProductionService(
		productionRouteLifecycleTestTxManager{db: database},
		repositories.NewProductionRepository(),
		repositories.NewSystemConfigRepository(),
	)
	return service, database
}

func createProductionRouteLifecycleTestSchema(t *testing.T, database *gorm.DB) {
	t.Helper()

	statements := []string{
		`
		CREATE TABLE production_routes (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			code TEXT NOT NULL,
			name TEXT NOT NULL,
			product_id TEXT,
			product_sku TEXT,
			product_name TEXT,
			product_template_id TEXT,
			bom_owner_type TEXT,
			bom_owner_customer_id TEXT,
			bom_owner_customer_name TEXT,
			bom_version_level TEXT,
			description TEXT,
			version INTEGER,
			status TEXT
		)`,
		`
		CREATE TABLE products (
			id TEXT PRIMARY KEY,
			deleted_at DATETIME,
			sku TEXT NOT NULL,
			name TEXT NOT NULL,
			status TEXT
		)`,
		`
		CREATE TABLE customers (
			id TEXT PRIMARY KEY,
			deleted_at DATETIME,
			name TEXT NOT NULL
		)`,
		`
		CREATE TABLE boms (
			id TEXT PRIMARY KEY,
			deleted_at DATETIME,
			product_id TEXT NOT NULL,
			bom_type TEXT NOT NULL,
			status TEXT,
			owner_type TEXT,
			owner_customer_id TEXT,
			version_level TEXT,
			effective_from DATETIME,
			effective_to DATETIME
		)`,
		`
		CREATE TABLE production_route_steps (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			route_id TEXT NOT NULL,
			sequence INTEGER NOT NULL,
			branch_operation_id TEXT,
			execution_mode TEXT NOT NULL,
			quality_gate TEXT NOT NULL,
			quality_routing TEXT,
			estimated_minutes INTEGER,
			transfer_required BOOLEAN,
			description TEXT
		)`,
		`
		CREATE TABLE production_bom_branch_operations (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			product_id TEXT NOT NULL,
			bom_owner_type TEXT NOT NULL,
			bom_owner_customer_id TEXT NOT NULL DEFAULT '',
			bom_version_level TEXT NOT NULL DEFAULT '',
			name TEXT NOT NULL,
			description TEXT,
			sort_order INTEGER NOT NULL DEFAULT 0,
			is_active BOOLEAN NOT NULL DEFAULT true
		)`,
		`
		CREATE TABLE process_steps (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			code TEXT NOT NULL,
			name TEXT NOT NULL,
			description TEXT,
			sort_order INTEGER,
			is_active BOOLEAN
		)`,
		`
		CREATE TABLE production_bom_branch_operation_process_library_selections (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			product_id TEXT NOT NULL,
			bom_owner_type TEXT NOT NULL,
			bom_owner_customer_id TEXT NOT NULL DEFAULT '',
			bom_version_level TEXT NOT NULL DEFAULT '',
			branch_operation_id TEXT NOT NULL UNIQUE,
			process_library_id TEXT NOT NULL,
			sort_order INTEGER NOT NULL DEFAULT 0
		)`,
		`
		CREATE TABLE audit_logs (
			id TEXT PRIMARY KEY,
			module TEXT,
			target_id TEXT,
			action TEXT,
			diff TEXT,
			operator TEXT,
			ip TEXT,
			created_at DATETIME
		)`,
		`
		CREATE TABLE production_operation_executions (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			product_barcode TEXT NOT NULL,
			state_id TEXT,
			execution_lot_id TEXT,
			route_id TEXT,
			route_step_id TEXT,
			branch_operation_id TEXT NOT NULL,
			production_work_location_id TEXT NOT NULL,
			execution_mode TEXT,
			partner_id TEXT,
			action TEXT,
			status TEXT,
			result TEXT,
			operator TEXT,
			started_at DATETIME,
			completed_at DATETIME,
			notes TEXT
		)`,
	}

	for _, statement := range statements {
		require.NoError(t, database.Exec(statement).Error)
	}
	migrateProductionRouteRevisionTestSchema(t, database, false)
}

func seedProductionRouteLifecycleReferences(t *testing.T, database *gorm.DB) {
	t.Helper()

	require.NoError(t, database.Exec(`
		INSERT INTO products (id, sku, name, status)
		VALUES (?, ?, ?, ?)
	`, "product-g24", "G24", "G24产品", "Active").Error)
	require.NoError(t, database.Exec(`
		INSERT INTO boms (id, product_id, bom_type, status, owner_type, owner_customer_id, version_level)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, "bom-g24-internal", "product-g24", models.BOMTypeMBOM, models.BOMStatusReleased, "INTERNAL", "", "std").Error)
	require.NoError(t, database.Create(&[]models.ProductionBOMBranchOperation{
		{BaseModel: models.BaseModel{ID: "branch-operation-outer"}, ProductID: "product-g24", BOMOwnerType: "INTERNAL", BOMVersionLevel: "std", Name: "G24外圈", SortOrder: 1, IsActive: true, ProcessLibraryID: "library-outer"},
		{BaseModel: models.BaseModel{ID: "branch-operation-forming"}, ProductID: "product-g24", BOMOwnerType: "INTERNAL", BOMVersionLevel: "std", Name: "成型", SortOrder: 2, IsActive: true, ProcessLibraryID: "library-forming"},
	}).Error)
	require.NoError(t, database.Create(&[]models.ProcessStep{
		{BaseModel: models.BaseModel{ID: "library-outer"}, Code: "OUTER", Name: "G24外圈", IsActive: true},
		{BaseModel: models.BaseModel{ID: "library-forming"}, Code: "FORM", Name: "成型", IsActive: true},
	}).Error)
	require.NoError(t, database.Create(&[]models.ProductionBOMBranchOperationProcessLibrarySelection{
		{BaseModel: models.BaseModel{ID: "selection-outer"}, ProductID: "product-g24", BOMOwnerType: "INTERNAL", BOMVersionLevel: "std", BranchOperationID: "branch-operation-outer", ProcessLibraryID: "library-outer", SortOrder: 1},
		{BaseModel: models.BaseModel{ID: "selection-forming"}, ProductID: "product-g24", BOMOwnerType: "INTERNAL", BOMVersionLevel: "std", BranchOperationID: "branch-operation-forming", ProcessLibraryID: "library-forming", SortOrder: 2},
	}).Error)
}

func productionRouteLifecycleDTO(status string, branchOperationID string) ProductionRouteDTO {
	return ProductionRouteDTO{
		Code:            "G24-ROUTE",
		Name:            "G24 标准路线",
		ProductID:       "product-g24",
		ProductSKU:      "G24",
		ProductName:     "G24",
		BOMOwnerType:    "INTERNAL",
		BOMVersionLevel: "std",
		ScopeType:       productionRouteScopeBranchDefault,
		Description:     "G24 标准生产路线",
		Version:         1,
		Status:          status,
		Steps: []ProductionRouteStepDTO{{
			ID:                "route-g24-step-outer",
			Sequence:          1,
			BranchOperationID: branchOperationID,
			ProcessLibraryID:  productionRouteLifecycleProcessLibraryID(branchOperationID),
			ExecutionMode:     "IN_HOUSE",
			QualityGate:       "NONE",
			EstimatedMinutes:  10,
		}},
	}
}

func productionRouteLifecycleProcessLibraryID(branchOperationID string) string {
	if branchOperationID == "branch-operation-forming" {
		return "library-forming"
	}
	return "library-outer"
}

func TestListProductionRouteBOMBranchesReturnsCurrentStableBranches(t *testing.T) {
	service, database := newProductionRouteLifecycleTestService(t)
	seedProductionRouteLifecycleReferences(t, database)
	require.NoError(t, database.Exec(`
		INSERT INTO customers (id, name) VALUES (?, ?)
	`, "customer-a", "客户 A").Error)
	require.NoError(t, database.Exec(`
		INSERT INTO boms (id, product_id, bom_type, status, owner_type, owner_customer_id, version_level)
		VALUES
			(?, ?, ?, ?, ?, ?, ?),
			(?, ?, ?, ?, ?, ?, ?),
			(?, ?, ?, ?, ?, ?, ?),
			(?, ?, ?, ?, ?, ?, ?),
			(?, ?, ?, ?, ?, ?, ?)
	`,
		"bom-g24-internal-revision-2", "product-g24", models.BOMTypeMBOM, models.BOMStatusReleased, "INTERNAL", "", "std",
		"bom-g24-lightweight", "product-g24", models.BOMTypeMBOM, models.BOMStatusReleased, "INTERNAL", "", "lightweight",
		"bom-g24-customer", "product-g24", models.BOMTypeMBOM, models.BOMStatusReleased, "CUSTOMER", "customer-a", "std",
		"bom-g24-draft", "product-g24", models.BOMTypeMBOM, models.BOMStatusDraft, "INTERNAL", "", "draft-only",
		"bom-g24-ebom", "product-g24", models.BOMTypeEBOM, models.BOMStatusReleased, "INTERNAL", "", "engineering-only",
	).Error)
	require.NoError(t, database.Exec(`
		INSERT INTO boms (id, product_id, bom_type, status, owner_type, owner_customer_id, version_level, effective_to)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, "bom-g24-expired", "product-g24", models.BOMTypeMBOM, models.BOMStatusReleased, "INTERNAL", "", "expired", "2000-01-01 00:00:00").Error)

	branches, err := service.ListProductionRouteBOMBranches()
	require.NoError(t, err)
	require.Len(t, branches, 3)
	identities := make(map[string]ProductionRouteBOMBranchDTO, len(branches))
	for _, branch := range branches {
		identities[branch.BOMOwnerType+":"+branch.BOMOwnerCustomerID+":"+branch.BOMVersionLevel] = branch
	}
	require.Contains(t, identities, "INTERNAL::std")
	require.Contains(t, identities, "INTERNAL::lightweight")
	require.Contains(t, identities, "CUSTOMER:customer-a:std")
	require.Equal(t, "客户 A", identities["CUSTOMER:customer-a:std"].BOMOwnerCustomerName)
	require.Len(t, identities["INTERNAL::std"].BranchOperations, 2)
	require.Equal(t, "G24外圈", identities["INTERNAL::std"].BranchOperations[0].Name)
	require.Empty(t, identities["INTERNAL::lightweight"].BranchOperations)
}

func TestSaveProductionRouteHydratesAndValidatesBOMBranch(t *testing.T) {
	service, _ := newProductionRouteLifecycleTestService(t)
	seedProductionRouteLifecycleReferences(t, service.txManager.DB())

	input := productionRouteLifecycleDTO(productionRouteStatusDraft, "branch-operation-outer")
	input.ProductSKU = "FORGED-SKU"
	input.ProductName = "伪造产品名称"
	created, err := service.SaveProductionRoute(SaveProductionRouteRequest{Route: input})
	require.NoError(t, err)
	require.Equal(t, "G24", created.ProductSKU)
	require.Equal(t, "G24产品", created.ProductName)
	require.Equal(t, "INTERNAL", created.BOMOwnerType)
	require.Equal(t, "std", created.BOMVersionLevel)
	require.Equal(t, "branch-operation-outer", created.Steps[0].BranchOperationID)
	require.Equal(t, "G24外圈", created.Steps[0].BranchOperationName)

	invalidBranch := productionRouteLifecycleDTO(productionRouteStatusDraft, "branch-operation-outer")
	invalidBranch.Code = "G24-INVALID-BRANCH"
	invalidBranch.BOMVersionLevel = "not-a-released-branch"
	_, err = service.SaveProductionRoute(SaveProductionRouteRequest{Route: invalidBranch})
	require.ErrorIs(t, err, ErrInvalidProductionRoute)
}

func TestPublishProductionRouteValidatesAndMakesRouteAvailableForExecution(t *testing.T) {
	service, database := newProductionRouteLifecycleTestService(t)
	seedProductionRouteLifecycleReferences(t, database)

	draft, err := service.SaveProductionRoute(SaveProductionRouteRequest{
		Route:    productionRouteLifecycleDTO(productionRouteStatusDraft, "branch-operation-outer"),
		Operator: "route-editor",
	})
	require.NoError(t, err)
	require.Equal(t, productionRouteStatusDraft, draft.Status)

	published, err := service.PublishProductionRoute(draft.ID, draft.Version, "route-publisher", "127.0.0.1")
	require.NoError(t, err)
	require.Equal(t, productionRouteStatusPublished, published.Status)
	require.Equal(t, draft.Version+1, published.Version)
	require.Equal(t, draft.ProductID, published.ProductID)
	require.Equal(t, draft.Steps[0].BranchOperationID, published.Steps[0].BranchOperationID)

	listed, err := service.ListProductionRoutes()
	require.NoError(t, err)
	require.Len(t, listed, 1)
	require.Equal(t, productionRouteStatusPublished, listed[0].Status)

	_, err = service.PublishProductionRoute(draft.ID, draft.Version, "route-publisher", "127.0.0.1")
	require.ErrorIs(t, err, ErrProductionRouteVersionConflict)
	_, err = service.PublishProductionRoute(draft.ID, published.Version, "route-publisher", "127.0.0.1")
	require.ErrorIs(t, err, ErrProductionRouteImmutable)

	edit := published
	edit.Status = productionRouteStatusDraft
	edit.Name = "试图编辑已发布路线"
	_, err = service.SaveProductionRoute(SaveProductionRouteRequest{Route: edit})
	require.ErrorIs(t, err, ErrProductionRouteImmutable)
}

func TestPublishProductionRouteRejectsAnMBOMBranchThatIsNoLongerEffective(t *testing.T) {
	service, database := newProductionRouteLifecycleTestService(t)
	seedProductionRouteLifecycleReferences(t, database)
	draft, err := service.SaveProductionRoute(SaveProductionRouteRequest{
		Route: productionRouteLifecycleDTO(productionRouteStatusDraft, "branch-operation-outer"),
	})
	require.NoError(t, err)
	require.NoError(t, database.Table("boms").Where("product_id = ? AND version_level = ?", "product-g24", "std").Update("status", "DRAFT").Error)

	_, err = service.PublishProductionRoute(draft.ID, draft.Version, "route-publisher", "")
	require.ErrorIs(t, err, ErrInvalidProductionRoute)

	var persisted models.ProductionRoute
	require.NoError(t, database.First(&persisted, "id = ?", draft.ID).Error)
	require.Equal(t, productionRouteStatusDraft, persisted.Status)
	require.Equal(t, draft.Version, persisted.Version)
}

func TestProductionRouteRevisionCopiesPublishedSnapshotAndKeepsHistoryImmutable(t *testing.T) {
	service, database := newProductionRouteLifecycleTestService(t)
	seedProductionRouteLifecycleReferences(t, database)
	input := productionRouteLifecycleDTO(productionRouteStatusDraft, "branch-operation-outer")
	input.Steps = append(input.Steps, ProductionRouteStepDTO{
		ID:                "route-g24-step-forming",
		Sequence:          2,
		BranchOperationID: "branch-operation-forming",
		ProcessLibraryID:  "library-forming",
		ExecutionMode:     "IN_HOUSE",
		QualityGate:       "OPTIONAL",
		EstimatedMinutes:  15,
	})

	draft, err := service.SaveProductionRoute(SaveProductionRouteRequest{Route: input})
	require.NoError(t, err)
	published, err := service.PublishProductionRoute(draft.ID, draft.Version, "publisher", "")
	require.NoError(t, err)
	require.Equal(t, 1, published.RevisionNo)
	require.True(t, published.IsCurrentRevision)
	require.Equal(t, "G24外圈", published.Steps[0].BranchOperationName)

	require.NoError(t, database.Model(&models.ProductionBOMBranchOperation{}).
		Where("id = ?", "branch-operation-outer").
		Updates(map[string]interface{}{"name": "G24外圈新名称", "description": "新工序说明"}).Error)
	history, err := service.ListProductionRoutes()
	require.NoError(t, err)
	require.Len(t, history, 1)
	require.Equal(t, "G24外圈", history[0].Steps[0].BranchOperationName)
	require.Empty(t, history[0].Steps[0].BranchOperationDescription)

	newDraft, err := service.CreateProductionRouteRevision(published.ID, "editor", "")
	require.NoError(t, err)
	require.NotEqual(t, published.ID, newDraft.ID)
	require.Equal(t, published.RouteFamilyID, newDraft.RouteFamilyID)
	require.Equal(t, 2, newDraft.RevisionNo)
	require.Equal(t, published.ID, newDraft.BasedOnRouteID)
	require.Equal(t, productionRouteStatusDraft, newDraft.Status)
	require.Len(t, newDraft.Steps, 2)
	require.NotEqual(t, published.Steps[0].ID, newDraft.Steps[0].ID)
	require.Equal(t, "G24外圈新名称", newDraft.Steps[0].BranchOperationName)

	newDraft.Name = "G24 调整后路线"
	newDraft.Steps[0], newDraft.Steps[1] = newDraft.Steps[1], newDraft.Steps[0]
	newDraft.Steps[0].Sequence, newDraft.Steps[1].Sequence = 1, 2
	updatedDraft, err := service.SaveProductionRoute(SaveProductionRouteRequest{Route: newDraft})
	require.NoError(t, err)
	publishedNewDraft, err := service.PublishProductionRoute(updatedDraft.ID, updatedDraft.Version, "publisher", "")
	require.NoError(t, err)
	require.Equal(t, "branch-operation-forming", publishedNewDraft.Steps[0].BranchOperationID)
	require.Equal(t, "G24外圈新名称", publishedNewDraft.Steps[1].BranchOperationName)
	require.Equal(t, "新工序说明", publishedNewDraft.Steps[1].BranchOperationDescription)

	history, err = service.ListProductionRoutes()
	require.NoError(t, err)
	require.Len(t, history, 2)
	byRevision := map[int]ProductionRouteDTO{}
	for _, route := range history {
		byRevision[route.RevisionNo] = route
	}
	require.True(t, byRevision[1].IsCurrentRevision == false)
	require.True(t, byRevision[2].IsCurrentRevision)
	require.Equal(t, "G24外圈", byRevision[1].Steps[0].BranchOperationName)
	require.Equal(t, "G24 调整后路线", byRevision[2].Name)
}

func TestSaveProductionRouteRejectsInactiveAndForeignBranchOperations(t *testing.T) {
	service, database := newProductionRouteLifecycleTestService(t)
	seedProductionRouteLifecycleReferences(t, database)
	require.NoError(t, database.Create(&models.ProductionBOMBranchOperation{
		BaseModel:       models.BaseModel{ID: "branch-operation-inactive"},
		ProductID:       "product-g24",
		BOMOwnerType:    "INTERNAL",
		BOMVersionLevel: "std",
		Name:            "停用工序",
		IsActive:        false,
	}).Error)
	require.NoError(t, database.Model(&models.ProductionBOMBranchOperation{}).
		Where("id = ?", "branch-operation-inactive").
		Update("is_active", false).Error)
	require.NoError(t, database.Create(&models.ProductionBOMBranchOperation{
		BaseModel:       models.BaseModel{ID: "branch-operation-foreign"},
		ProductID:       "product-g24",
		BOMOwnerType:    "INTERNAL",
		BOMVersionLevel: "lightweight",
		Name:            "其他分支工序",
		IsActive:        true,
	}).Error)

	for _, operationID := range []string{"branch-operation-inactive", "branch-operation-foreign"} {
		route := productionRouteLifecycleDTO(productionRouteStatusDraft, operationID)
		route.Code = "G24-" + operationID
		_, err := service.SaveProductionRoute(SaveProductionRouteRequest{Route: route})
		require.ErrorIs(t, err, ErrInvalidProductionRoute)
	}
}

func TestSaveProductionRouteRejectsLegacyStatusValues(t *testing.T) {
	service, database := newProductionRouteLifecycleTestService(t)
	seedProductionRouteLifecycleReferences(t, database)
	for _, status := range []string{productionRouteStatusPublished, "ARCHIVED"} {
		route := productionRouteLifecycleDTO(productionRouteStatusDraft, "branch-operation-outer")
		route.Status = status
		_, err := service.SaveProductionRoute(SaveProductionRouteRequest{Route: route})
		require.ErrorIs(t, err, ErrInvalidProductionRouteStatus)
	}
}

func TestSaveProductionRouteAllowsDraftEditAndRemovesDraftStep(t *testing.T) {
	service, database := newProductionRouteLifecycleTestService(t)
	seedProductionRouteLifecycleReferences(t, database)

	created, err := service.SaveProductionRoute(SaveProductionRouteRequest{
		Route:    productionRouteLifecycleDTO(productionRouteStatusDraft, "branch-operation-outer"),
		Operator: "tester",
	})
	require.NoError(t, err)
	require.NotEmpty(t, created.ID)
	require.Equal(t, int64(1), created.Version)

	edited := created
	edited.Name = "G24 修改后路线"
	edited.Steps = []ProductionRouteStepDTO{{
		ID:                "temp-route-g24-step-forming",
		Sequence:          1,
		BranchOperationID: "branch-operation-forming",
		ProcessLibraryID:  "library-forming",
		ExecutionMode:     "IN_HOUSE",
		QualityGate:       "NONE",
		EstimatedMinutes:  12,
	}}

	updated, err := service.SaveProductionRoute(SaveProductionRouteRequest{
		Route:    edited,
		Operator: "tester",
	})
	require.NoError(t, err)
	require.Equal(t, int64(2), updated.Version)
	require.Equal(t, "G24 修改后路线", updated.Name)
	require.NotEmpty(t, updated.Steps[0].ID)
	require.NotEqual(t, "temp-route-g24-step-forming", updated.Steps[0].ID)

	var oldStep models.ProductionRouteStep
	require.ErrorIs(t, database.First(&oldStep, "id = ?", "route-g24-step-outer").Error, gorm.ErrRecordNotFound)
	require.NoError(t, database.Unscoped().First(&oldStep, "id = ?", "route-g24-step-outer").Error)
	require.True(t, oldStep.DeletedAt.Valid)

	var newStep models.ProductionRouteStep
	require.NoError(t, database.First(&newStep, "id = ?", updated.Steps[0].ID).Error)
	require.Equal(t, updated.ID, newStep.RouteID)
	var persistedStepIDs []string
	require.NoError(t, database.Model(&models.ProductionRouteStep{}).Where("route_id = ?", updated.ID).Pluck("id", &persistedStepIDs).Error)
	require.Equal(t, []string{updated.Steps[0].ID}, persistedStepIDs)
}

func TestListProductionRoutesHidesRoutesThatUseOldStepIdentities(t *testing.T) {
	service, database := newProductionRouteLifecycleTestService(t)
	seedProductionRouteLifecycleReferences(t, database)
	createProductionRouteRevisionTestRecord(t, database, models.ProductionRoute{
		BaseModel:       models.BaseModel{ID: "old-route"},
		Code:            "OLD-ROUTE",
		Name:            "旧路线",
		ProductID:       "product-g24",
		BOMOwnerType:    "INTERNAL",
		BOMVersionLevel: "std",
		Version:         1,
		Status:          productionRouteStatusDraft,
		Steps: []models.ProductionRouteStep{{
			BaseModel:         models.BaseModel{ID: "old-route-step"},
			Sequence:          1,
			BranchOperationID: "",
			ExecutionMode:     "IN_HOUSE",
			QualityGate:       "NONE",
		}},
	})
	createProductionRouteRevisionTestRecord(t, database, models.ProductionRoute{
		BaseModel:       models.BaseModel{ID: "published-empty-route"},
		Code:            "PUBLISHED-EMPTY",
		Name:            "未迁移的发布路线",
		ProductID:       "product-g24",
		BOMOwnerType:    "INTERNAL",
		BOMVersionLevel: "std",
		Version:         1,
		Status:          productionRouteStatusPublished,
	})
	createProductionRouteRevisionTestRecord(t, database, models.ProductionRoute{
		BaseModel:       models.BaseModel{ID: "empty-draft-route"},
		Code:            "EMPTY-DRAFT",
		Name:            "无工序草稿路线",
		ProductID:       "product-g24",
		BOMOwnerType:    "INTERNAL",
		BOMVersionLevel: "std",
		Version:         1,
		Status:          productionRouteStatusDraft,
	})

	routes, err := service.ListProductionRoutes()
	require.NoError(t, err)
	require.Empty(t, routes)
}

func TestSaveProductionRouteRejectsStepFromAnotherRoute(t *testing.T) {
	service, database := newProductionRouteLifecycleTestService(t)
	seedProductionRouteLifecycleReferences(t, database)

	created, err := service.SaveProductionRoute(SaveProductionRouteRequest{
		Route: productionRouteLifecycleDTO(productionRouteStatusDraft, "branch-operation-outer"),
	})
	require.NoError(t, err)
	currentStepID := created.Steps[0].ID

	createProductionRouteRevisionTestRecord(t, database, models.ProductionRoute{
		BaseModel:       models.BaseModel{ID: "route-other"},
		Code:            "OTHER-ROUTE",
		Name:            "其他路线",
		ProductID:       "product-g24",
		BOMOwnerType:    "INTERNAL",
		BOMVersionLevel: "std",
		Version:         1,
		Status:          productionRouteStatusDraft,
	})
	require.NoError(t, database.Create(&models.ProductionRouteStep{
		BaseModel:         models.BaseModel{ID: "route-other-step"},
		RouteID:           "route-other",
		Sequence:          1,
		BranchOperationID: "branch-operation-outer",
		ExecutionMode:     "IN_HOUSE",
		QualityGate:       "NONE",
	}).Error)

	edited := created
	edited.Steps = append([]ProductionRouteStepDTO(nil), created.Steps...)
	edited.Steps[0].ID = "route-other-step"
	_, err = service.SaveProductionRoute(SaveProductionRouteRequest{Route: edited})
	require.ErrorIs(t, err, ErrInvalidProductionRoute)

	var persisted models.ProductionRoute
	require.NoError(t, database.First(&persisted, "id = ?", created.ID).Error)
	require.Equal(t, int64(1), persisted.Version)
	require.Equal(t, productionRouteStatusDraft, persisted.Status)
	require.NoError(t, database.First(&models.ProductionRouteStep{}, "id = ?", currentStepID).Error)
}

func TestDeleteProductionRouteBlocksPublishedAndReferencedDraftRoutes(t *testing.T) {
	t.Run("published route", func(t *testing.T) {
		service, database := newProductionRouteLifecycleTestService(t)
		seedProductionRouteLifecycleReferences(t, database)
		published := createProductionRouteRevisionTestRecord(t, database, models.ProductionRoute{BaseModel: models.BaseModel{ID: "published-route"}, Code: "PUBLISHED", Name: "已发布路线", ProductID: "product-g24", BOMOwnerType: "INTERNAL", BOMVersionLevel: "std", Status: productionRouteStatusPublished})

		err := service.DeleteProductionRoute(published.ID, "tester", "")
		require.ErrorIs(t, err, ErrProductionRouteImmutable)
		require.NoError(t, database.First(&models.ProductionRoute{}, "id = ?", published.ID).Error)
	})

	t.Run("draft route with execution fact", func(t *testing.T) {
		service, database := newProductionRouteLifecycleTestService(t)
		seedProductionRouteLifecycleReferences(t, database)
		draft := productionRouteLifecycleDTO(productionRouteStatusDraft, "branch-operation-outer")
		created, err := service.SaveProductionRoute(SaveProductionRouteRequest{Route: draft})
		require.NoError(t, err)
		draft = created
		require.NoError(t, database.Exec(`
			INSERT INTO production_operation_executions (
				id, product_barcode, route_id, route_step_id, branch_operation_id, production_work_location_id
			) VALUES (?, ?, ?, ?, ?, ?)
		`, "operation-1", "G24-001", draft.ID, "route-g24-step-outer", "branch-operation-outer", "test-work-location").Error)

		err = service.DeleteProductionRoute(draft.ID, "tester", "")
		require.ErrorIs(t, err, ErrProductionRouteDeleteBlocked)
		require.NoError(t, database.First(&models.ProductionRoute{}, "id = ?", draft.ID).Error)
	})
}

func TestDeleteProductionRouteAllowsUnreferencedDraft(t *testing.T) {
	service, database := newProductionRouteLifecycleTestService(t)
	seedProductionRouteLifecycleReferences(t, database)
	draft := productionRouteLifecycleDTO(productionRouteStatusDraft, "branch-operation-outer")
	created, err := service.SaveProductionRoute(SaveProductionRouteRequest{Route: draft})
	require.NoError(t, err)
	draft = created

	require.NoError(t, service.DeleteProductionRoute(draft.ID, "tester", ""))

	var route models.ProductionRoute
	require.Error(t, database.First(&route, "id = ?", draft.ID).Error)
	require.NoError(t, database.Unscoped().First(&route, "id = ?", draft.ID).Error)
	require.True(t, route.DeletedAt.Valid)
}

func TestProductionRouteLifecycleErrorsRemainDistinct(t *testing.T) {
	require.True(t, errors.Is(
		errors.Join(ErrProductionRouteDeleteBlocked, ErrProductionRouteImmutable),
		ErrProductionRouteDeleteBlocked,
	))
}
