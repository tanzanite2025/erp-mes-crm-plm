package services

import (
	"errors"
	"fmt"
	"testing"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupSidebarCommandAssignmentTestDB(t *testing.T) {
	t.Helper()

	prevDB := db.DB
	testDB, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())), &gorm.Config{})
	require.NoError(t, err)

	require.NoError(t, testDB.Exec(`
		CREATE TABLE users (
			id TEXT PRIMARY KEY,
			username TEXT NOT NULL UNIQUE,
			password TEXT NOT NULL,
			email TEXT,
			phone_number TEXT,
			first_name TEXT,
			last_name TEXT,
			status TEXT,
			role TEXT,
			employee_id TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		);
	`).Error)

	require.NoError(t, testDB.Exec(`
		CREATE TABLE sidebar_command_categories (
			id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			category_id TEXT NOT NULL UNIQUE,
			name TEXT NOT NULL,
			description TEXT,
			enabled BOOLEAN NOT NULL DEFAULT TRUE,
			status TEXT NOT NULL DEFAULT 'active',
			sort_order INTEGER NOT NULL DEFAULT 0
		);
	`).Error)

	require.NoError(t, testDB.Exec(`
		CREATE TABLE sidebar_command_definitions (
			id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			command_id TEXT NOT NULL UNIQUE,
			title TEXT NOT NULL,
			description TEXT,
			route TEXT NOT NULL,
			search_params TEXT NOT NULL DEFAULT '{}',
			icon TEXT,
			category TEXT NOT NULL DEFAULT 'business',
			assignable BOOLEAN NOT NULL DEFAULT TRUE,
			enabled BOOLEAN NOT NULL DEFAULT TRUE,
			status TEXT NOT NULL DEFAULT 'active',
			sort_order INTEGER NOT NULL DEFAULT 0
		);
	`).Error)

	require.NoError(t, testDB.Exec(`
		CREATE TABLE user_sidebar_command_category_assignments (
			id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			user_id TEXT NOT NULL,
			category_id TEXT NOT NULL,
			sort_order INTEGER NOT NULL DEFAULT 0,
			source TEXT NOT NULL DEFAULT 'manual',
			assigned_by TEXT
		);
	`).Error)

	require.NoError(t, testDB.Exec(`
		CREATE TABLE user_sidebar_command_assignments (
			id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			user_id TEXT NOT NULL,
			command_id TEXT NOT NULL,
			sort_order INTEGER NOT NULL DEFAULT 0,
			source TEXT NOT NULL DEFAULT 'manual',
			assigned_by TEXT
		);
	`).Error)

	db.DB = testDB
	seedSidebarCommandCategories(t)
	seedSidebarCommandDefinitions(t)
	t.Cleanup(func() {
		db.DB = prevDB
		sqlDB, closeErr := testDB.DB()
		if closeErr == nil {
			_ = sqlDB.Close()
		}
	})
}

func seedSidebarCommandCategories(t *testing.T) {
	t.Helper()

	rows := []models.SidebarCommandCategory{
		{CategoryID: "business", Name: "Business", Enabled: true, Status: "active", SortOrder: 10},
		{CategoryID: "warehouse", Name: "Warehouse", Enabled: true, Status: "active", SortOrder: 20},
	}
	for _, row := range rows {
		require.NoError(t, db.DB.Create(&row).Error)
	}
}

func seedSidebarCommandDefinitions(t *testing.T) {
	t.Helper()

	rows := []models.SidebarCommandDefinition{
		{CommandID: "wheel_trace_scan", Title: "Wheel Trace", Route: "/wheel-trace", SearchParams: []byte(`{"scan":"1"}`), Category: "business", Assignable: true, Enabled: true, Status: "active", SortOrder: 5},
		{CommandID: "warehouse_inbound_scan", Title: "Warehouse Inbound", Route: "/warehouse/inbound", SearchParams: []byte(`{"mode":"scan"}`), Category: "warehouse", Assignable: true, Enabled: true, Status: "active", SortOrder: 10},
		{CommandID: "warehouse_shipment_scan", Title: "Warehouse Shipment", Route: "/warehouse/shipment", SearchParams: []byte(`{"mode":"scan"}`), Category: "warehouse", Assignable: true, Enabled: true, Status: "active", SortOrder: 20},
		{CommandID: "warehouse_packaging_assembly", Title: "Packaging Assembly", Route: "/warehouse/packaging-assembly", SearchParams: []byte(`{}`), Category: "warehouse", Assignable: true, Enabled: true, Status: "active", SortOrder: 40},
		{CommandID: "disabled_scan", Title: "Disabled Scan", Route: "/disabled", SearchParams: []byte(`{}`), Category: "warehouse", Assignable: true, Enabled: false, Status: "disabled", SortOrder: 90},
	}
	for _, row := range rows {
		require.NoError(t, db.DB.Create(&row).Error)
	}
}

func seedSidebarCommandUsers(t *testing.T, ids ...string) {
	t.Helper()

	for _, id := range ids {
		require.NoError(t, db.DB.Create(&models.User{
			ID:       id,
			Username: id,
			Password: "$2a$11$abcdefghijklmnopqrstuv",
			Status:   "active",
		}).Error)
	}
}

func TestListSidebarCommandDefinitionsIncludesDisabledCommands(t *testing.T) {
	setupSidebarCommandAssignmentTestDB(t)

	commands, err := ListSidebarCommandDefinitions()
	require.NoError(t, err)
	require.Len(t, commands, 5)

	assignable, err := ListAssignableSidebarCommands()
	require.NoError(t, err)
	require.Len(t, assignable, 4)

	categories, err := ListSidebarCommandCategories()
	require.NoError(t, err)
	require.Len(t, categories, 2)
	require.Equal(t, 3, categories[1].CommandCount)
}

func TestCreateUpdateEnableAndReorderSidebarCommandDefinition(t *testing.T) {
	setupSidebarCommandAssignmentTestDB(t)

	created, err := CreateSidebarCommandDefinition(SaveSidebarCommandDefinitionInput{
		CommandID:    "quality_scan",
		Title:        "Quality Scan",
		Description:  "Quality inspection scan entry",
		Route:        "/quality/scan",
		SearchParams: []byte(`{"mode":"scan"}`),
		Icon:         "ClipboardCheck",
		Category:     "quality",
		Assignable:   true,
		Enabled:      true,
		Status:       "active",
		SortOrder:    40,
	})
	require.NoError(t, err)
	require.Equal(t, "quality_scan", created.CommandID)

	updated, err := UpdateSidebarCommandDefinition("quality_scan", SaveSidebarCommandDefinitionInput{
		Title:        "Quality Inspection",
		Description:  "Updated quality scan entry",
		Route:        "/quality/inspection",
		SearchParams: []byte(`{"mode":"inspection"}`),
		Icon:         "ScanLine",
		Category:     "quality",
		Assignable:   true,
		Enabled:      true,
		Status:       "active",
		SortOrder:    15,
	})
	require.NoError(t, err)
	require.Equal(t, "/quality/inspection", updated.Route)

	disabled, err := SetSidebarCommandDefinitionEnabled("quality_scan", SetSidebarCommandEnabledInput{Enabled: false})
	require.NoError(t, err)
	require.False(t, disabled.Enabled)
	require.Equal(t, "disabled", disabled.Status)

	_, err = ReorderSidebarCommandDefinitions(ReorderSidebarCommandDefinitionsInput{
		CommandIDs: []string{"quality_scan", "wheel_trace_scan", "warehouse_inbound_scan", "warehouse_shipment_scan", "warehouse_packaging_assembly", "disabled_scan"},
	})
	require.NoError(t, err)

	commands, err := ListSidebarCommandDefinitions()
	require.NoError(t, err)
	require.Equal(t, "quality_scan", commands[0].CommandID)
	require.Equal(t, 10, commands[0].SortOrder)
}

func TestCreateUpdateAndEnableSidebarCommandCategory(t *testing.T) {
	setupSidebarCommandAssignmentTestDB(t)

	created, err := CreateSidebarCommandCategory(SaveSidebarCommandCategoryInput{
		CategoryID:  "quality",
		Name:        "Quality",
		Description: "Quality commands",
		Enabled:     true,
		Status:      "active",
		SortOrder:   30,
	})
	require.NoError(t, err)
	require.Equal(t, "quality", created.CategoryID)

	updated, err := UpdateSidebarCommandCategory("quality", SaveSidebarCommandCategoryInput{
		Name:        "Quality Scan",
		Description: "Quality scan commands",
		Enabled:     true,
		Status:      "active",
		SortOrder:   35,
	})
	require.NoError(t, err)
	require.Equal(t, "Quality Scan", updated.Name)

	disabled, err := SetSidebarCommandCategoryEnabled("quality", SetSidebarCommandCategoryEnabledInput{Enabled: false})
	require.NoError(t, err)
	require.False(t, disabled.Enabled)
	require.Equal(t, "disabled", disabled.Status)
}

func TestCreateSidebarCommandDefinitionRejectsPrivateTools(t *testing.T) {
	setupSidebarCommandAssignmentTestDB(t)

	_, err := CreateSidebarCommandDefinition(SaveSidebarCommandDefinitionInput{
		CommandID:  "personal_workbench_photo",
		Title:      "Personal Photo",
		Route:      "/personal-workbench/capture",
		Assignable: true,
		Enabled:    true,
	})
	require.True(t, errors.Is(err, ErrSidebarCommandInvalid), "expected invalid command error, got %v", err)
}

func TestReplaceAndGetSidebarCommandAssignment(t *testing.T) {
	setupSidebarCommandAssignmentTestDB(t)
	seedSidebarCommandUsers(t, "user-1")

	view, err := ReplaceSidebarCommandAssignment("user-1", ReplaceSidebarCommandsInput{
		CommandIDs: []string{"warehouse_inbound_scan", "", "warehouse_inbound_scan", "warehouse_shipment_scan"},
		AssignedBy: "admin-1",
	})

	require.NoError(t, err)
	require.Equal(t, []string{"warehouse_inbound_scan", "warehouse_shipment_scan"}, view.CommandIDs)
	require.Equal(t, view.CommandIDs, view.EffectiveCommandIDs)

	got, err := GetSidebarCommandAssignment("user-1")
	require.NoError(t, err)
	require.Equal(t, view, got)

	commands, err := ListAssignableSidebarCommandsByIDs(got.CommandIDs)
	require.NoError(t, err)
	require.Len(t, commands, 2)
	require.Equal(t, "warehouse_inbound_scan", commands[0].CommandID)
}

func TestReplaceSidebarCommandAssignmentWithCategoriesAndDirectCommands(t *testing.T) {
	setupSidebarCommandAssignmentTestDB(t)
	seedSidebarCommandUsers(t, "user-1")

	view, err := ReplaceSidebarCommandAssignment("user-1", ReplaceSidebarCommandsInput{
		CategoryIDs: []string{"warehouse"},
		CommandIDs:  []string{"warehouse_inbound_scan", "wheel_trace_scan"},
		AssignedBy:  "admin-1",
	})

	require.NoError(t, err)
	require.Equal(t, []string{"warehouse"}, view.CategoryIDs)
	require.Equal(t, []string{"warehouse_inbound_scan", "wheel_trace_scan"}, view.CommandIDs)
	require.Equal(t, []string{"warehouse_inbound_scan", "warehouse_shipment_scan", "warehouse_packaging_assembly", "wheel_trace_scan"}, view.EffectiveCommandIDs)
}

func TestSidebarCommandAssignmentRejectsPrivateTools(t *testing.T) {
	setupSidebarCommandAssignmentTestDB(t)
	seedSidebarCommandUsers(t, "user-1")

	_, err := ReplaceSidebarCommandAssignment("user-1", ReplaceSidebarCommandsInput{
		CommandIDs: []string{"personal_workbench_photo"},
		AssignedBy: "admin-1",
	})

	require.True(t, errors.Is(err, ErrSidebarCommandInvalid), "expected invalid command error, got %v", err)
}

func TestBatchAppendAndCopySidebarCommandAssignment(t *testing.T) {
	setupSidebarCommandAssignmentTestDB(t)
	seedSidebarCommandUsers(t, "user-1", "user-2", "user-3")

	_, err := ReplaceSidebarCommandAssignment("user-2", ReplaceSidebarCommandsInput{
		CategoryIDs: []string{"business"},
		CommandIDs:  []string{"warehouse_inbound_scan"},
		AssignedBy:  "admin-1",
	})
	require.NoError(t, err)

	batchResult, err := BatchAssignSidebarCommands(BatchSidebarCommandsInput{
		UserIDs:     []string{"user-2"},
		CategoryIDs: []string{"warehouse"},
		CommandIDs:  []string{"wheel_trace_scan"},
		Mode:        "append",
		AssignedBy:  "admin-1",
	})
	require.NoError(t, err)
	require.Equal(t, 1, batchResult.Updated)

	userTwo, err := GetSidebarCommandAssignment("user-2")
	require.NoError(t, err)
	require.Equal(t, []string{"business", "warehouse"}, userTwo.CategoryIDs)
	require.Equal(t, []string{"warehouse_inbound_scan", "wheel_trace_scan"}, userTwo.CommandIDs)
	require.Equal(t, []string{"wheel_trace_scan", "warehouse_inbound_scan", "warehouse_shipment_scan", "warehouse_packaging_assembly"}, userTwo.EffectiveCommandIDs)

	copyResult, err := CopySidebarCommandAssignment(CopySidebarCommandsInput{
		SourceUserID:  "user-2",
		TargetUserIDs: []string{"user-2", "user-3"},
		AssignedBy:    "admin-1",
	})
	require.NoError(t, err)
	require.Equal(t, 1, copyResult.Updated)

	userThree, err := GetSidebarCommandAssignment("user-3")
	require.NoError(t, err)
	require.Equal(t, userTwo.CategoryIDs, userThree.CategoryIDs)
	require.Equal(t, userTwo.CommandIDs, userThree.CommandIDs)
	require.Equal(t, userTwo.EffectiveCommandIDs, userThree.EffectiveCommandIDs)
}
