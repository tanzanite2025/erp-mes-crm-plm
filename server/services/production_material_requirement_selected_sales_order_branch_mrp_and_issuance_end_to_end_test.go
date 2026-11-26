package services

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"xdfc-server/models"
)

func TestProductionMaterialRequirementEndToEndUsesSavedOrderLineBranchThroughMaterialIssuanceDispatch(t *testing.T) {
	database, _ := openProductionMaterialIssuanceDocumentTransactionTestDatabase(t)
	statements := []string{
		`INSERT INTO customers VALUES ('customer-1','客户',NULL)`,
		`INSERT INTO boms VALUES ('customer-bom-revision-a','product-1','MBOM','MBOM-CUSTOMER-A','RELEASED','CUSTOMER','customer-1',3,'V1','standard','A',460,'g',NULL,NULL,NULL)`,
		`INSERT INTO boms VALUES ('customer-bom-revision-b','product-1','MBOM','MBOM-CUSTOMER-B','RELEASED','CUSTOMER','customer-1',4,'V2','standard','B',440,'g',NULL,NULL,NULL)`,
		`INSERT INTO bom_items VALUES ('customer-item-a','customer-bom-revision-a',1,'A','material-1','m2',0.25)`,
		`INSERT INTO bom_items VALUES ('customer-item-b','customer-bom-revision-b',1,'A','material-1','m2',0.35)`,
		`CREATE TABLE inventory (id TEXT PRIMARY KEY, material_id TEXT, category_code TEXT, batch_no TEXT, quantity REAL, uom TEXT, deleted_at DATETIME)`,
		`CREATE TABLE inventory_reservations (id TEXT PRIMARY KEY, material_id TEXT, category_code TEXT, batch_no TEXT, quantity REAL, status TEXT, deleted_at DATETIME)`,
		`CREATE TABLE packaging_rules (id TEXT PRIMARY KEY, material_id TEXT, pack_unit TEXT, base_unit TEXT, conversion_factor REAL, direction TEXT)`,
		`INSERT INTO inventory VALUES ('stock-1','material-1','MATERIAL','A',100,'m2',NULL)`,
	}
	for _, statement := range statements {
		require.NoError(t, database.Exec(statement).Error)
	}

	var orderLines []models.SalesOrderLine
	require.NoError(t, database.Where("sales_order_id = ?", "order-1").Order("line_no ASC").Find(&orderLines).Error)
	lineRequests := convertSalesOrderLinesToStableIdentityTransactionTestRequests(t, orderLines)
	for index := range lineRequests {
		if lineRequests[index].ID != 101 {
			continue
		}
		lineRequests[index].BOMOwnerType = "CUSTOMER"
		lineRequests[index].BOMOwnerCustomerID = "customer-1"
		lineRequests[index].BOMVersionLevel = "standard"
	}
	savedOrder, err := executeSalesOrderStableIdentityTestCommand(t, database, SalesTransactionIntentOrderLinesChange, 4, SalesOrderLinesChangePayload{Lines: lineRequests})
	require.NoError(t, err)
	require.Equal(t, 5, savedOrder.Version)
	var savedLine models.SalesOrderLine
	require.NoError(t, database.First(&savedLine, "id = ?", 101).Error)
	require.Equal(t, "CUSTOMER", savedLine.BOMOwnerType)
	require.Equal(t, "customer-1", savedLine.BOMOwnerCustomerID)
	require.Equal(t, "standard", savedLine.BOMVersionLevel)

	selectedOrderLineKey := []string{"SO-1-1"}
	asOf := time.Now().UTC()
	ambiguous, err := queryMRPRequirementsFromSharedProductionMaterialBasis(database, GetMrpRequirementsParams{SelectedKeys: selectedOrderLineKey}, asOf)
	require.NoError(t, err)
	require.False(t, ambiguous.IsComplete)
	require.Equal(t, "DUPLICATE_EFFECTIVE_MBOM", ambiguous.SourceLines[0].IssueCode)
	require.Equal(t, []string{"customer-bom-revision-a", "customer-bom-revision-b"}, []string{
		ambiguous.SourceLines[0].BOMCandidates[0].ID,
		ambiguous.SourceLines[0].BOMCandidates[1].ID,
	})
	require.Empty(t, ambiguous.Requirements)
	duplicatePreparation, err := PrepareProductionMaterialIssuanceSources(context.Background(), database, []ProductionMaterialIssuanceSourcePreparationSelection{{SalesOrderID: "order-1", SalesOrderLineID: 101}})
	require.NoError(t, err)
	require.False(t, duplicatePreparation.IsReady)
	require.Contains(t, duplicatePreparation.Issues, ProductionMaterialIssuanceSourcePrerequisiteIssue{SalesOrderLineID: 101, Code: "DUPLICATE_EFFECTIVE_MBOM"})

	require.NoError(t, database.Exec("ALTER TABLE boms ADD COLUMN updated_at DATETIME").Error)
	require.NoError(t, database.Model(&models.BOM{}).Where("id = ?", "customer-bom-revision-a").Update("status", models.BOMStatusObsolete).Error)
	confirmedMRP, err := queryMRPRequirementsFromSharedProductionMaterialBasis(database, GetMrpRequirementsParams{SelectedKeys: selectedOrderLineKey}, asOf)
	require.NoError(t, err)
	require.True(t, confirmedMRP.IsComplete)
	require.Equal(t, "customer-bom-revision-b", confirmedMRP.SourceLines[0].BOM.ID)
	require.InDelta(t, 3.5, confirmedMRP.SourceLines[0].Contributions[0].RequiredQty, 1e-9)

	issuanceSelection := ProductionMaterialIssuanceSourcePreparationSelection{SalesOrderID: "order-1", SalesOrderLineID: 101}
	prepared, err := PrepareProductionMaterialIssuanceSources(context.Background(), database, []ProductionMaterialIssuanceSourcePreparationSelection{issuanceSelection})
	require.NoError(t, err)
	require.True(t, prepared.IsReady)
	require.Equal(t, "customer-bom-revision-b", prepared.SourceLines[0].BOM.ID)

	_, err = ReviewProductionMaterialIssuanceSources(context.Background(), database, []ProductionMaterialIssuanceSourceSelection{{SalesOrderID: "order-1", SalesOrderLineID: 101, ExpectedBOMID: "customer-bom-revision-a"}})
	require.ErrorIs(t, err, ErrProductionMaterialIssuanceBasisChanged)

	reviewed, err := ReviewProductionMaterialIssuanceSources(context.Background(), database, []ProductionMaterialIssuanceSourceSelection{{SalesOrderID: "order-1", SalesOrderLineID: 101, ExpectedBOMID: "customer-bom-revision-b"}})
	require.NoError(t, err)
	require.Len(t, reviewed, 1)
	require.Equal(t, "customer-bom-revision-b", reviewed[0].BOM.ID)

	dispatched, err := DispatchProductionMaterialIssuanceDocument(context.Background(), database, ProductionMaterialIssuanceCommandActor{UserID: "branch-e2e-user"}, buildProductionMaterialIssuanceDispatchTestRequest("branch-e2e-dispatch", reviewed))
	require.NoError(t, err)
	require.Equal(t, "customer-bom-revision-b", dispatched.Sources[0].BOM.ID)
	frozen, err := GetProductionMaterialIssuanceDocument(context.Background(), database, dispatched.Document.ID)
	require.NoError(t, err)
	require.Equal(t, "customer-bom-revision-b", frozen.Sources[0].BOM.ID)
	require.Equal(t, "CUSTOMER", frozen.Sources[0].BOM.OwnerType)
	require.Equal(t, "customer-1", frozen.Sources[0].BOM.OwnerCustomerID)
}
