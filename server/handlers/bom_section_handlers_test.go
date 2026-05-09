package handlers

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func setupBOMSectionHandlerTestDB(t *testing.T) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	setupHandlerSQLiteTestDB(t)

	statements := []string{
		`CREATE TABLE bom_sections (
			id TEXT PRIMARY KEY NOT NULL,
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
			legacy_names TEXT DEFAULT '[]'
		)`,
	}

	for _, statement := range statements {
		require.NoError(t, db.DB.Exec(statement).Error)
	}
}

func seedBOMSection(t *testing.T, section models.BOMSection) models.BOMSection {
	t.Helper()
	if len(section.LegacyNames) == 0 {
		section.LegacyNames = marshalBOMSectionStringSlice([]string{section.Name})
	}
	require.NoError(t, db.DB.Create(&section).Error)
	return section
}

func performSaveBOMSectionRequest(t *testing.T, body string) *httptest.ResponseRecorder {
	t.Helper()
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(http.MethodPost, "/api/v1/engineering/bom-sections", strings.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	ctx.Request = request
	SaveBOMSectionHandler(ctx)
	return recorder
}

func performPatchBOMSectionRequest(t *testing.T, sectionID string, body string) *httptest.ResponseRecorder {
	t.Helper()
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(http.MethodPatch, "/api/v1/engineering/bom-sections/"+sectionID, strings.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	ctx.Request = request
	ctx.Params = gin.Params{{Key: "id", Value: sectionID}}
	PatchBOMSectionHandler(ctx)
	return recorder
}

func TestSaveBOMSectionHandlerRejectsNormalizedIdentifierConflicts(t *testing.T) {
	setupBOMSectionHandlerTestDB(t)

	seedBOMSection(t, models.BOMSection{
		BaseModel: models.BaseModel{ID: "section-machining"},
		Code:      "MACHINING",
		Name:      "机加",
		Active:    true,
		IsDefault: true,
		SortOrder: 1,
	})

	recorder := performSaveBOMSectionRequest(t, `{
		"code":"CUTTING",
		"name":"机 加",
		"description":"",
		"active":true,
		"sortOrder":2,
		"isDefault":false
	}`)

	require.Equal(t, http.StatusBadRequest, recorder.Code, recorder.Body.String())
	require.Contains(t, recorder.Body.String(), "bom section identifier conflict")

	var count int64
	require.NoError(t, db.DB.Model(&models.BOMSection{}).Count(&count).Error)
	require.Equal(t, int64(1), count)
}

func TestPatchBOMSectionHandlerRejectsDeactivatingLastActiveSection(t *testing.T) {
	setupBOMSectionHandlerTestDB(t)

	section := seedBOMSection(t, models.BOMSection{
		BaseModel: models.BaseModel{ID: "section-only"},
		Code:      "PREPARE",
		Name:      "备料",
		Active:    true,
		IsDefault: true,
		SortOrder: 1,
	})
	version := optimisticVersionForResponse(section.UpdatedAt, section.CreatedAt)

	recorder := performPatchBOMSectionRequest(t, section.ID, fmt.Sprintf(`{
		"op":"PATCH",
		"delta":{"active":{"o":true,"n":false}},
		"metadata":{"id":"%s","version":%d}
	}`, section.ID, version))

	require.Equal(t, http.StatusBadRequest, recorder.Code, recorder.Body.String())
	require.Contains(t, recorder.Body.String(), "at least one active BOM section is required")

	var reloaded models.BOMSection
	require.NoError(t, db.DB.First(&reloaded, "id = ?", section.ID).Error)
	require.True(t, reloaded.Active)
	require.True(t, reloaded.IsDefault)
}

func TestPatchBOMSectionHandlerReassignsDefaultToRemainingActiveSection(t *testing.T) {
	setupBOMSectionHandlerTestDB(t)

	defaultSection := seedBOMSection(t, models.BOMSection{
		BaseModel: models.BaseModel{ID: "section-default"},
		Code:      "PREPARE",
		Name:      "备料",
		Active:    true,
		IsDefault: true,
		SortOrder: 1,
	})
	fallbackSection := seedBOMSection(t, models.BOMSection{
		BaseModel: models.BaseModel{ID: "section-fallback"},
		Code:      "ROLLING",
		Name:      "卷料",
		Active:    true,
		IsDefault: false,
		SortOrder: 2,
	})
	version := optimisticVersionForResponse(defaultSection.UpdatedAt, defaultSection.CreatedAt)

	recorder := performPatchBOMSectionRequest(t, defaultSection.ID, fmt.Sprintf(`{
		"op":"PATCH",
		"delta":{"active":{"o":true,"n":false}},
		"metadata":{"id":"%s","version":%d}
	}`, defaultSection.ID, version))

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var updatedDefault models.BOMSection
	require.NoError(t, db.DB.First(&updatedDefault, "id = ?", defaultSection.ID).Error)
	require.False(t, updatedDefault.Active)
	require.False(t, updatedDefault.IsDefault)

	var updatedFallback models.BOMSection
	require.NoError(t, db.DB.First(&updatedFallback, "id = ?", fallbackSection.ID).Error)
	require.True(t, updatedFallback.Active)
	require.True(t, updatedFallback.IsDefault)
}
