package services

import (
	"context"
	"os"
	"strings"
	"testing"
	"xdfc-server/audit"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func createIsolatedBOMReleaseAndManufacturingDerivationPostgresFixture(t *testing.T) (*gorm.DB, context.Context, models.BOM) {
	t.Helper()
	dsn := strings.TrimSpace(os.Getenv("BOM_LIFECYCLE_TEST_POSTGRES_DSN"))
	if dsn == "" {
		t.Skip("set BOM_LIFECYCLE_TEST_POSTGRES_DSN to test BOM release and derivation in an isolated schema")
	}
	adminDatabase, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	adminConnection, err := adminDatabase.DB()
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, adminConnection.Close()) })
	schemaName := "bom_release_derivation_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	require.NoError(t, adminDatabase.Exec("CREATE SCHEMA "+schemaName).Error)
	t.Cleanup(func() { require.NoError(t, adminDatabase.Exec("DROP SCHEMA "+schemaName+" CASCADE").Error) })
	connectionConfiguration, err := pgx.ParseConfig(dsn)
	require.NoError(t, err)
	connectionConfiguration.RuntimeParams["search_path"] = schemaName
	connectionConfiguration.RuntimeParams["lock_timeout"] = "3000"
	connectionConfiguration.RuntimeParams["statement_timeout"] = "6000"
	connection := stdlib.OpenDB(*connectionConfiguration)
	t.Cleanup(func() { require.NoError(t, connection.Close()) })
	database, err := gorm.Open(postgres.New(postgres.Config{Conn: connection}), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent), DisableForeignKeyConstraintWhenMigrating: true,
	})
	require.NoError(t, err)
	require.NoError(t, database.AutoMigrate(
		&models.BOM{}, &models.BOMItem{}, &models.Material{}, &models.BOMVersionSnapshot{}, &models.AuditLog{},
		&models.BusinessEventSource{}, &models.NotificationRule{}, &models.RuleExecutionLog{},
		&models.SystemNotificationInboxEntry{}, &models.WorkflowNotificationOutboxEntry{},
	))
	previousDatabase := db.DB
	db.DB = database
	t.Cleanup(func() { db.DB = previousDatabase })
	productID := uuid.NewString()
	require.NoError(t, database.Model(&models.Product{}).Create(map[string]any{
		"id": productID, "sku": "BOM-RELEASE-PRODUCT", "name": "BOM release product",
	}).Error)
	material := models.Material{BaseModel: models.BaseModel{ID: uuid.NewString()}, Code: "CARBON", Name: "Carbon", Status: "Active"}
	require.NoError(t, database.Create(&material).Error)
	bom := models.BOM{
		BaseModel: models.BaseModel{ID: uuid.NewString()}, BOMNo: "BOM-RELEASE-SOURCE", BOMType: models.BOMTypeEBOM,
		ProductID: productID, VersionText: "V1.0", Status: models.BOMStatusApproved, IsLocked: true, Version: 4,
		OwnerType: "INTERNAL", MeasuredWeight: 420, MeasuredWeightUnit: "g", Description: "Approved recipe",
		Items: []models.BOMItem{{ID: uuid.NewString(), Section: "PREPARE", MaterialID: material.ID, Unit: "m2", UnitUsage: 2, StandardUsage: 2.1, WastagePercent: 5}},
	}
	require.NoError(t, database.Create(&bom).Error)
	actor := audit.AuditActor{UserID: uuid.NewString(), Username: "bom-lifecycle-reviewer"}
	ctx := audit.NewContextWithActorAndPermissions(context.Background(), actor, []string{"bom:release"})
	return database, ctx, bom
}

func TestBOMLockedApprovedReleasePreservesContentAndAllowsManufacturingDerivation(t *testing.T) {
	for _, bomType := range []string{models.BOMTypeEBOM, models.BOMTypeMBOM} {
		t.Run(bomType, func(t *testing.T) {
			database, ctx, source := createIsolatedBOMReleaseAndManufacturingDerivationPostgresFixture(t)
			require.NoError(t, database.Model(&models.BOM{}).Where("id = ?", source.ID).Update("bom_type", bomType).Error)
			released, err := PromoteBOMStatus(ctx, source.ID, PromoteBOMStatusInput{Status: models.BOMStatusReleased, ExpectedVersion: &source.Version})
			require.NoError(t, err)
			require.Equal(t, models.BOMStatusReleased, released.Status)
			require.True(t, released.IsLocked)
			require.Equal(t, source.Version+1, released.Version)
			require.Equal(t, source.Description, released.Description)
			require.Equal(t, source.MeasuredWeight, released.MeasuredWeight)
			require.Equal(t, source.MeasuredWeightUnit, released.MeasuredWeightUnit)
			require.Equal(t, source.Items, released.Items)
			var snapshot models.BOMVersionSnapshot
			require.NoError(t, database.Where("bom_id = ?", source.ID).First(&snapshot).Error)
			require.Equal(t, models.BOMStatusReleased, snapshot.Status)
			require.Equal(t, "PROMOTE", snapshot.Operation)
			if bomType == models.BOMTypeEBOM {
				derived, err := DeriveMBOMFromEBOM(ctx, source.ID, DeriveMBOMInput{})
				require.NoError(t, err)
				require.Equal(t, models.BOMTypeMBOM, derived.BOMType)
				require.Equal(t, models.BOMStatusDraft, derived.Status)
				require.False(t, derived.IsLocked)
				require.NotNil(t, derived.SourceEBOMID)
				require.Equal(t, source.ID, *derived.SourceEBOMID)
				require.Equal(t, source.MeasuredWeight, derived.MeasuredWeight)
				require.Equal(t, source.MeasuredWeightUnit, derived.MeasuredWeightUnit)
				require.Len(t, derived.Items, 1)
				require.Equal(t, source.Items[0].MaterialID, derived.Items[0].MaterialID)
			}
		})
	}
}

func TestBOMLockedApprovedReleaseRetainsPermissionVersionAndIntegrityChecks(t *testing.T) {
	for _, scenario := range []string{"missing_permission", "stale_version", "missing_weight", "invalid_transition"} {
		t.Run(scenario, func(t *testing.T) {
			database, ctx, source := createIsolatedBOMReleaseAndManufacturingDerivationPostgresFixture(t)
			input := PromoteBOMStatusInput{Status: models.BOMStatusReleased, ExpectedVersion: &source.Version}
			var expectedError string
			switch scenario {
			case "missing_permission":
				actor, _ := audit.ActorFromContext(ctx)
				ctx = audit.NewContextWithActorAndPermissions(context.Background(), actor, []string{"bom:edit"})
				expectedError = "FORBIDDEN"
			case "stale_version":
				staleVersion := source.Version - 1
				input.ExpectedVersion = &staleVersion
				expectedError = "CONFLICT"
			case "missing_weight":
				require.NoError(t, database.Model(&models.BOM{}).Where("id = ?", source.ID).Update("measured_weight", 0).Error)
				expectedError = "positive measuredWeight"
			case "invalid_transition":
				input.Status = models.BOMStatusDraft
				expectedError = "cannot transition"
			}
			_, err := PromoteBOMStatus(ctx, source.ID, input)
			require.ErrorContains(t, err, expectedError)
			var persisted models.BOM
			require.NoError(t, database.First(&persisted, "id = ?", source.ID).Error)
			require.Equal(t, models.BOMStatusApproved, persisted.Status)
			require.True(t, persisted.IsLocked)
			require.Equal(t, source.Version, persisted.Version)
			var snapshotCount int64
			require.NoError(t, database.Model(&models.BOMVersionSnapshot{}).Count(&snapshotCount).Error)
			require.Zero(t, snapshotCount)
		})
	}
}

func TestBOMManufacturingDerivationRejectsUnreleasedUnlockedAndNonEngineeringSources(t *testing.T) {
	for _, scenario := range []string{"approved_locked", "released_unlocked", "manufacturing_released"} {
		t.Run(scenario, func(t *testing.T) {
			database, ctx, source := createIsolatedBOMReleaseAndManufacturingDerivationPostgresFixture(t)
			changes := map[string]any{}
			expectedError := "Only RELEASED EBOMs"
			switch scenario {
			case "released_unlocked":
				changes = map[string]any{"status": models.BOMStatusReleased, "is_locked": false}
				expectedError = "must be locked"
			case "manufacturing_released":
				changes = map[string]any{"status": models.BOMStatusReleased, "bom_type": models.BOMTypeMBOM}
				expectedError = "source BOM must be EBOM"
			}
			if len(changes) > 0 {
				require.NoError(t, database.Model(&models.BOM{}).Where("id = ?", source.ID).Updates(changes).Error)
			}
			_, err := DeriveMBOMFromEBOM(ctx, source.ID, DeriveMBOMInput{})
			require.ErrorContains(t, err, expectedError)
			var bomCount int64
			require.NoError(t, database.Model(&models.BOM{}).Count(&bomCount).Error)
			require.Equal(t, int64(1), bomCount)
		})
	}
}

func TestBOMVersionSnapshotsSerializeConcurrentSequenceAllocation(t *testing.T) {
	database, ctx, source := createIsolatedBOMReleaseAndManufacturingDerivationPostgresFixture(t)
	startWriters := make(chan struct{})
	writerResults := make(chan error, 2)
	for range 2 {
		go func() {
			<-startWriters
			writerResults <- database.Transaction(func(transaction *gorm.DB) error {
				return writeBOMVersionSnapshotTx(ctx, transaction, source, "SAVE")
			})
		}()
	}
	close(startWriters)
	for range 2 {
		require.NoError(t, <-writerResults)
	}
	var snapshots []models.BOMVersionSnapshot
	require.NoError(t, database.Where("bom_id = ?", source.ID).Order("version_sequence").Find(&snapshots).Error)
	require.Len(t, snapshots, 2)
	require.Equal(t, 1, snapshots[0].VersionSequence)
	require.Equal(t, 2, snapshots[1].VersionSequence)
}
