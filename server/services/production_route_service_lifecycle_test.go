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
		CREATE TABLE line_segments (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			line_id TEXT NOT NULL,
			name TEXT NOT NULL,
			description TEXT,
			sort_order INTEGER,
			attributes TEXT
		)`,
		`
		CREATE TABLE line_segment_process_mappings (
			line_segment_id TEXT NOT NULL,
			process_step_id TEXT NOT NULL
		)`,
		`
		CREATE TABLE production_routes (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			code TEXT NOT NULL,
			name TEXT NOT NULL,
			product_id TEXT,
			product_name TEXT,
			product_template_id TEXT,
			description TEXT,
			version INTEGER,
			status TEXT
		)`,
		`
		CREATE TABLE production_route_steps (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			route_id TEXT NOT NULL,
			sequence INTEGER NOT NULL,
			segment_id TEXT NOT NULL,
			process_step_id TEXT,
			execution_mode TEXT NOT NULL,
			quality_gate TEXT NOT NULL,
			quality_routing TEXT,
			estimated_minutes INTEGER,
			transfer_required BOOLEAN,
			description TEXT
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
			process_step_id TEXT NOT NULL,
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
}

func seedProductionRouteLifecycleReferences(t *testing.T, database *gorm.DB) {
	t.Helper()

	require.NoError(t, database.Create(&models.ProcessStep{
		BaseModel: models.BaseModel{ID: "process-outer"},
		Code:      "G24-OUTER",
		Name:      "G24外圈",
		IsActive:  true,
	}).Error)
	require.NoError(t, database.Create(&models.ProcessStep{
		BaseModel: models.BaseModel{ID: "process-forming"},
		Code:      "G24-FORMING",
		Name:      "成型",
		IsActive:  true,
	}).Error)
	require.NoError(t, database.Create(&models.LineSegment{
		BaseModel: models.BaseModel{ID: "segment-roll"},
		LineID:    "line-g24",
		Name:      "卷料",
	}).Error)
	require.NoError(t, database.Create(&models.LineSegment{
		BaseModel: models.BaseModel{ID: "segment-forming"},
		LineID:    "line-g24",
		Name:      "成型",
	}).Error)
	require.NoError(t, database.Exec(`
		INSERT INTO line_segment_process_mappings (line_segment_id, process_step_id)
		VALUES (?, ?), (?, ?)
	`, "segment-roll", "process-outer", "segment-forming", "process-forming").Error)
}

func productionRouteLifecycleDTO(status string, processStepID string) ProductionRouteDTO {
	return ProductionRouteDTO{
		Code:              "G24-ROUTE",
		Name:              "G24 标准路线",
		ProductID:         "product-g24",
		ProductName:       "G24",
		ProductTemplateID: "template-g24",
		Description:       "G24 标准生产路线",
		Version:           1,
		Status:            status,
		Steps: []ProductionRouteStepDTO{{
			ID:               "route-g24-step-outer",
			Sequence:         1,
			SegmentID:        "segment-roll",
			ProcessStepID:    processStepID,
			ExecutionMode:    "IN_HOUSE",
			QualityGate:      "NONE",
			EstimatedMinutes: 10,
		}},
	}
}

func TestSaveProductionRouteAllowsDraftEditAndRemovesDraftStep(t *testing.T) {
	service, database := newProductionRouteLifecycleTestService(t)
	seedProductionRouteLifecycleReferences(t, database)

	created, err := service.SaveProductionRoute(SaveProductionRouteRequest{
		Route:    productionRouteLifecycleDTO(productionRouteStatusDraft, "process-outer"),
		Operator: "tester",
	})
	require.NoError(t, err)
	require.NotEmpty(t, created.ID)
	require.Equal(t, int64(1), created.Version)

	edited := created
	edited.Name = "G24 修改后路线"
	edited.Steps = []ProductionRouteStepDTO{{
		ID:               "temp-route-g24-step-forming",
		Sequence:         1,
		SegmentID:        "segment-forming",
		ProcessStepID:    "process-forming",
		ExecutionMode:    "IN_HOUSE",
		QualityGate:      "NONE",
		EstimatedMinutes: 12,
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
}

func TestSaveProductionRouteRejectsPublishedInPlaceEdit(t *testing.T) {
	service, database := newProductionRouteLifecycleTestService(t)
	seedProductionRouteLifecycleReferences(t, database)

	published := productionRouteLifecycleDTO(productionRouteStatusPublished, "process-outer")
	created, err := service.SaveProductionRoute(SaveProductionRouteRequest{
		Route:    published,
		Operator: "tester",
	})
	require.NoError(t, err)
	published = created

	edited := published
	edited.Name = "不应原地修改"
	_, err = service.SaveProductionRoute(SaveProductionRouteRequest{
		Route:    edited,
		Operator: "tester",
	})
	require.ErrorIs(t, err, ErrProductionRouteImmutable)

	var route models.ProductionRoute
	require.NoError(t, database.First(&route, "id = ?", published.ID).Error)
	require.Equal(t, productionRouteStatusPublished, route.Status)
	require.Equal(t, int64(1), route.Version)
}

func TestSaveProductionRouteRejectsStepFromAnotherRoute(t *testing.T) {
	service, database := newProductionRouteLifecycleTestService(t)
	seedProductionRouteLifecycleReferences(t, database)

	created, err := service.SaveProductionRoute(SaveProductionRouteRequest{
		Route: productionRouteLifecycleDTO(productionRouteStatusDraft, "process-outer"),
	})
	require.NoError(t, err)
	currentStepID := created.Steps[0].ID

	require.NoError(t, database.Create(&models.ProductionRoute{
		BaseModel: models.BaseModel{ID: "route-other"},
		Code:      "OTHER-ROUTE",
		Name:      "其他路线",
		Version:   1,
		Status:    productionRouteStatusDraft,
	}).Error)
	require.NoError(t, database.Create(&models.ProductionRouteStep{
		BaseModel:     models.BaseModel{ID: "route-other-step"},
		RouteID:       "route-other",
		Sequence:      1,
		SegmentID:     "segment-roll",
		ProcessStepID: "process-outer",
		ExecutionMode: "IN_HOUSE",
		QualityGate:   "NONE",
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

func TestSaveProductionRouteAllowsOnlyExactPublishedArchival(t *testing.T) {
	service, database := newProductionRouteLifecycleTestService(t)
	seedProductionRouteLifecycleReferences(t, database)

	published := productionRouteLifecycleDTO(productionRouteStatusPublished, "process-outer")
	created, err := service.SaveProductionRoute(SaveProductionRouteRequest{Route: published, Operator: "tester"})
	require.NoError(t, err)
	published = created

	archived := published
	archived.Status = productionRouteStatusArchived
	archivedRoute, err := service.SaveProductionRoute(SaveProductionRouteRequest{
		Route:    archived,
		Operator: "tester",
	})
	require.NoError(t, err)
	require.Equal(t, productionRouteStatusArchived, archivedRoute.Status)
	require.Equal(t, int64(2), archivedRoute.Version)

	archivedRoute.Name = "归档后不应修改"
	_, err = service.SaveProductionRoute(SaveProductionRouteRequest{
		Route: archivedRoute,
	})
	require.ErrorIs(t, err, ErrProductionRouteImmutable)

	var persisted models.ProductionRoute
	require.NoError(t, database.First(&persisted, "id = ?", published.ID).Error)
	require.Equal(t, productionRouteStatusArchived, persisted.Status)
}

func TestDeleteProductionRouteBlocksPublishedAndReferencedDraftRoutes(t *testing.T) {
	t.Run("published route", func(t *testing.T) {
		service, database := newProductionRouteLifecycleTestService(t)
		seedProductionRouteLifecycleReferences(t, database)
		published := productionRouteLifecycleDTO(productionRouteStatusPublished, "process-outer")
		created, err := service.SaveProductionRoute(SaveProductionRouteRequest{Route: published})
		require.NoError(t, err)
		published = created

		err = service.DeleteProductionRoute(published.ID, "tester", "")
		require.ErrorIs(t, err, ErrProductionRouteImmutable)
		require.NoError(t, database.First(&models.ProductionRoute{}, "id = ?", published.ID).Error)
	})

	t.Run("draft route with execution fact", func(t *testing.T) {
		service, database := newProductionRouteLifecycleTestService(t)
		seedProductionRouteLifecycleReferences(t, database)
		draft := productionRouteLifecycleDTO(productionRouteStatusDraft, "process-outer")
		created, err := service.SaveProductionRoute(SaveProductionRouteRequest{Route: draft})
		require.NoError(t, err)
		draft = created
		require.NoError(t, database.Exec(`
			INSERT INTO production_operation_executions (
				id, product_barcode, route_id, route_step_id, process_step_id
			) VALUES (?, ?, ?, ?, ?)
		`, "operation-1", "G24-001", draft.ID, "route-g24-step-outer", "process-outer").Error)

		err = service.DeleteProductionRoute(draft.ID, "tester", "")
		require.ErrorIs(t, err, ErrProductionRouteDeleteBlocked)
		require.NoError(t, database.First(&models.ProductionRoute{}, "id = ?", draft.ID).Error)
	})
}

func TestDeleteProductionRouteAllowsUnreferencedDraft(t *testing.T) {
	service, database := newProductionRouteLifecycleTestService(t)
	seedProductionRouteLifecycleReferences(t, database)
	draft := productionRouteLifecycleDTO(productionRouteStatusDraft, "process-outer")
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
