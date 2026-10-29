package services

import (
	"context"
	"testing"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
)

func TestProductionMaterialIssuancePostgresSourceOptionsScopedPreparationAndMissingMasterDataPrerequisites(t *testing.T) {
	database, bases, _ := openIsolatedProductionMaterialIssuancePostgresConcurrencyTestDatabase(t)
	ctx := context.Background()
	options, err := QueryProductionMaterialIssuanceSourceOptions(ctx, database, ProductionMaterialIssuanceSourceOptionsQuery{Search: "SO-CONCURRENT", Page: 1, PageSize: 20})
	require.NoError(t, err)
	require.EqualValues(t, 1, options.Total)
	require.Len(t, options.Items, 1)
	require.Equal(t, bases[0].SalesOrderID, options.Items[0].SalesOrderID)
	selections := []ProductionMaterialIssuanceSourcePreparationSelection{{SalesOrderID: bases[0].SalesOrderID, SalesOrderLineID: bases[0].SalesOrderLineID}}
	formalSelections := []ProductionMaterialIssuanceSourceSelection{{SalesOrderID: bases[0].SalesOrderID, SalesOrderLineID: bases[0].SalesOrderLineID, BOMID: bases[0].BOM.ID}}
	prepared, err := PrepareProductionMaterialIssuanceSources(ctx, database, selections)
	require.NoError(t, err)
	require.True(t, prepared.IsReady)
	require.Len(t, prepared.SourceLines, 1)
	require.Len(t, prepared.SourceLines[0].Contributions, len(bases[0].Contributions))
	for index, contribution := range prepared.SourceLines[0].Contributions {
		require.Equal(t, bases[0].Contributions[index].ProductionMaterialRequirementContribution, contribution)
	}
	for _, model := range []any{&models.ProductionMaterialIssuanceDocument{}, &models.ProductionMaterialIssuanceCommandReceipt{}, &models.AuditLog{}} {
		var count int64
		require.NoError(t, database.Model(model).Count(&count).Error)
		require.Zero(t, count)
	}

	// Nullable UUID master-data references must produce actionable issues,
	// rather than a PostgreSQL empty-UUID error or a ready zero requirement.
	require.NoError(t, database.Exec("UPDATE bom_items SET material_id = NULL").Error)
	prepared, err = PrepareProductionMaterialIssuanceSources(ctx, database, selections)
	require.NoError(t, err)
	require.False(t, prepared.IsReady)
	require.Contains(t, prepared.Issues, ProductionMaterialIssuanceSourcePrerequisiteIssue{SalesOrderLineID: bases[0].SalesOrderLineID, Code: "INVALID_MATERIAL"})
	_, err = ReviewProductionMaterialIssuanceSources(ctx, database, formalSelections)
	require.ErrorIs(t, err, ErrProductionMaterialIssuanceBasisChanged)

	require.NoError(t, database.Exec("UPDATE sales_order_lines SET product_id = NULL").Error)
	prepared, err = PrepareProductionMaterialIssuanceSources(ctx, database, selections)
	require.NoError(t, err)
	require.False(t, prepared.IsReady)
	require.Contains(t, prepared.Issues, ProductionMaterialIssuanceSourcePrerequisiteIssue{SalesOrderLineID: bases[0].SalesOrderLineID, Code: "MISSING_PRODUCT"})
	require.Contains(t, prepared.Issues, ProductionMaterialIssuanceSourcePrerequisiteIssue{SalesOrderLineID: bases[0].SalesOrderLineID, Code: "INVALID_SOURCE_LINE"})
	_, err = ReviewProductionMaterialIssuanceSources(ctx, database, formalSelections)
	require.ErrorIs(t, err, ErrProductionMaterialIssuanceBasisChanged)
}
