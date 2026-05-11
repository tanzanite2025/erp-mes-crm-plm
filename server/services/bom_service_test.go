package services

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupBOMServiceTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	testDB, err := gorm.Open(
		sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())),
		&gorm.Config{DisableForeignKeyConstraintWhenMigrating: true},
	)
	require.NoError(t, err)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE bom_sections (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			code TEXT NOT NULL,
			name TEXT NOT NULL,
			description TEXT,
			is_system BOOLEAN DEFAULT FALSE,
			active BOOLEAN DEFAULT TRUE,
			sort_order INTEGER DEFAULT 0,
			is_default BOOLEAN DEFAULT FALSE,
			legacy_names TEXT NOT NULL DEFAULT '[]'
		)
	`).Error)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE boms (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			revision_no TEXT,
			effective_from DATETIME,
			effective_to DATETIME,
			change_type TEXT,
			change_order_no TEXT,
			site_code TEXT,
			is_default_site BOOLEAN DEFAULT FALSE,
			bom_no TEXT NOT NULL,
			product_id TEXT NOT NULL,
			version_text TEXT,
			status TEXT,
			description TEXT,
			relation_sidecar TEXT
		)
	`).Error)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE bom_items (
			id TEXT PRIMARY KEY,
			bom_id TEXT NOT NULL,
			section TEXT,
			material_id TEXT,
			unit_price REAL DEFAULT 0,
			unit TEXT,
			unit_usage REAL DEFAULT 0,
			wastage_percent REAL DEFAULT 0,
			standard_usage REAL DEFAULT 0,
			material_type TEXT,
			supply_channel TEXT
		)
	`).Error)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE bom_substitute_items (
			id TEXT PRIMARY KEY,
			bom_item_id TEXT NOT NULL,
			material_id TEXT NOT NULL,
			priority INTEGER DEFAULT 1,
			conversion_rate REAL DEFAULT 1,
			notes TEXT
		)
	`).Error)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE audit_logs (
			id TEXT PRIMARY KEY,
			module TEXT,
			target_id TEXT,
			action TEXT,
			diff TEXT,
			operator TEXT,
			ip TEXT,
			created_at DATETIME
		)
	`).Error)

	prevDB := db.DB
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = prevDB
		sqlDB, closeErr := testDB.DB()
		if closeErr == nil {
			_ = sqlDB.Close()
		}
	})

	require.NoError(t, testDB.Create(&models.BOMSection{
		BaseModel:   models.BaseModel{ID: "section-prepare"},
		Code:        "PREPARE",
		Name:        "备料",
		Active:      true,
		SortOrder:   1,
		IsDefault:   true,
		LegacyNames: json.RawMessage(`[]`),
	}).Error)

	return testDB
}

func mustBOMRelationSidecarJSON() json.RawMessage {
	return json.RawMessage(`{
		"kind":"parent_children_protocol",
		"version":"v1",
		"protocolDraft":{
			"rootChildren":["branch:prepare"],
			"branchNodes":[
				{
					"id":"branch:prepare",
					"parentId":"root",
					"children":["branch:prepare:main"],
					"nodeKind":"branch",
					"branchRole":"section",
					"label":"备料拓扑",
					"sectionCode":"PREPARE",
					"sectionName":"备料"
				},
				{
					"id":"branch:prepare:main",
					"parentId":"branch:prepare",
					"children":["auth:item-1"],
					"nodeKind":"branch",
					"branchRole":"collection",
					"label":"主支路",
					"sectionCode":"PREPARE",
					"sectionName":"备料"
				}
			],
			"itemNodes":[
				{
					"id":"auth:item-1",
					"parentId":"branch:prepare:main",
					"children":[],
					"nodeKind":"item",
					"sectionCode":"PREPARE",
					"sectionName":"备料",
					"itemId":"item-1"
				}
			]
		}
	}`)
}

func TestDefaultBOMSectionCodeReturnsEmptyWhenNoActiveSectionExists(t *testing.T) {
	code := defaultBOMSectionCode([]models.BOMSection{
		{Code: "PREPARE", Active: false, IsDefault: true},
		{Code: "ROLLING", Active: false, IsDefault: false},
	})

	require.Equal(t, "", code)
}

func TestMapBOMToDetailResponseIncludesRelationSidecar(t *testing.T) {
	response, err := MapBOMToDetailResponse(models.BOM{
		BaseModel:       models.BaseModel{ID: "bom-1"},
		BOMNo:           "BOM-001",
		VersionText:     "V1.0",
		Status:          "active",
		RelationSidecar: mustBOMRelationSidecarJSON(),
	})

	require.NoError(t, err)
	require.NotNil(t, response.RelationSidecar)
	require.Equal(t, "parent_children_protocol", response.RelationSidecar.Kind)
	require.Equal(t, "v1", response.RelationSidecar.Version)
	require.Equal(t, []string{"branch:prepare"}, response.RelationSidecar.ProtocolDraft.RootChildren)
	require.Len(t, response.RelationSidecar.ProtocolDraft.BranchNodes, 2)
	require.Len(t, response.RelationSidecar.ProtocolDraft.ItemNodes, 1)
}

func TestSaveBOMRejectsMissingRelationSidecar(t *testing.T) {
	t.Run("create", func(t *testing.T) {
		_, err := SaveBOM(context.Background(), SaveBOMInput{
			BOMNo:  "BOM-001",
			Status: "active",
			Items:  []models.BOMItem{},
		})

		require.Error(t, err)
		require.ErrorIs(t, err, ErrBOMRelationSidecarInvalid)
		require.Contains(t, err.Error(), "relationSidecar is required")
	})

	t.Run("update", func(t *testing.T) {
		_, err := SaveBOM(context.Background(), SaveBOMInput{
			ID:     "bom-1",
			BOMNo:  "BOM-001",
			Status: "active",
			Items:  []models.BOMItem{},
		})

		require.Error(t, err)
		require.ErrorIs(t, err, ErrBOMRelationSidecarInvalid)
		require.Contains(t, err.Error(), "relationSidecar is required")
	})
}

func TestSaveBOMUpdatePersistsExplicitRelationSidecar(t *testing.T) {
	testDB := setupBOMServiceTestDB(t)
	relationSidecar := mustBOMRelationSidecarJSON()
	require.NoError(t, testDB.Create(&models.BOM{
		BaseModel:       models.BaseModel{ID: "bom-1"},
		BOMNo:           "BOM-001",
		VersionText:     "V1.0",
		Status:          "active",
		Description:     "before",
		RelationSidecar: relationSidecar,
	}).Error)

	saved, err := SaveBOM(context.Background(), SaveBOMInput{
		ID:              "bom-1",
		BOMNo:           "BOM-001",
		Status:          "active",
		Description:     "after",
		Items:           []models.BOMItem{},
		RelationSidecar: relationSidecar,
	})

	require.NoError(t, err)
	require.NotNil(t, saved.RelationSidecar)
	require.Equal(t, "parent_children_protocol", saved.RelationSidecar.Kind)
	require.Equal(t, "v1", saved.RelationSidecar.Version)

	var stored models.BOM
	require.NoError(t, testDB.First(&stored, "id = ?", "bom-1").Error)
	require.JSONEq(t, string(relationSidecar), string(stored.RelationSidecar))
}

func TestNormalizeBOMRelationSidecarRejectsInvalidKind(t *testing.T) {
	_, err := normalizeBOMRelationSidecar(json.RawMessage(`{
		"kind":"unexpected_protocol",
		"version":"v1",
		"protocolDraft":{
			"rootChildren":[],
			"branchNodes":[],
			"itemNodes":[]
		}
	}`))

	require.Error(t, err)
	require.ErrorIs(t, err, ErrBOMRelationSidecarInvalid)
}
