package db

import (
	"testing"

	"xdfc-server/models"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestProductionMBOMBranchPostgresLineSegmentMigrationRequiresProductAndPreservesBoundSegmentsOnRestart(t *testing.T) {
	for _, hasProductColumn := range []bool{false, true} {
		scenario := "legacy_schema_without_product"
		if hasProductColumn {
			scenario = "nullable_product_schema"
		}
		t.Run(scenario, func(t *testing.T) {
			database := openIsolatedProductionMBOMBranchMigrationPostgresDatabase(t)
			require.NoError(t, database.Exec(`CREATE TABLE line_segments (
				id uuid PRIMARY KEY DEFAULT gen_random_uuid(), line_id uuid NOT NULL,
				name varchar(255) NOT NULL, deleted_at timestamptz
			)`).Error)
			if hasProductColumn {
				require.NoError(t, database.Exec(`ALTER TABLE line_segments ADD COLUMN product_id uuid`).Error)
			}
			lineID, productID := uuid.NewString(), uuid.NewString()
			require.NoError(t, database.Exec(`INSERT INTO line_segments (line_id, name) VALUES (?, 'unbound development segment')`, lineID).Error)
			expectedIDs := []string{}
			if hasProductColumn {
				boundSegmentID := uuid.NewString()
				require.NoError(t, database.Exec(`INSERT INTO line_segments (id, line_id, name, product_id)
					VALUES (?, ?, 'bound segment', ?)`, boundSegmentID, lineID, productID).Error)
				require.NoError(t, database.Exec(`INSERT INTO line_segments (line_id, name, product_id, deleted_at)
					VALUES (?, 'deleted development segment', ?, CURRENT_TIMESTAMP)`, lineID, productID).Error)
				expectedIDs = append(expectedIDs, boundSegmentID)
			}
			require.NoError(t, PrepareProductionLineSegmentProductBindingSchemaMigration(database))
			require.NoError(t, database.AutoMigrate(&models.LineSegment{}))
			var retainedIDs []string
			require.NoError(t, database.Model(&models.LineSegment{}).Pluck("id", &retainedIDs).Error)
			require.ElementsMatch(t, expectedIDs, retainedIDs)
			var nullable string
			require.NoError(t, database.Raw(`SELECT is_nullable FROM information_schema.columns
				WHERE table_schema = current_schema() AND table_name = 'line_segments' AND column_name = 'product_id'`).Scan(&nullable).Error)
			require.Equal(t, "NO", nullable)

			segment := models.LineSegment{LineID: lineID, Name: "new MBOM branch", ProductID: productID, BOMOwnerType: "INTERNAL"}
			require.NoError(t, database.Create(&segment).Error)
			require.NoError(t, PrepareProductionLineSegmentProductBindingSchemaMigration(database))
			require.NoError(t, database.AutoMigrate(&models.LineSegment{}))
			expectedIDs = append(expectedIDs, segment.ID)
			require.NoError(t, database.Model(&models.LineSegment{}).Pluck("id", &retainedIDs).Error)
			require.ElementsMatch(t, expectedIDs, retainedIDs)
		})
	}
}
