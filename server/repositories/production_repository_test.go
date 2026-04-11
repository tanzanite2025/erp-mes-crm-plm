package repositories

import (
	"testing"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupProductionRepositoryTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	return setupRepositoryTestDB(t,
		`CREATE TABLE production_lines (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			code TEXT,
			name TEXT,
			description TEXT,
			version INTEGER,
			is_active BOOLEAN
		)`,
		`CREATE TABLE line_segments (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			line_id TEXT NOT NULL,
			name TEXT,
			description TEXT,
			sort_order INTEGER,
			attributes BLOB
		)`,
		`CREATE TABLE job_categories (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			segment_id TEXT NOT NULL,
			name TEXT,
			description TEXT,
			sort_order INTEGER,
			attributes BLOB
		)`,
		`CREATE TABLE process_steps (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			code TEXT,
			name TEXT,
			description TEXT,
			sort_order INTEGER,
			is_active BOOLEAN
		)`,
		`CREATE TABLE job_category_process_mappings (
			job_category_id TEXT NOT NULL,
			process_step_id TEXT NOT NULL
		)`,
	)
}

func TestGormProductionRepositoryBumpProductionLineVersion(t *testing.T) {
	repo := NewProductionRepository()
	testDB := setupProductionRepositoryTestDB(t)

	line := models.ProductionLine{
		BaseModel: models.BaseModel{ID: "line-1"},
		Code:      "L-01",
		Name:      "Line 01",
		Version:   2,
	}
	require.NoError(t, testDB.Create(&line).Error)

	updated, err := repo.BumpProductionLineVersion(testDB, line.ID, 2)
	require.NoError(t, err)
	require.True(t, updated)

	var stored models.ProductionLine
	require.NoError(t, testDB.First(&stored, "id = ?", line.ID).Error)
	require.Equal(t, int64(3), stored.Version)
}

func TestGormProductionRepositoryAppendProcessToJobCategoryLoadsProcesses(t *testing.T) {
	repo := NewProductionRepository()
	testDB := setupProductionRepositoryTestDB(t)

	job := models.JobCategory{
		BaseModel: models.BaseModel{ID: "job-1"},
		SegmentID: "segment-1",
		Name:      "Category 1",
	}
	process := models.ProcessStep{
		BaseModel: models.BaseModel{ID: "step-1"},
		Code:      "P-01",
		Name:      "Polish",
	}
	require.NoError(t, testDB.Create(&job).Error)
	require.NoError(t, testDB.Create(&process).Error)

	require.NoError(t, repo.AppendProcessToJobCategory(testDB, job.ID, process.ID))

	line := models.ProductionLine{
		BaseModel: models.BaseModel{ID: "line-1"},
		Code:      "L-01",
		Name:      "Line 1",
		Segments: []models.LineSegment{
			{
				BaseModel: models.BaseModel{ID: "segment-1"},
				LineID:    "line-1",
				Name:      "Segment 1",
				JobCategories: []models.JobCategory{
					job,
				},
			},
		},
	}
	require.NoError(t, testDB.Create(&line).Error)
	require.NoError(t, testDB.Create(&line.Segments[0]).Error)

	lines, err := repo.ListProductionLines(testDB)
	require.NoError(t, err)
	require.Len(t, lines, 1)
	require.Len(t, lines[0].Segments[0].JobCategories[0].Processes, 1)
	require.Equal(t, process.ID, lines[0].Segments[0].JobCategories[0].Processes[0].ID)
}

func TestGormProductionRepositorySaveProductionLinePersistsNestedTopology(t *testing.T) {
	repo := NewProductionRepository()
	testDB := setupProductionRepositoryTestDB(t)

	process := models.ProcessStep{
		BaseModel: models.BaseModel{ID: "step-9"},
		Code:      "P-09",
		Name:      "Process 9",
	}
	require.NoError(t, testDB.Create(&process).Error)

	line := models.ProductionLine{
		BaseModel: models.BaseModel{ID: "line-2"},
		Code:      "L-02",
		Name:      "Line 02",
		Segments: []models.LineSegment{
			{
				BaseModel: models.BaseModel{ID: "segment-2"},
				Name:      "Segment 1",
				JobCategories: []models.JobCategory{
					{
						BaseModel: models.BaseModel{ID: "job-2"},
						Name:      "Job Category 1",
						Processes: []models.ProcessStep{process},
					},
				},
			},
		},
	}

	require.NoError(t, repo.SaveProductionLine(testDB, &line))

	lines, err := repo.ListProductionLines(testDB)
	require.NoError(t, err)
	require.Len(t, lines, 1)
	require.Len(t, lines[0].Segments, 1)
	require.Len(t, lines[0].Segments[0].JobCategories, 1)
	require.Len(t, lines[0].Segments[0].JobCategories[0].Processes, 1)
	require.Equal(t, process.ID, lines[0].Segments[0].JobCategories[0].Processes[0].ID)
}
