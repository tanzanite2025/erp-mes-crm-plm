package services

import (
	"encoding/json"
	"testing"
	"xdfc-server/audit"
	"xdfc-server/authz"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
)

func TestBOMCanonicalLifecycleStatusCannotBypassReleaseValidation(t *testing.T) {
	database, ctx, source := createIsolatedBOMReleaseAndManufacturingDerivationPostgresFixture(t)
	ctx = audit.NewContextWithActorAndPermissions(ctx, *audit.GetActorFromContext(ctx), []string{authz.ActionEngineeringBOMPromote})
	require.NoError(t, database.Model(&models.BOM{}).Where("id = ?", source.ID).Updates(map[string]any{"status": models.BOMStatusDraft, "is_locked": false, "measured_weight": 0}).Error)
	_, err := PromoteBOMStatus(ctx, source.ID, PromoteBOMStatusInput{Status: " released ", ExpectedVersion: &source.Version})
	require.ErrorContains(t, err, "positive measuredWeight")
	var persisted models.BOM
	require.NoError(t, database.First(&persisted, "id = ?", source.ID).Error)
	require.Equal(t, models.BOMStatusDraft, persisted.Status)
	require.Equal(t, source.Version, persisted.Version)
	require.NoError(t, database.Model(&models.BOM{}).Where("id = ?", source.ID).Update("measured_weight", 420).Error)
	released, err := PromoteBOMStatus(ctx, source.ID, PromoteBOMStatusInput{Status: " released ", ExpectedVersion: &source.Version})
	require.NoError(t, err)
	require.Equal(t, models.BOMStatusReleased, released.Status)
	obsolete, err := PromoteBOMStatus(ctx, source.ID, PromoteBOMStatusInput{Status: " obsolete ", ExpectedVersion: &released.Version})
	require.NoError(t, err)
	require.Equal(t, models.BOMStatusObsolete, obsolete.Status)
}

func TestBOMDerivationAndRevisionRetainNestedRecipeRowReferencesAndLockPublishedContent(t *testing.T) {
	database, ctx, source := createIsolatedBOMReleaseAndManufacturingDerivationPostgresFixture(t)
	parent := "nested-laminate"
	source.RelationSidecar, _ = json.Marshal(BOMRelationSidecar{Kind: "parent_children_protocol", Version: "v1", ProtocolDraft: BOMParentChildrenProtocolDraft{
		RootChildren: []string{parent},
		BranchNodes:  []BOMParentChildrenProtocolBranchDraft{{ID: parent, Children: []string{"original-leaf"}, NodeKind: "branch", BranchRole: "collection", Label: "Nested laminate", SectionCode: "PREPARE"}},
		ItemNodes:    []BOMParentChildrenProtocolItemDraft{{ID: "original-leaf", ParentID: &parent, Children: []string{}, NodeKind: "item", SectionCode: "PREPARE", ItemID: source.Items[0].ID}},
	}})
	require.NoError(t, database.Model(&models.BOM{}).Where("id = ?", source.ID).Updates(map[string]any{"status": models.BOMStatusReleased, "relation_sidecar": source.RelationSidecar}).Error)
	derived, err := DeriveMBOMFromEBOM(ctx, source.ID, DeriveMBOMInput{})
	require.NoError(t, err)
	require.NotNil(t, derived.RelationSidecar)
	require.Equal(t, derived.Items[0].ID, derived.RelationSidecar.ProtocolDraft.ItemNodes[0].ItemID)
	require.NotEqual(t, source.Items[0].ID, derived.Items[0].ID)
	require.Equal(t, parent, *derived.RelationSidecar.ProtocolDraft.ItemNodes[0].ParentID)
	require.Equal(t, []string{"original-leaf"}, derived.RelationSidecar.ProtocolDraft.BranchNodes[0].Children)
	released, err := PromoteBOMStatus(ctx, derived.ID, PromoteBOMStatusInput{Status: models.BOMStatusReleased, ExpectedVersion: &derived.Version})
	require.NoError(t, err)
	revised, err := ReviseMBOM(ctx, released.ID, ReviseMBOMInput{Reason: "Verify replacement publication", ExpectedVersion: &released.Version})
	require.NoError(t, err)
	require.Equal(t, models.BOMStatusReleased, revised.Status)
	require.True(t, revised.IsLocked)
	require.Equal(t, revised.Items[0].ID, revised.RelationSidecar.ProtocolDraft.ItemNodes[0].ItemID)
	require.NotEqual(t, released.Items[0].ID, revised.Items[0].ID)
	require.Equal(t, parent, *revised.RelationSidecar.ProtocolDraft.ItemNodes[0].ParentID)
	var previous models.BOM
	require.NoError(t, database.First(&previous, "id = ?", released.ID).Error)
	require.Equal(t, models.BOMStatusObsolete, previous.Status)
	require.Equal(t, released.Version+1, previous.Version)
}

func TestBOMRevisionRetainsPublicationAuthorizationAndMaterialIntegrity(t *testing.T) {
	for _, scenario := range []string{"missing_publication_permission", "inactive_material", "zero_usage"} {
		t.Run(scenario, func(t *testing.T) {
			database, ctx, source := createIsolatedBOMReleaseAndManufacturingDerivationPostgresFixture(t)
			require.NoError(t, database.Model(&models.BOM{}).Where("id = ?", source.ID).Updates(map[string]any{"bom_type": models.BOMTypeMBOM, "status": models.BOMStatusReleased}).Error)
			expectedError := "[VALIDATION]"
			switch scenario {
			case "missing_publication_permission":
				ctx = audit.NewContextWithActorAndPermissions(ctx, *audit.GetActorFromContext(ctx), []string{authz.ActionEngineeringBOMManage})
				expectedError = "[FORBIDDEN]"
			case "inactive_material":
				require.NoError(t, database.Model(&models.Material{}).Where("id = ?", source.Items[0].MaterialID).Update("status", "Inactive").Error)
			case "zero_usage":
				require.NoError(t, database.Model(&models.BOMItem{}).Where("bom_id = ?", source.ID).Updates(map[string]any{"unit_usage": 0, "standard_usage": 0}).Error)
			}
			_, err := ReviseMBOM(ctx, source.ID, ReviseMBOMInput{Reason: "Must not bypass release validation", ExpectedVersion: &source.Version})
			require.ErrorContains(t, err, expectedError)
			var persisted models.BOM
			require.NoError(t, database.First(&persisted, "id = ?", source.ID).Error)
			require.Equal(t, models.BOMStatusReleased, persisted.Status)
			require.Equal(t, source.Version, persisted.Version)
			var count int64
			require.NoError(t, database.Model(&models.BOM{}).Count(&count).Error)
			require.EqualValues(t, 1, count)
			require.NoError(t, database.Model(&models.BOMVersionSnapshot{}).Count(&count).Error)
			require.Zero(t, count)
		})
	}
}

func TestBOMConcurrentLifecycleWritesDoNotPublishOrReviseTwice(t *testing.T) {
	for _, operation := range []string{"direct_release", "atomic_save_publish", "revision"} {
		t.Run(operation, func(t *testing.T) {
			database, ctx, source := createIsolatedBOMReleaseAndManufacturingDerivationPostgresFixture(t)
			require.NoError(t, database.Exec("CREATE UNIQUE INDEX bom_lifecycle_concurrent_released_scope ON boms (product_id, bom_type, owner_type, owner_customer_id, version_level) WHERE status = 'RELEASED' AND deleted_at IS NULL").Error)
			changes := map[string]any{"status": models.BOMStatusDraft, "is_locked": false}
			if operation == "revision" {
				changes = map[string]any{"status": models.BOMStatusReleased, "bom_type": models.BOMTypeMBOM}
			}
			require.NoError(t, database.Model(&models.BOM{}).Where("id = ?", source.ID).Updates(changes).Error)
			if operation == "atomic_save_publish" {
				require.NoError(t, database.AutoMigrate(&models.BOMSection{}))
				require.NoError(t, database.Create(&models.BOMSection{Code: "PREPARE", Name: "Preparation", Active: true, IsDefault: true}).Error)
			}
			start := make(chan struct{})
			results := make(chan error, 2)
			for range 2 {
				go func() {
					<-start
					var err error
					switch operation {
					case "direct_release":
						_, err = PromoteBOMStatus(ctx, source.ID, PromoteBOMStatusInput{Status: models.BOMStatusReleased, ExpectedVersion: &source.Version})
					case "atomic_save_publish":
						_, err = SaveBOM(ctx, buildBOMAtomicSaveAndPublishInputForPostgresVerification(source, true))
					case "revision":
						_, err = ReviseMBOM(ctx, source.ID, ReviseMBOMInput{Reason: "Concurrent revision", ExpectedVersion: &source.Version})
					}
					results <- err
				}()
			}
			close(start)
			successes := 0
			for range 2 {
				if <-results == nil {
					successes++
				}
			}
			require.Equal(t, 1, successes)
			var count int64
			require.NoError(t, database.Model(&models.BOM{}).Where("status = ?", models.BOMStatusReleased).Count(&count).Error)
			require.EqualValues(t, 1, count)
			var persisted models.BOM
			require.NoError(t, database.First(&persisted, "id = ?", source.ID).Error)
			advance := 1
			if operation == "atomic_save_publish" {
				advance = 2
			}
			require.Equal(t, source.Version+advance, persisted.Version)
			require.NoError(t, database.Model(&models.BOMVersionSnapshot{}).Count(&count).Error)
			if operation == "direct_release" {
				require.EqualValues(t, 1, count)
			} else {
				require.EqualValues(t, 2, count)
			}
		})
	}
}
