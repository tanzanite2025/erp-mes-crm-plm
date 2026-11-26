package services

import (
	"testing"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
)

func TestBOMProductionLineAssignmentRequiresActiveSelectionAndPreservesExistingInactiveLine(t *testing.T) {
	service, database := newProductionServiceTestHarness(t)
	activeLineID := "active-bom-line"
	inactiveLineID := "inactive-bom-line"
	require.NoError(t, database.Exec("INSERT INTO production_lines (id, code, name, is_active) VALUES (?, ?, ?, ?)", activeLineID, "ACTIVE", "Active line", true).Error)
	require.NoError(t, database.Exec("INSERT INTO production_lines (id, code, name, is_active) VALUES (?, ?, ?, ?)", inactiveLineID, "INACTIVE", "Inactive line", false).Error)
	options, err := service.ListActiveBOMProductionLineOptions()
	require.NoError(t, err)
	require.Equal(t, []BOMProductionLineOptionDTO{{ID: activeLineID, Code: "ACTIVE", Name: "Active line"}}, options)

	newEBOM := models.BOM{BOMType: models.BOMTypeEBOM}
	require.ErrorIs(t, validateAndNormalizeBOMProductionLineAssignment(database, &newEBOM, nil), ErrBOMProductionLineRequired)
	invalidID := "missing-line"
	newEBOM.ProductionLineID = &invalidID
	require.ErrorIs(t, validateAndNormalizeBOMProductionLineAssignment(database, &newEBOM, nil), ErrInvalidBOMProductionLine)
	inactiveID := inactiveLineID
	newEBOM.ProductionLineID = &inactiveID
	require.ErrorIs(t, validateAndNormalizeBOMProductionLineAssignment(database, &newEBOM, nil), ErrInvalidBOMProductionLine)
	activeID := activeLineID
	newEBOM.ProductionLineID = &activeID
	require.NoError(t, validateAndNormalizeBOMProductionLineAssignment(database, &newEBOM, nil))
	require.Equal(t, activeLineID, *newEBOM.ProductionLineID)

	existingEBOM := models.BOM{BOMType: models.BOMTypeEBOM, ProductionLineID: &inactiveID}
	unchangedDraft := models.BOM{BOMType: models.BOMTypeEBOM, ProductionLineID: &inactiveID}
	require.NoError(t, validateAndNormalizeBOMProductionLineAssignment(database, &unchangedDraft, &existingEBOM))
	mbomWithForgedLine := models.BOM{BOMType: models.BOMTypeMBOM, ProductionLineID: &activeID}
	require.NoError(t, validateAndNormalizeBOMProductionLineAssignment(database, &mbomWithForgedLine, nil))
	require.Nil(t, mbomWithForgedLine.ProductionLineID)
}

func TestMBOMProductionLineDisplayAlwaysUsesItsSourceEBOM(t *testing.T) {
	_, database := newProductionServiceTestHarness(t)
	require.NoError(t, database.Exec("ALTER TABLE boms ADD COLUMN production_line_id TEXT").Error)
	lineID := "source-line"
	sourceEBOMID := "source-ebom"
	forgedLineID := "forged-line"
	require.NoError(t, database.Exec("INSERT INTO production_lines (id, code, name, is_active) VALUES (?, ?, ?, ?)", lineID, "SOURCE", "Source line", true).Error)
	require.NoError(t, database.Exec("INSERT INTO production_lines (id, code, name, is_active) VALUES (?, ?, ?, ?)", forgedLineID, "FORGED", "Forged line", true).Error)
	require.NoError(t, database.Exec("INSERT INTO boms (id, product_id, bom_type, status, owner_type, production_line_id) VALUES (?, ?, ?, ?, ?, ?)", sourceEBOMID, "product-a", models.BOMTypeEBOM, models.BOMStatusReleased, "INTERNAL", lineID).Error)

	mbom := models.BOM{
		BOMType: models.BOMTypeMBOM, SourceEBOMID: &sourceEBOMID, ProductionLineID: &forgedLineID,
	}
	require.NoError(t, populateBOMProductionLineDisplay(database, &mbom))
	response, err := MapBOMToDetailResponse(mbom)
	require.NoError(t, err)
	require.Equal(t, lineID, *response.ProductionLineID)
	require.Equal(t, "Source line", response.ProductionLineName)
	mbom.SourceEBOMID = nil
	require.NoError(t, populateBOMProductionLineDisplay(database, &mbom))
	response, err = MapBOMToDetailResponse(mbom)
	require.NoError(t, err)
	require.Nil(t, response.ProductionLineID)
	require.Empty(t, response.ProductionLineName)
}

func TestProductionLineDeleteRejectsEBOMReference(t *testing.T) {
	service, database := newProductionServiceTestHarness(t)
	require.NoError(t, database.Exec("ALTER TABLE boms ADD COLUMN production_line_id TEXT").Error)
	lineID := "referenced-production-line"
	require.NoError(t, database.Exec("INSERT INTO production_lines (id, code, name, is_active) VALUES (?, ?, ?, ?)", lineID, "REFERENCED", "Referenced line", true).Error)
	require.NoError(t, database.Exec("INSERT INTO boms (id, product_id, bom_type, status, owner_type, production_line_id) VALUES (?, ?, ?, ?, ?, ?)", "referencing-ebom", "product-a", models.BOMTypeEBOM, models.BOMStatusReleased, "INTERNAL", lineID).Error)

	err := service.DeleteProductionLine(lineID, "test", "")
	require.ErrorIs(t, err, ErrProductionLineReferencedByBOM)
	var lineCount int64
	require.NoError(t, database.Table("production_lines").Where("id = ? AND deleted_at IS NULL", lineID).Count(&lineCount).Error)
	require.EqualValues(t, 1, lineCount)
}
