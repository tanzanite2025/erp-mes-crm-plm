package services

import (
	"errors"
	"fmt"
	"testing"
	"time"
	appdb "xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func openVehicleLoadingResolverTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	dsn := fmt.Sprintf(
		"file:vehicle_loading_resolver_%d?mode=memory&cache=shared",
		time.Now().UnixNano(),
	)
	testDB, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("open vehicle loading resolver test db: %v", err)
	}
	if err := testDB.Exec(`CREATE TABLE packaging_profiles (
		id TEXT PRIMARY KEY,
		created_at DATETIME,
		updated_at DATETIME,
		deleted_at DATETIME,
		code TEXT NOT NULL,
		name TEXT NOT NULL,
		packaging_type TEXT NOT NULL DEFAULT '',
		length REAL NOT NULL DEFAULT 0,
		width REAL NOT NULL DEFAULT 0,
		height REAL NOT NULL DEFAULT 0,
		dimension_unit_code TEXT,
		net_weight REAL NOT NULL DEFAULT 0,
		gross_weight REAL NOT NULL DEFAULT 0,
		weight_unit_code TEXT,
		capacity REAL NOT NULL DEFAULT 0,
		capacity_unit_code TEXT,
		can_rotate NUMERIC NOT NULL DEFAULT 1,
		can_invert NUMERIC NOT NULL DEFAULT 0,
		assembly_source TEXT,
		is_active NUMERIC NOT NULL DEFAULT 1,
		notes TEXT
	)`).Error; err != nil {
		t.Fatalf("create packaging profile test schema: %v", err)
	}

	sqlDB, err := testDB.DB()
	if err != nil {
		t.Fatalf("open sqlite connection: %v", err)
	}
	t.Cleanup(func() {
		if err := sqlDB.Close(); err != nil {
			t.Errorf("close sqlite: %v", err)
		}
	})

	previousDB := appdb.DB
	appdb.DB = testDB
	t.Cleanup(func() { appdb.DB = previousDB })

	return testDB
}

func seedVehicleLoadingResolverPackagingProfile(t *testing.T, testDB *gorm.DB) {
	t.Helper()

	profile := models.PackagingProfile{
		BaseModel:         models.BaseModel{ID: "profile-standard-box"},
		Code:              "STANDARD-BOX",
		Name:              "标准箱",
		Length:            10,
		Width:             10,
		Height:            10,
		DimensionUnitCode: "cm",
		GrossWeight:       2,
		WeightUnitCode:    "kg",
		CanRotate:         true,
		CanInvert:         true,
		IsActive:          true,
	}
	if err := testDB.Create(&profile).Error; err != nil {
		t.Fatalf("seed packaging profile: %v", err)
	}
}

func TestBuildVehicleLoadingRecommendationsReadsPackagingMasterData(t *testing.T) {
	testDB := openVehicleLoadingResolverTestDB(t)
	seedVehicleLoadingResolverPackagingProfile(t, testDB)

	response, err := BuildVehicleLoadingRecommendations(
		VehicleLoadingRecommendationsRequest{
			Boxes:              10,
			PackagingProfileID: "profile-standard-box",
			VehicleSpecIDs:     []string{"van-standard"},
		},
	)
	if err != nil {
		t.Fatalf("build recommendations: %v", err)
	}
	if len(response.Recommendations) != 1 {
		t.Fatalf("expected one recommendation, got %d", len(response.Recommendations))
	}

	recommendation := response.Recommendations[0]
	if recommendation.PackageDimension.LengthMm != 100 ||
		recommendation.PackageDimension.WidthMm != 100 ||
		recommendation.PackageDimension.HeightMm != 100 {
		t.Fatalf("expected dimensions resolved from cm master data, got %#v", recommendation.PackageDimension)
	}
	if recommendation.Vehicle.ID != "van-standard" {
		t.Fatalf("expected selected vehicle to be used, got %q", recommendation.Vehicle.ID)
	}
	if recommendation.MaxBoxesPerVehicle != 10 || recommendation.VehiclesNeeded != 1 {
		t.Fatalf(
			"expected one vehicle for ten boxes, got max=%d needed=%d",
			recommendation.MaxBoxesPerVehicle,
			recommendation.VehiclesNeeded,
		)
	}
}

func TestBuildVehicleLoadingRecommendationsRejectsUnknownMasterData(t *testing.T) {
	testDB := openVehicleLoadingResolverTestDB(t)
	seedVehicleLoadingResolverPackagingProfile(t, testDB)

	_, err := BuildVehicleLoadingRecommendations(
		VehicleLoadingRecommendationsRequest{
			Boxes:              1,
			PackagingProfileID: "missing-profile",
			VehicleSpecIDs:     []string{"van-standard"},
		},
	)
	if !errors.Is(err, ErrVehicleLoadingPackageProfileNotFound) {
		t.Fatalf("expected unknown packaging profile error, got %v", err)
	}

	_, err = BuildVehicleLoadingRecommendations(
		VehicleLoadingRecommendationsRequest{
			Boxes:              1,
			PackagingProfileID: "profile-standard-box",
			VehicleSpecIDs:     []string{"missing-vehicle"},
		},
	)
	if !errors.Is(err, ErrVehicleLoadingVehicleSpecNotFound) {
		t.Fatalf("expected unknown vehicle error, got %v", err)
	}
}

func TestBuildVehicleLoadingRecommendationsDoesNotRequireVehiclePhotoData(t *testing.T) {
	testDB := openVehicleLoadingResolverTestDB(t)
	seedVehicleLoadingResolverPackagingProfile(t, testDB)

	// The test database intentionally has no logistics_vehicle_photos table.
	// A packing recommendation must still work because photo data is a
	// presentation concern, not calculation input.
	_, err := BuildVehicleLoadingRecommendations(
		VehicleLoadingRecommendationsRequest{
			Boxes:              1,
			PackagingProfileID: "profile-standard-box",
			VehicleSpecIDs:     []string{"van-standard"},
		},
	)
	if err != nil {
		t.Fatalf("recommendation unexpectedly depends on vehicle photo data: %v", err)
	}
}
