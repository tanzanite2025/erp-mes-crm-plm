package services

import (
	"encoding/json"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"testing"
	"xdfc-server/audit"
	"xdfc-server/models"
)

func buildBOMAtomicSaveAndPublishInputForPostgresVerification(source models.BOM, updating bool) SaveBOMInput {
	input := SaveBOMInput{
		ProductID: source.ProductID, BOMNo: "ATOMIC-" + uuid.NewString(), BOMType: source.BOMType,
		VersionText: source.VersionText, MeasuredWeight: 390, MeasuredWeightUnit: "g",
		OwnerType: source.OwnerType, Description: "Recipe verified for direct publication", PublishOnSave: true,
		RelationSidecar: json.RawMessage(`{"kind":"parent_children_protocol","version":"v1","protocolDraft":{"rootChildren":[],"branchNodes":[],"itemNodes":[]}}`),
		Items:           []models.BOMItem{{ID: uuid.NewString(), Section: "PREPARE", MaterialID: source.Items[0].MaterialID, Unit: "m2", UnitUsage: 3, StandardUsage: 3.15, WastagePercent: 5}},
	}
	if updating {
		input.ID = source.ID
		input.BOMNo = source.BOMNo
		input.Version = source.Version
	}
	return input
}

func TestBOMThreeStateDirectReleaseSupportsDraftAndHistoricalPendingRecords(t *testing.T) {
	for _, bomType := range []string{models.BOMTypeEBOM, models.BOMTypeMBOM} {
		for _, status := range []string{models.BOMStatusDraft, models.BOMStatusReviewing, models.BOMStatusApproved} {
			t.Run(bomType+"/"+status, func(t *testing.T) {
				database, ctx, source := createIsolatedBOMReleaseAndManufacturingDerivationPostgresFixture(t)
				require.NoError(t, database.Model(&models.BOM{}).Where("id = ?", source.ID).Updates(map[string]any{"bom_type": bomType, "status": status, "is_locked": status == models.BOMStatusApproved}).Error)
				released, err := PromoteBOMStatus(ctx, source.ID, PromoteBOMStatusInput{Status: models.BOMStatusReleased, ExpectedVersion: &source.Version})
				require.NoError(t, err)
				require.Equal(t, models.BOMStatusReleased, released.Status)
				require.True(t, released.IsLocked)
				require.Equal(t, source.MeasuredWeight, released.MeasuredWeight)
				obsoleteContext := audit.NewContextWithActorAndPermissions(ctx, *audit.GetActorFromContext(ctx), []string{"bom:obsolete"})
				obsolete, err := PromoteBOMStatus(obsoleteContext, source.ID, PromoteBOMStatusInput{Status: models.BOMStatusObsolete, ExpectedVersion: &released.Version})
				require.NoError(t, err)
				require.Equal(t, models.BOMStatusObsolete, obsolete.Status)
				require.True(t, obsolete.IsLocked)
				_, err = PromoteBOMStatus(obsoleteContext, source.ID, PromoteBOMStatusInput{Status: models.BOMStatusDraft, ExpectedVersion: &obsolete.Version})
				require.Error(t, err)
			})
		}
	}
}

func TestBOMAtomicSaveAndPublishPersistsVerifiedRecipeAndReleaseTogether(t *testing.T) {
	for _, updating := range []bool{false, true} {
		t.Run(map[bool]string{false: "new", true: "existing_draft"}[updating], func(t *testing.T) {
			database, ctx, source := createIsolatedBOMReleaseAndManufacturingDerivationPostgresFixture(t)
			require.NoError(t, database.AutoMigrate(&models.BOMSection{}))
			require.NoError(t, database.Create(&models.BOMSection{Code: "PREPARE", Name: "Preparation", Active: true, IsDefault: true}).Error)
			require.NoError(t, database.Model(&models.BOM{}).Where("id = ?", source.ID).Updates(map[string]any{"status": models.BOMStatusDraft, "is_locked": false}).Error)
			input := buildBOMAtomicSaveAndPublishInputForPostgresVerification(source, updating)
			released, err := SaveBOM(ctx, input)
			require.NoError(t, err)
			require.Equal(t, models.BOMStatusReleased, released.Status)
			require.True(t, released.IsLocked)
			require.Equal(t, input.Description, released.Description)
			require.Equal(t, input.MeasuredWeight, released.MeasuredWeight)
			require.Len(t, released.Items, 1)
			require.Equal(t, 3.0, released.Items[0].UnitUsage)
			var snapshots []models.BOMVersionSnapshot
			require.NoError(t, database.Where("bom_id = ?", released.ID).Order("version_sequence ASC").Find(&snapshots).Error)
			require.Len(t, snapshots, 2)
			require.Equal(t, models.BOMStatusDraft, snapshots[0].Status)
			require.Equal(t, models.BOMStatusReleased, snapshots[1].Status)
			if updating {
				require.Equal(t, source.Version+2, released.Version)
			} else {
				require.Equal(t, 2, released.Version)
			}
			_, err = SaveBOM(ctx, buildBOMAtomicSaveAndPublishInputForPostgresVerification(models.BOM{BaseModel: models.BaseModel{ID: released.ID}, BOMNo: released.BOMNo, ProductID: source.ProductID, Items: source.Items, Version: released.Version}, true))
			require.ErrorContains(t, err, "locked BOM")
		})
	}
}

func TestBOMAtomicSaveAndPublishFailureRollsBackRecipeStatusSnapshotsAndAudit(t *testing.T) {
	for _, updating := range []bool{false, true} {
		for _, scenario := range []string{"missing_weight", "missing_unit", "empty_recipe", "zero_usage", "missing_permission", "stale_version"} {
			if !updating && scenario == "stale_version" {
				continue
			}
			t.Run(map[bool]string{false: "new", true: "existing_draft"}[updating]+"/"+scenario, func(t *testing.T) {
				database, ctx, source := createIsolatedBOMReleaseAndManufacturingDerivationPostgresFixture(t)
				require.NoError(t, database.AutoMigrate(&models.BOMSection{}))
				require.NoError(t, database.Create(&models.BOMSection{Code: "PREPARE", Name: "Preparation", Active: true, IsDefault: true}).Error)
				require.NoError(t, database.Model(&models.BOM{}).Where("id = ?", source.ID).Updates(map[string]any{"status": models.BOMStatusDraft, "is_locked": false}).Error)
				input := buildBOMAtomicSaveAndPublishInputForPostgresVerification(source, updating)
				switch scenario {
				case "missing_weight":
					input.MeasuredWeight = 0
				case "missing_unit":
					input.MeasuredWeightUnit = ""
				case "empty_recipe":
					input.Items = nil
				case "zero_usage":
					input.Items[0].UnitUsage = 0
					input.Items[0].StandardUsage = 0
				case "missing_permission":
					ctx = audit.NewContextWithActorAndPermissions(ctx, *audit.GetActorFromContext(ctx), []string{"bom:edit"})
				case "stale_version":
					input.Version--
				}
				_, err := SaveBOM(ctx, input)
				require.Error(t, err)
				var persisted models.BOM
				require.NoError(t, database.Preload("Items").First(&persisted, "id = ?", source.ID).Error)
				require.Equal(t, models.BOMStatusDraft, persisted.Status)
				require.False(t, persisted.IsLocked)
				require.Equal(t, source.Version, persisted.Version)
				require.Equal(t, source.Description, persisted.Description)
				require.Equal(t, source.MeasuredWeight, persisted.MeasuredWeight)
				require.Equal(t, source.Items, persisted.Items)
				for _, model := range []any{&models.BOMVersionSnapshot{}, &models.AuditLog{}} {
					var count int64
					require.NoError(t, database.Model(model).Count(&count).Error)
					require.Zero(t, count)
				}
				var count int64
				require.NoError(t, database.Model(&models.BOM{}).Count(&count).Error)
				require.Equal(t, int64(1), count)
			})
		}
	}
}
