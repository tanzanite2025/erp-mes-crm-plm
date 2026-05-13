package services

import (
	"fmt"
	"testing"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func TestParseAndValidateStatuses(t *testing.T) {
	tests := []struct {
		name      string
		input     string
		want      []string
		wantError bool
	}{
		{
			name:      "Valid single status",
			input:     "DRAFT",
			want:      []string{"DRAFT"},
			wantError: false,
		},
		{
			name:      "Valid multiple statuses",
			input:     "DRAFT,RELEASED",
			want:      []string{"DRAFT", "RELEASED"},
			wantError: false,
		},
		{
			name:      "Valid statuses with whitespace",
			input:     " DRAFT , RELEASED ",
			want:      []string{"DRAFT", "RELEASED"},
			wantError: false,
		},
		{
			name:      "Valid statuses lowercase (should normalize)",
			input:     "draft,released",
			want:      []string{"DRAFT", "RELEASED"},
			wantError: false,
		},
		{
			name:      "Invalid status",
			input:     "INVALID",
			want:      nil,
			wantError: true,
		},
		{
			name:      "Mixed valid and invalid",
			input:     "DRAFT,INVALID,RELEASED",
			want:      nil,
			wantError: true,
		},
		{
			name:      "Empty string",
			input:     "",
			want:      nil,
			wantError: false,
		},
		{
			name:      "Only whitespace",
			input:     "  ,  ,  ",
			want:      nil,
			wantError: false,
		},
		{
			name:      "All valid statuses",
			input:     "DRAFT,REVIEWING,APPROVED,VALIDATING,RELEASED,OBSOLETE",
			want:      []string{"DRAFT", "REVIEWING", "APPROVED", "VALIDATING", "RELEASED", "OBSOLETE"},
			wantError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := parseAndValidateStatuses(tt.input)
			if (err != nil) != tt.wantError {
				t.Errorf("parseAndValidateStatuses() error = %v, wantError %v", err, tt.wantError)
				return
			}
			if !tt.wantError {
				if len(got) != len(tt.want) {
					t.Errorf("parseAndValidateStatuses() got length = %v, want length %v", len(got), len(tt.want))
					return
				}
				for i := range got {
					if got[i] != tt.want[i] {
						t.Errorf("parseAndValidateStatuses() got[%d] = %v, want[%d] %v", i, got[i], i, tt.want[i])
					}
				}
			}
		})
	}
}

func TestParseAndValidateBOMTypes(t *testing.T) {
	tests := []struct {
		name      string
		input     string
		want      []string
		wantError bool
	}{
		{
			name:      "Valid single type",
			input:     "EBOM",
			want:      []string{"EBOM"},
			wantError: false,
		},
		{
			name:      "Valid multiple types",
			input:     "EBOM,MBOM",
			want:      []string{"EBOM", "MBOM"},
			wantError: false,
		},
		{
			name:      "Valid types with whitespace",
			input:     " EBOM , MBOM ",
			want:      []string{"EBOM", "MBOM"},
			wantError: false,
		},
		{
			name:      "Valid types lowercase (should normalize)",
			input:     "ebom,mbom",
			want:      []string{"EBOM", "MBOM"},
			wantError: false,
		},
		{
			name:      "Invalid type",
			input:     "INVALID",
			want:      nil,
			wantError: true,
		},
		{
			name:      "Mixed valid and invalid",
			input:     "EBOM,INVALID",
			want:      nil,
			wantError: true,
		},
		{
			name:      "Empty string",
			input:     "",
			want:      nil,
			wantError: false,
		},
		{
			name:      "Only whitespace",
			input:     "  ,  ",
			want:      nil,
			wantError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := parseAndValidateBOMTypes(tt.input)
			if (err != nil) != tt.wantError {
				t.Errorf("parseAndValidateBOMTypes() error = %v, wantError %v", err, tt.wantError)
				return
			}
			if !tt.wantError {
				if len(got) != len(tt.want) {
					t.Errorf("parseAndValidateBOMTypes() got length = %v, want length %v", len(got), len(tt.want))
					return
				}
				for i := range got {
					if got[i] != tt.want[i] {
						t.Errorf("parseAndValidateBOMTypes() got[%d] = %v, want[%d] %v", i, got[i], i, tt.want[i])
					}
				}
			}
		})
	}
}

func TestContains(t *testing.T) {
	tests := []struct {
		name  string
		slice []string
		item  string
		want  bool
	}{
		{
			name:  "Item exists",
			slice: []string{"DRAFT", "RELEASED"},
			item:  "DRAFT",
			want:  true,
		},
		{
			name:  "Item does not exist",
			slice: []string{"DRAFT", "RELEASED"},
			item:  "OBSOLETE",
			want:  false,
		},
		{
			name:  "Empty slice",
			slice: []string{},
			item:  "DRAFT",
			want:  false,
		},
		{
			name:  "Empty item",
			slice: []string{"DRAFT", "RELEASED"},
			item:  "",
			want:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := contains(tt.slice, tt.item); got != tt.want {
				t.Errorf("contains() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestValidBOMStatusesConstants(t *testing.T) {
	// Verify that ValidBOMStatuses contains all expected status values
	expectedStatuses := []string{
		models.BOMStatusDraft,
		models.BOMStatusReviewing,
		models.BOMStatusApproved,
		models.BOMStatusValidating,
		models.BOMStatusReleased,
		models.BOMStatusObsolete,
	}

	if len(ValidBOMStatuses) != len(expectedStatuses) {
		t.Errorf("ValidBOMStatuses length = %v, want %v", len(ValidBOMStatuses), len(expectedStatuses))
	}

	for _, expected := range expectedStatuses {
		if !contains(ValidBOMStatuses, expected) {
			t.Errorf("ValidBOMStatuses missing expected status: %v", expected)
		}
	}
}

func TestValidBOMTypesConstants(t *testing.T) {
	// Verify that ValidBOMTypes contains all expected type values
	expectedTypes := []string{
		models.BOMTypeEBOM,
		models.BOMTypeMBOM,
	}

	if len(ValidBOMTypes) != len(expectedTypes) {
		t.Errorf("ValidBOMTypes length = %v, want %v", len(ValidBOMTypes), len(expectedTypes))
	}

	for _, expected := range expectedTypes {
		if !contains(ValidBOMTypes, expected) {
			t.Errorf("ValidBOMTypes missing expected type: %v", expected)
		}
	}
}

// ============================================================================
// Unit Tests for upsertBOMItems (BOM ID Stability Feature)
// ============================================================================

// setupBOMTestDB creates an in-memory SQLite database for testing
func setupBOMTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	testDB, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)

	// Create tables manually to avoid AutoMigrate issues
	require.NoError(t, testDB.Exec(`
		CREATE TABLE IF NOT EXISTS boms (
			id TEXT PRIMARY KEY,
			bom_no TEXT NOT NULL,
			bom_type TEXT NOT NULL
		)
	`).Error)

	require.NoError(t, testDB.Exec(`
		CREATE TABLE IF NOT EXISTS bom_items (
			id TEXT PRIMARY KEY,
			bom_id TEXT NOT NULL,
			section TEXT,
			material_id TEXT,
			unit_price REAL,
			unit TEXT,
			unit_usage REAL,
			wastage_percent REAL,
			standard_usage REAL,
			material_type TEXT,
			supply_channel TEXT,
			sort_order INTEGER DEFAULT 0,
			FOREIGN KEY (bom_id) REFERENCES boms(id)
		)
	`).Error)

	return testDB
}

// createTestBOM creates a simple BOM record for testing
func createTestBOM(t *testing.T, db *gorm.DB, bomNo string) string {
	t.Helper()
	bomID := uuid.NewString()
	require.NoError(t, db.Exec("INSERT INTO boms (id, bom_no, bom_type) VALUES (?, ?, ?)", 
		bomID, bomNo, models.BOMTypeEBOM).Error)
	return bomID
}

// TestUpsertBOMItems_AllNew tests creating all new items (no IDs provided)
func TestUpsertBOMItems_AllNew(t *testing.T) {
	db := setupBOMTestDB(t)
	bomID := createTestBOM(t, db, "BOM-TEST-001")

	// Prepare items without IDs
	items := []models.BOMItem{
		{MaterialID: "mat-1", UnitUsage: 10.0, Section: "MAIN"},
		{MaterialID: "mat-2", UnitUsage: 20.0, Section: "MAIN"},
		{MaterialID: "mat-3", UnitUsage: 30.0, Section: "MAIN"},
	}

	// Execute upsert
	result, err := upsertBOMItems(db, bomID, items)
	require.NoError(t, err)
	require.NotNil(t, result)

	// Verify statistics
	assert.Equal(t, 3, result.Created, "Should create 3 items")
	assert.Equal(t, 0, result.Updated, "Should update 0 items")
	assert.Equal(t, 0, result.Deleted, "Should delete 0 items")

	// Verify database state
	var savedItems []models.BOMItem
	require.NoError(t, db.Where("bom_id = ?", bomID).Order("sort_order ASC").Find(&savedItems).Error)
	assert.Len(t, savedItems, 3, "Should have 3 items in database")

	// Verify IDs were generated
	for i, item := range savedItems {
		assert.NotEmpty(t, item.ID, "Item %d should have an ID", i)
		assert.Equal(t, bomID, item.BOMID, "Item %d should have correct BOM ID", i)
		assert.Equal(t, i, item.SortOrder, "Item %d should have correct sort order", i)
	}

	// Verify material IDs
	assert.Equal(t, "mat-1", savedItems[0].MaterialID)
	assert.Equal(t, "mat-2", savedItems[1].MaterialID)
	assert.Equal(t, "mat-3", savedItems[2].MaterialID)
}

// TestUpsertBOMItems_AllUpdate tests updating all existing items (IDs match)
func TestUpsertBOMItems_AllUpdate(t *testing.T) {
	db := setupBOMTestDB(t)
	bomID := createTestBOM(t, db, "BOM-TEST-002")

	// Create existing items
	existingItems := []models.BOMItem{
		{ID: uuid.NewString(), BOMID: bomID, MaterialID: "mat-1", UnitUsage: 10.0, Section: "MAIN", SortOrder: 0},
		{ID: uuid.NewString(), BOMID: bomID, MaterialID: "mat-2", UnitUsage: 20.0, Section: "MAIN", SortOrder: 1},
		{ID: uuid.NewString(), BOMID: bomID, MaterialID: "mat-3", UnitUsage: 30.0, Section: "MAIN", SortOrder: 2},
	}
	require.NoError(t, db.Create(&existingItems).Error)

	// Prepare updated items (same IDs, different values)
	updatedItems := []models.BOMItem{
		{ID: existingItems[0].ID, MaterialID: "mat-1", UnitUsage: 15.0, Section: "MAIN"}, // Changed usage
		{ID: existingItems[1].ID, MaterialID: "mat-2", UnitUsage: 25.0, Section: "MAIN"}, // Changed usage
		{ID: existingItems[2].ID, MaterialID: "mat-3", UnitUsage: 35.0, Section: "MAIN"}, // Changed usage
	}

	// Execute upsert
	result, err := upsertBOMItems(db, bomID, updatedItems)
	require.NoError(t, err)
	require.NotNil(t, result)

	// Verify statistics
	assert.Equal(t, 0, result.Created, "Should create 0 items")
	assert.Equal(t, 3, result.Updated, "Should update 3 items")
	assert.Equal(t, 0, result.Deleted, "Should delete 0 items")

	// Verify database state
	var savedItems []models.BOMItem
	require.NoError(t, db.Where("bom_id = ?", bomID).Order("sort_order ASC").Find(&savedItems).Error)
	assert.Len(t, savedItems, 3, "Should still have 3 items in database")

	// Verify IDs are preserved
	assert.Equal(t, existingItems[0].ID, savedItems[0].ID, "Item 0 ID should be preserved")
	assert.Equal(t, existingItems[1].ID, savedItems[1].ID, "Item 1 ID should be preserved")
	assert.Equal(t, existingItems[2].ID, savedItems[2].ID, "Item 2 ID should be preserved")

	// Verify values are updated
	assert.Equal(t, 15.0, savedItems[0].UnitUsage, "Item 0 usage should be updated")
	assert.Equal(t, 25.0, savedItems[1].UnitUsage, "Item 1 usage should be updated")
	assert.Equal(t, 35.0, savedItems[2].UnitUsage, "Item 2 usage should be updated")
}

// TestUpsertBOMItems_Mixed tests mixed operations (create + update + delete)
func TestUpsertBOMItems_Mixed(t *testing.T) {
	db := setupBOMTestDB(t)
	bomID := createTestBOM(t, db, "BOM-TEST-003")

	// Create existing items
	existingItems := []models.BOMItem{
		{ID: uuid.NewString(), BOMID: bomID, MaterialID: "mat-1", UnitUsage: 10.0, Section: "MAIN", SortOrder: 0},
		{ID: uuid.NewString(), BOMID: bomID, MaterialID: "mat-2", UnitUsage: 20.0, Section: "MAIN", SortOrder: 1},
		{ID: uuid.NewString(), BOMID: bomID, MaterialID: "mat-3", UnitUsage: 30.0, Section: "MAIN", SortOrder: 2},
		{ID: uuid.NewString(), BOMID: bomID, MaterialID: "mat-4", UnitUsage: 40.0, Section: "MAIN", SortOrder: 3},
		{ID: uuid.NewString(), BOMID: bomID, MaterialID: "mat-5", UnitUsage: 50.0, Section: "MAIN", SortOrder: 4},
	}
	require.NoError(t, db.Create(&existingItems).Error)

	// Prepare mixed items:
	// - Keep item 0 (update)
	// - Keep item 1 (update)
	// - Keep item 2 (update)
	// - Delete item 3 (not in list)
	// - Delete item 4 (not in list)
	// - Add 2 new items (no ID)
	mixedItems := []models.BOMItem{
		{ID: existingItems[0].ID, MaterialID: "mat-1", UnitUsage: 11.0, Section: "MAIN"}, // Update
		{ID: existingItems[1].ID, MaterialID: "mat-2", UnitUsage: 21.0, Section: "MAIN"}, // Update
		{ID: existingItems[2].ID, MaterialID: "mat-3", UnitUsage: 31.0, Section: "MAIN"}, // Update
		{MaterialID: "mat-6", UnitUsage: 60.0, Section: "MAIN"},                          // Create (no ID)
		{MaterialID: "mat-7", UnitUsage: 70.0, Section: "MAIN"},                          // Create (no ID)
	}

	// Execute upsert
	result, err := upsertBOMItems(db, bomID, mixedItems)
	require.NoError(t, err)
	require.NotNil(t, result)

	// Verify statistics
	assert.Equal(t, 2, result.Created, "Should create 2 items")
	assert.Equal(t, 3, result.Updated, "Should update 3 items")
	assert.Equal(t, 2, result.Deleted, "Should delete 2 items")

	// Verify database state
	var savedItems []models.BOMItem
	require.NoError(t, db.Where("bom_id = ?", bomID).Order("sort_order ASC").Find(&savedItems).Error)
	assert.Len(t, savedItems, 5, "Should have 5 items in database (3 updated + 2 new)")

	// Verify IDs are preserved for updated items
	assert.Equal(t, existingItems[0].ID, savedItems[0].ID, "Item 0 ID should be preserved")
	assert.Equal(t, existingItems[1].ID, savedItems[1].ID, "Item 1 ID should be preserved")
	assert.Equal(t, existingItems[2].ID, savedItems[2].ID, "Item 2 ID should be preserved")

	// Verify new items have IDs
	assert.NotEmpty(t, savedItems[3].ID, "New item 3 should have an ID")
	assert.NotEmpty(t, savedItems[4].ID, "New item 4 should have an ID")

	// Verify material IDs
	assert.Equal(t, "mat-1", savedItems[0].MaterialID)
	assert.Equal(t, "mat-2", savedItems[1].MaterialID)
	assert.Equal(t, "mat-3", savedItems[2].MaterialID)
	assert.Equal(t, "mat-6", savedItems[3].MaterialID)
	assert.Equal(t, "mat-7", savedItems[4].MaterialID)

	// Verify deleted items are gone
	var deletedCount int64
	db.Model(&models.BOMItem{}).Where("bom_id = ? AND material_id IN ?", bomID, []string{"mat-4", "mat-5"}).Count(&deletedCount)
	assert.Equal(t, int64(0), deletedCount, "Deleted items should not exist")
}

// TestUpsertBOMItems_EmptyList tests deleting all items (empty list)
func TestUpsertBOMItems_EmptyList(t *testing.T) {
	db := setupBOMTestDB(t)
	bomID := createTestBOM(t, db, "BOM-TEST-004")

	// Create existing items
	existingItems := []models.BOMItem{
		{ID: uuid.NewString(), BOMID: bomID, MaterialID: "mat-1", UnitUsage: 10.0, Section: "MAIN", SortOrder: 0},
		{ID: uuid.NewString(), BOMID: bomID, MaterialID: "mat-2", UnitUsage: 20.0, Section: "MAIN", SortOrder: 1},
	}
	require.NoError(t, db.Create(&existingItems).Error)

	// Execute upsert with empty list
	result, err := upsertBOMItems(db, bomID, []models.BOMItem{})
	require.NoError(t, err)
	require.NotNil(t, result)

	// Verify statistics
	assert.Equal(t, 0, result.Created, "Should create 0 items")
	assert.Equal(t, 0, result.Updated, "Should update 0 items")
	assert.Equal(t, 2, result.Deleted, "Should delete 2 items")

	// Verify database state
	var savedItems []models.BOMItem
	require.NoError(t, db.Where("bom_id = ?", bomID).Find(&savedItems).Error)
	assert.Len(t, savedItems, 0, "Should have 0 items in database")
}

// TestUpsertBOMItems_PreservesSortOrder tests that sort order is correctly set
func TestUpsertBOMItems_PreservesSortOrder(t *testing.T) {
	db := setupBOMTestDB(t)
	bomID := createTestBOM(t, db, "BOM-TEST-005")

	// Create items in specific order
	items := []models.BOMItem{
		{MaterialID: "mat-3", UnitUsage: 30.0, Section: "MAIN"}, // Should get SortOrder 0
		{MaterialID: "mat-1", UnitUsage: 10.0, Section: "MAIN"}, // Should get SortOrder 1
		{MaterialID: "mat-2", UnitUsage: 20.0, Section: "MAIN"}, // Should get SortOrder 2
	}

	// Execute upsert
	result, err := upsertBOMItems(db, bomID, items)
	require.NoError(t, err)
	require.NotNil(t, result)

	// Verify database state
	var savedItems []models.BOMItem
	require.NoError(t, db.Where("bom_id = ?", bomID).Order("sort_order ASC").Find(&savedItems).Error)
	assert.Len(t, savedItems, 3)

	// Verify sort order matches input order
	assert.Equal(t, 0, savedItems[0].SortOrder)
	assert.Equal(t, "mat-3", savedItems[0].MaterialID)

	assert.Equal(t, 1, savedItems[1].SortOrder)
	assert.Equal(t, "mat-1", savedItems[1].MaterialID)

	assert.Equal(t, 2, savedItems[2].SortOrder)
	assert.Equal(t, "mat-2", savedItems[2].MaterialID)
}

// TestUpsertBOMItems_FrontendGeneratedID tests creating items with frontend-generated IDs
func TestUpsertBOMItems_FrontendGeneratedID(t *testing.T) {
	db := setupBOMTestDB(t)
	bomID := createTestBOM(t, db, "BOM-TEST-006")

	// Prepare items with frontend-generated IDs (not in database yet)
	frontendID1 := uuid.NewString()
	frontendID2 := uuid.NewString()
	items := []models.BOMItem{
		{ID: frontendID1, MaterialID: "mat-1", UnitUsage: 10.0, Section: "MAIN"},
		{ID: frontendID2, MaterialID: "mat-2", UnitUsage: 20.0, Section: "MAIN"},
	}

	// Execute upsert
	result, err := upsertBOMItems(db, bomID, items)
	require.NoError(t, err)
	require.NotNil(t, result)

	// Verify statistics
	assert.Equal(t, 2, result.Created, "Should create 2 items")
	assert.Equal(t, 0, result.Updated, "Should update 0 items")
	assert.Equal(t, 0, result.Deleted, "Should delete 0 items")

	// Verify database state
	var savedItems []models.BOMItem
	require.NoError(t, db.Where("bom_id = ?", bomID).Order("sort_order ASC").Find(&savedItems).Error)
	assert.Len(t, savedItems, 2)

	// Verify frontend-generated IDs are preserved
	assert.Equal(t, frontendID1, savedItems[0].ID, "Frontend-generated ID 1 should be preserved")
	assert.Equal(t, frontendID2, savedItems[1].ID, "Frontend-generated ID 2 should be preserved")
}

// TestUpsertBOMItemsLegacy_AllEmpty tests legacy mode when all IDs are empty
func TestUpsertBOMItemsLegacy_AllEmpty(t *testing.T) {
	db := setupBOMTestDB(t)
	bomID := createTestBOM(t, db, "BOM-TEST-007")

	// Create existing items
	existingItems := []models.BOMItem{
		{ID: uuid.NewString(), BOMID: bomID, MaterialID: "mat-old-1", UnitUsage: 10.0, Section: "MAIN", SortOrder: 0},
		{ID: uuid.NewString(), BOMID: bomID, MaterialID: "mat-old-2", UnitUsage: 20.0, Section: "MAIN", SortOrder: 1},
	}
	require.NoError(t, db.Create(&existingItems).Error)

	// Prepare items without IDs (should trigger legacy mode)
	items := []models.BOMItem{
		{MaterialID: "mat-new-1", UnitUsage: 30.0, Section: "MAIN"},
		{MaterialID: "mat-new-2", UnitUsage: 40.0, Section: "MAIN"},
		{MaterialID: "mat-new-3", UnitUsage: 50.0, Section: "MAIN"},
	}

	// Execute upsert (should use legacy mode)
	result, err := upsertBOMItems(db, bomID, items)
	require.NoError(t, err)
	require.NotNil(t, result)

	// Verify statistics (legacy mode reports all as created)
	assert.Equal(t, 3, result.Created, "Should create 3 items in legacy mode")
	assert.Equal(t, 0, result.Updated, "Should update 0 items in legacy mode")
	assert.Equal(t, 0, result.Deleted, "Should delete 0 items in legacy mode")

	// Verify database state
	var savedItems []models.BOMItem
	require.NoError(t, db.Where("bom_id = ?", bomID).Order("sort_order ASC").Find(&savedItems).Error)
	assert.Len(t, savedItems, 3, "Should have 3 items (old items deleted, new items created)")

	// Verify old items are gone
	assert.Equal(t, "mat-new-1", savedItems[0].MaterialID)
	assert.Equal(t, "mat-new-2", savedItems[1].MaterialID)
	assert.Equal(t, "mat-new-3", savedItems[2].MaterialID)

	// Verify new IDs were generated
	assert.NotEmpty(t, savedItems[0].ID)
	assert.NotEmpty(t, savedItems[1].ID)
	assert.NotEmpty(t, savedItems[2].ID)
}

// TestUpsertBOMItems_MultipleBOMs tests that items from different BOMs don't interfere
func TestUpsertBOMItems_MultipleBOMs(t *testing.T) {
	db := setupBOMTestDB(t)
	bomID1 := createTestBOM(t, db, "BOM-TEST-008-A")
	bomID2 := createTestBOM(t, db, "BOM-TEST-008-B")

	// Create items for BOM 1
	items1 := []models.BOMItem{
		{MaterialID: "mat-1", UnitUsage: 10.0, Section: "MAIN"},
		{MaterialID: "mat-2", UnitUsage: 20.0, Section: "MAIN"},
	}
	result1, err := upsertBOMItems(db, bomID1, items1)
	require.NoError(t, err)
	assert.Equal(t, 2, result1.Created)

	// Create items for BOM 2
	items2 := []models.BOMItem{
		{MaterialID: "mat-3", UnitUsage: 30.0, Section: "MAIN"},
		{MaterialID: "mat-4", UnitUsage: 40.0, Section: "MAIN"},
		{MaterialID: "mat-5", UnitUsage: 50.0, Section: "MAIN"},
	}
	result2, err := upsertBOMItems(db, bomID2, items2)
	require.NoError(t, err)
	assert.Equal(t, 3, result2.Created)

	// Verify BOM 1 has 2 items
	var savedItems1 []models.BOMItem
	require.NoError(t, db.Where("bom_id = ?", bomID1).Find(&savedItems1).Error)
	assert.Len(t, savedItems1, 2)

	// Verify BOM 2 has 3 items
	var savedItems2 []models.BOMItem
	require.NoError(t, db.Where("bom_id = ?", bomID2).Find(&savedItems2).Error)
	assert.Len(t, savedItems2, 3)

	// Update BOM 1 (should not affect BOM 2)
	var bom1Items []models.BOMItem
	require.NoError(t, db.Where("bom_id = ?", bomID1).Find(&bom1Items).Error)
	updatedItems1 := []models.BOMItem{
		{ID: bom1Items[0].ID, MaterialID: "mat-1", UnitUsage: 15.0, Section: "MAIN"}, // Update
	}
	result3, err := upsertBOMItems(db, bomID1, updatedItems1)
	require.NoError(t, err)
	assert.Equal(t, 0, result3.Created)
	assert.Equal(t, 1, result3.Updated)
	assert.Equal(t, 1, result3.Deleted) // One item deleted

	// Verify BOM 1 now has 1 item
	require.NoError(t, db.Where("bom_id = ?", bomID1).Find(&savedItems1).Error)
	assert.Len(t, savedItems1, 1)

	// Verify BOM 2 still has 3 items (unchanged)
	require.NoError(t, db.Where("bom_id = ?", bomID2).Find(&savedItems2).Error)
	assert.Len(t, savedItems2, 3)
}

// TestUpsertBOMItems_Transaction tests that upsert works within a transaction
func TestUpsertBOMItems_Transaction(t *testing.T) {
	db := setupBOMTestDB(t)
	bomID := createTestBOM(t, db, "BOM-TEST-009")

	// Test successful transaction
	err := db.Transaction(func(tx *gorm.DB) error {
		items := []models.BOMItem{
			{MaterialID: "mat-1", UnitUsage: 10.0, Section: "MAIN"},
			{MaterialID: "mat-2", UnitUsage: 20.0, Section: "MAIN"},
		}
		result, err := upsertBOMItems(tx, bomID, items)
		require.NoError(t, err)
		assert.Equal(t, 2, result.Created)
		return nil
	})
	require.NoError(t, err)

	// Verify items were saved
	var savedItems []models.BOMItem
	require.NoError(t, db.Where("bom_id = ?", bomID).Find(&savedItems).Error)
	assert.Len(t, savedItems, 2)

	// Test rolled-back transaction
	err = db.Transaction(func(tx *gorm.DB) error {
		items := []models.BOMItem{
			{MaterialID: "mat-3", UnitUsage: 30.0, Section: "MAIN"},
		}
		_, err := upsertBOMItems(tx, bomID, items)
		require.NoError(t, err)
		return fmt.Errorf("intentional rollback")
	})
	require.Error(t, err)

	// Verify items were NOT saved (still 2 items)
	require.NoError(t, db.Where("bom_id = ?", bomID).Find(&savedItems).Error)
	assert.Len(t, savedItems, 2, "Transaction should have been rolled back")
}
