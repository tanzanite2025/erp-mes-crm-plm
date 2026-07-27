package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
	appdb "xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type fakeVehicleModelTemplateGeometryParserRunner struct {
	geometry       json.RawMessage
	receivedPath   string
	returnedError  error
	parseCallCount int
}

func (runner *fakeVehicleModelTemplateGeometryParserRunner) ParseVehicleModelTemplateGLB(
	_ context.Context,
	sourceFilePath string,
) (json.RawMessage, error) {
	runner.parseCallCount++
	runner.receivedPath = sourceFilePath
	if runner.returnedError != nil {
		return nil, runner.returnedError
	}
	return runner.geometry, nil
}

func TestValidateVehicleModelTemplateSourceURL(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		value     string
		wantError error
	}{
		{
			name:  "internal upload path",
			value: "/uploads/vehicle-model-template-123.glb",
		},
		{
			name:      "empty path",
			value:     "",
			wantError: ErrVehicleModelTemplateSourceURLRequired,
		},
		{
			name:      "external absolute URL",
			value:     "https://example.com/vehicle-model.glb",
			wantError: ErrVehicleModelTemplateSourceURLInvalid,
		},
		{
			name:      "path traversal",
			value:     "/uploads/../vehicle-model.glb",
			wantError: ErrVehicleModelTemplateSourceURLInvalid,
		},
		{
			name:      "path traversal that cleans back to uploads",
			value:     "/uploads/../uploads/vehicle-model.glb",
			wantError: ErrVehicleModelTemplateSourceURLInvalid,
		},
		{
			name:      "windows path separator",
			value:     `/uploads/vehicle-models\vehicle-model.glb`,
			wantError: ErrVehicleModelTemplateSourceURLInvalid,
		},
		{
			name:      "query string",
			value:     "/uploads/vehicle-model.glb?download=1",
			wantError: ErrVehicleModelTemplateSourceURLInvalid,
		},
		{
			name:      "missing filename",
			value:     "/uploads/",
			wantError: ErrVehicleModelTemplateSourceURLInvalid,
		},
		{
			name:      "nested upload path is not servable",
			value:     "/uploads/vehicle-models/vehicle-model.glb",
			wantError: ErrVehicleModelTemplateSourceURLInvalid,
		},
	}

	for _, test := range tests {
		test := test
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()

			err := validateVehicleModelTemplateSourceURL(test.value)
			if test.wantError == nil {
				if err != nil {
					t.Fatalf("expected valid upload path, got %v", err)
				}
				return
			}

			if !errors.Is(err, test.wantError) {
				t.Fatalf("expected error %v, got %v", test.wantError, err)
			}
		})
	}
}

func writeVehicleModelTemplateSourceAssetForCleanupTest(
	t *testing.T,
	uploadDir string,
	fileName string,
	modTime time.Time,
) {
	t.Helper()

	fullPath := filepath.Join(uploadDir, fileName)
	if err := os.WriteFile(fullPath, []byte("model"), 0644); err != nil {
		t.Fatalf("write test source asset: %v", err)
	}
	if err := os.Chtimes(fullPath, modTime, modTime); err != nil {
		t.Fatalf("set test source asset time: %v", err)
	}
}

func assertVehicleModelTemplateSourceAssetExists(
	t *testing.T,
	uploadDir string,
	fileName string,
	shouldExist bool,
) {
	t.Helper()

	_, err := os.Stat(filepath.Join(uploadDir, fileName))
	if shouldExist && err != nil {
		t.Fatalf("expected source asset %s to exist, got %v", fileName, err)
	}
	if !shouldExist && !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("expected source asset %s to be removed, stat err=%v", fileName, err)
	}
}

func TestCleanupUnboundVehicleModelTemplateSourceAssets(t *testing.T) {
	testDB := openVehicleModelTemplateTestDB(t)
	uploadDir := t.TempDir()

	oldTime := time.Now().Add(-48 * time.Hour)
	freshTime := time.Now().Add(-1 * time.Hour)
	oldOrphan := VehicleModelTemplateSourceAssetFilePrefix + "old-orphan.glb"
	freshOrphan := VehicleModelTemplateSourceAssetFilePrefix + "fresh-orphan.glb"
	currentReference := VehicleModelTemplateSourceAssetFilePrefix + "current.glb"
	versionReference := VehicleModelTemplateSourceAssetFilePrefix + "version.glb"
	genericAsset := "generic.glb"

	for _, fileName := range []string{oldOrphan, currentReference, versionReference, genericAsset} {
		writeVehicleModelTemplateSourceAssetForCleanupTest(t, uploadDir, fileName, oldTime)
	}
	writeVehicleModelTemplateSourceAssetForCleanupTest(t, uploadDir, freshOrphan, freshTime)

	notes := json.RawMessage(`[]`)
	if err := testDB.Create(&models.LogisticsVehicleModelTemplate{
		BaseModel:          models.BaseModel{ID: "template-current"},
		SeedVehicleSpecID:  "van-standard",
		Name:               "当前模板",
		SourceAssetURL:     "/uploads/" + currentReference,
		SourceAssetName:    "current.glb",
		SourceFormat:       "glb",
		Status:             "uploaded",
		NormalizedLengthMm: 2100,
		NormalizedWidthMm:  1200,
		NormalizedHeightMm: 1000,
		Version:            1,
		Notes:              notes,
	}).Error; err != nil {
		t.Fatalf("seed current template reference: %v", err)
	}
	if err := testDB.Create(&models.LogisticsVehicleModelTemplateVersion{
		BaseModel:          models.BaseModel{ID: "template-version"},
		TemplateID:         "template-current",
		Version:            1,
		SeedVehicleSpecID:  "van-standard",
		Name:               "历史模板",
		SourceAssetURL:     "/uploads/" + versionReference,
		SourceAssetName:    "version.glb",
		SourceFormat:       "glb",
		Status:             "uploaded",
		NormalizedLengthMm: 2100,
		NormalizedWidthMm:  1200,
		NormalizedHeightMm: 1000,
		Notes:              notes,
		Snapshot:           json.RawMessage(`{}`),
	}).Error; err != nil {
		t.Fatalf("seed version template reference: %v", err)
	}

	result, err := CleanupUnboundVehicleModelTemplateSourceAssets(uploadDir, 24*time.Hour)
	if err != nil {
		t.Fatalf("cleanup unbound vehicle model template source assets: %v", err)
	}
	if result.Deleted != 1 {
		t.Fatalf("expected one old orphan to be deleted, got %#v", result)
	}

	assertVehicleModelTemplateSourceAssetExists(t, uploadDir, oldOrphan, false)
	assertVehicleModelTemplateSourceAssetExists(t, uploadDir, freshOrphan, true)
	assertVehicleModelTemplateSourceAssetExists(t, uploadDir, currentReference, true)
	assertVehicleModelTemplateSourceAssetExists(t, uploadDir, versionReference, true)
	assertVehicleModelTemplateSourceAssetExists(t, uploadDir, genericAsset, true)
}

func TestVehicleModelTemplateSourceFormatMustMatchUploadedFile(t *testing.T) {
	t.Parallel()

	if err := validateVehicleModelTemplateSourceFormatMatchesURL(
		"/uploads/vehicle-model.glb",
		"glb",
	); err != nil {
		t.Fatalf("expected matching source format, got %v", err)
	}
	if err := validateVehicleModelTemplateSourceFormatMatchesURL(
		"/uploads/vehicle-model.glb",
		"obj",
	); !errors.Is(err, ErrVehicleModelTemplateSourceFormatInvalid) {
		t.Fatalf("expected source format mismatch error, got %v", err)
	}
	if err := validateVehicleModelTemplateSourceFormatMatchesURL(
		"/uploads/vehicle-model.stp",
		"step",
	); !errors.Is(err, ErrVehicleModelTemplateSourceFormatInvalid) {
		t.Fatalf("expected non-GLB source format to be rejected, got %v", err)
	}
}

func TestVehicleModelTemplateSourceFormatAndStatusValidation(t *testing.T) {
	t.Parallel()

	for _, format := range []string{"glb"} {
		if !isSupportedVehicleModelTemplateSourceFormat(format) {
			t.Errorf("expected source format %q to be supported", format)
		}
	}
	for _, format := range []string{"", "step", "stp", "obj", "gltf", "stl", "fbx", "usd", "png"} {
		if isSupportedVehicleModelTemplateSourceFormat(format) {
			t.Errorf("expected source format %q to be rejected", format)
		}
	}

	for _, status := range []string{"uploaded", "normalized"} {
		if !isSupportedVehicleModelTemplateStatus(status) {
			t.Errorf("expected status %q to be supported", status)
		}
	}
	if isSupportedVehicleModelTemplateStatus("seed-only") {
		t.Fatal("seed-only must not be persisted as a server template status")
	}
}

func openVehicleModelTemplateTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	dsn := fmt.Sprintf("file:vehicle_model_template_%d?mode=memory&cache=shared", time.Now().UnixNano())
	testDB, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("open vehicle model template test db: %v", err)
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

	createVehicleModelTemplateTestSchema(t, testDB)

	previousDB := appdb.DB
	appdb.DB = testDB
	t.Cleanup(func() { appdb.DB = previousDB })

	return testDB
}

func createVehicleModelTemplateTestSchema(t *testing.T, testDB *gorm.DB) {
	t.Helper()

	statements := []string{
		`CREATE TABLE logistics_vehicle_model_templates (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			seed_vehicle_spec_id TEXT NOT NULL,
			name TEXT NOT NULL,
			source_asset_url TEXT NOT NULL,
			source_asset_name TEXT NOT NULL,
			source_format TEXT NOT NULL,
			status TEXT NOT NULL,
			normalized_length_mm INTEGER NOT NULL DEFAULT 0,
			normalized_width_mm INTEGER NOT NULL DEFAULT 0,
			normalized_height_mm INTEGER NOT NULL DEFAULT 0,
			version INTEGER NOT NULL DEFAULT 1,
			notes TEXT NOT NULL DEFAULT '[]'
		)`,
		`CREATE UNIQUE INDEX uniq_vehicle_model_template_seed_name
			ON logistics_vehicle_model_templates(seed_vehicle_spec_id, name)`,
		`CREATE TABLE logistics_vehicle_model_template_versions (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			template_id TEXT NOT NULL,
			version INTEGER NOT NULL,
			seed_vehicle_spec_id TEXT NOT NULL,
			name TEXT NOT NULL,
			source_asset_url TEXT NOT NULL,
			source_asset_name TEXT NOT NULL,
			source_format TEXT NOT NULL,
			status TEXT NOT NULL,
			normalized_length_mm INTEGER NOT NULL DEFAULT 0,
			normalized_width_mm INTEGER NOT NULL DEFAULT 0,
			normalized_height_mm INTEGER NOT NULL DEFAULT 0,
			notes TEXT NOT NULL DEFAULT '[]',
			snapshot TEXT NOT NULL DEFAULT '{}'
		)`,
		`CREATE UNIQUE INDEX uniq_vehicle_model_template_version_number
			ON logistics_vehicle_model_template_versions(template_id, version)`,
		`CREATE TABLE logistics_vehicle_model_template_parse_tasks (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			template_id TEXT NOT NULL,
			source_asset_url TEXT NOT NULL,
			source_asset_name TEXT NOT NULL,
			source_format TEXT NOT NULL,
			template_version INTEGER NOT NULL,
			status TEXT NOT NULL,
			attempt_count INTEGER NOT NULL DEFAULT 0,
			max_attempts INTEGER NOT NULL DEFAULT 3,
			next_attempt_at DATETIME NOT NULL,
			started_at DATETIME,
			finished_at DATETIME,
			last_error TEXT NOT NULL DEFAULT '',
			actor_id TEXT NOT NULL DEFAULT '',
			operator TEXT NOT NULL DEFAULT '',
			ip TEXT NOT NULL DEFAULT ''
		)`,
		`CREATE UNIQUE INDEX uniq_vehicle_model_template_parse_task_active
			ON logistics_vehicle_model_template_parse_tasks(
				template_id,
				template_version,
				source_asset_url,
				source_asset_name,
				source_format
			)
			WHERE status IN ('queued', 'running')`,
		`CREATE TABLE audit_logs (
			id TEXT PRIMARY KEY,
			module TEXT,
			target_id TEXT,
			action TEXT,
			diff TEXT,
			operator TEXT,
			ip TEXT,
			created_at DATETIME
		)`,
	}

	for _, statement := range statements {
		if err := testDB.Exec(statement).Error; err != nil {
			t.Fatalf("create vehicle model template test schema: %v", err)
		}
	}
}

func newVehicleModelTemplateTestRequest(
	name string,
	sourceFileName string,
	lengthMm int,
) SaveVehicleModelTemplateRequest {
	sourceURLFileName := sourceFileName
	if !strings.HasPrefix(sourceURLFileName, VehicleModelTemplateSourceAssetFilePrefix) {
		sourceURLFileName = VehicleModelTemplateSourceAssetFilePrefix + sourceURLFileName
	}
	return SaveVehicleModelTemplateRequest{
		Name:              name,
		SeedVehicleSpecID: "van-standard",
		SourceAssetURL:    "/uploads/" + sourceURLFileName,
		SourceAssetName:   sourceFileName,
		SourceFormat:      "glb",
		Status:            "uploaded",
		NormalizedFootprint: VehicleModelTemplateFootprint{
			LengthMm: lengthMm,
			WidthMm:  1200,
			HeightMm: 1000,
		},
		Notes:    []string{"seed snapshot"},
		ActorID:  "user-a",
		Operator: "tester",
		IP:       "127.0.0.1",
	}
}

func TestSaveAndUpdateVehicleModelTemplateCreatesVersionSnapshotsAndAudit(t *testing.T) {
	testDB := openVehicleModelTemplateTestDB(t)

	created, err := SaveVehicleModelTemplate(newVehicleModelTemplateTestRequest(
		"面包车模板",
		"van-v1.glb",
		2100,
	))
	if err != nil {
		t.Fatalf("save vehicle model template: %v", err)
	}
	if created.ID == "" {
		t.Fatal("expected service to assign a stable template id")
	}
	if created.Version != 1 || created.VersionCount != 1 {
		t.Fatalf("expected created version/count to be 1/1, got %d/%d", created.Version, created.VersionCount)
	}

	updatedRequest := newVehicleModelTemplateTestRequest("面包车模板", "van-v2.glb", 2200)
	updated, err := UpdateVehicleModelTemplate(created.ID, updatedRequest)
	if err != nil {
		t.Fatalf("update vehicle model template: %v", err)
	}
	if updated.Version != 2 || updated.VersionCount != 2 {
		t.Fatalf("expected updated version/count to be 2/2, got %d/%d", updated.Version, updated.VersionCount)
	}

	versions, err := ListVehicleModelTemplateVersions(created.ID)
	if err != nil {
		t.Fatalf("list vehicle model template versions: %v", err)
	}
	if len(versions) != 2 {
		t.Fatalf("expected 2 version snapshots, got %d", len(versions))
	}
	if versions[0].Version != 2 || versions[0].SourceAssetName != "van-v2.glb" {
		t.Fatalf("expected latest snapshot to be v2/van-v2.glb, got v%d/%s", versions[0].Version, versions[0].SourceAssetName)
	}
	if versions[1].Version != 1 || versions[1].SourceAssetName != "van-v1.glb" {
		t.Fatalf("expected first snapshot to be v1/van-v1.glb, got v%d/%s", versions[1].Version, versions[1].SourceAssetName)
	}

	var auditCount int64
	if err := testDB.Model(&models.AuditLog{}).
		Where("module = ? AND target_id = ?", AuditModuleVehicleModelTemplate, created.ID).
		Count(&auditCount).Error; err != nil {
		t.Fatalf("count vehicle model template audit logs: %v", err)
	}
	if auditCount != 2 {
		t.Fatalf("expected 2 audit logs, got %d", auditCount)
	}
}

func TestRestoreVehicleModelTemplateVersionCreatesNewCurrentSnapshot(t *testing.T) {
	testDB := openVehicleModelTemplateTestDB(t)

	created, err := SaveVehicleModelTemplate(newVehicleModelTemplateTestRequest(
		"面包车模板",
		"van-v1.glb",
		2100,
	))
	if err != nil {
		t.Fatalf("save vehicle model template: %v", err)
	}
	_, err = UpdateVehicleModelTemplate(
		created.ID,
		newVehicleModelTemplateTestRequest("面包车模板", "van-v2.glb", 2200),
	)
	if err != nil {
		t.Fatalf("update vehicle model template: %v", err)
	}

	restored, err := RestoreVehicleModelTemplateVersion(
		created.ID,
		1,
		RestoreVehicleModelTemplateVersionRequest{
			ActorID:  "user-b",
			Operator: "restorer",
			IP:       "127.0.0.2",
		},
	)
	if err != nil {
		t.Fatalf("restore vehicle model template version: %v", err)
	}
	if restored.Version != 3 || restored.VersionCount != 3 {
		t.Fatalf("expected restored version/count to be 3/3, got %d/%d", restored.Version, restored.VersionCount)
	}
	if restored.SourceAssetName != "van-v1.glb" {
		t.Fatalf("expected restored source asset to be van-v1.glb, got %s", restored.SourceAssetName)
	}
	if len(restored.Notes) != 1 || restored.Notes[0] != "seed snapshot" {
		t.Fatalf("restore response must keep business notes unchanged, got %#v", restored.Notes)
	}

	versions, err := ListVehicleModelTemplateVersions(created.ID)
	if err != nil {
		t.Fatalf("list restored vehicle model template versions: %v", err)
	}
	if len(versions) != 3 {
		t.Fatalf("expected 3 snapshots after restore, got %d", len(versions))
	}
	if versions[0].Version != 3 || versions[0].SourceAssetName != "van-v1.glb" {
		t.Fatalf("expected restore to create v3 from v1, got v%d/%s", versions[0].Version, versions[0].SourceAssetName)
	}

	var auditCount int64
	if err := testDB.Model(&models.AuditLog{}).
		Where("module = ? AND target_id = ?", AuditModuleVehicleModelTemplate, created.ID).
		Count(&auditCount).Error; err != nil {
		t.Fatalf("count vehicle model template audit logs: %v", err)
	}
	if auditCount != 3 {
		t.Fatalf("expected 3 audit logs after restore, got %d", auditCount)
	}
}

func TestParseVehicleModelTemplateGeometryNormalizesTemplateAndStoresGeometrySnapshot(t *testing.T) {
	testDB := openVehicleModelTemplateTestDB(t)

	uploadFileName := VehicleModelTemplateSourceAssetFilePrefix + "parser-v1.glb"
	if err := os.MkdirAll("uploads", 0755); err != nil {
		t.Fatalf("create uploads dir: %v", err)
	}
	if err := os.WriteFile(filepath.Join("uploads", uploadFileName), []byte("glb"), 0644); err != nil {
		t.Fatalf("write parser source file: %v", err)
	}
	t.Cleanup(func() {
		if err := os.Remove(filepath.Join("uploads", uploadFileName)); err != nil && !errors.Is(err, os.ErrNotExist) {
			t.Errorf("remove parser source file: %v", err)
		}
	})

	fakeRunner := &fakeVehicleModelTemplateGeometryParserRunner{
		geometry: json.RawMessage(`{
			"schemaVersion":"vehicle-geometry.v1",
			"sourceFormat":"glb",
			"unit":"mm",
			"coordinateSystem":{"lengthAxis":"x","widthAxis":"y","heightAxis":"z"},
			"bounds":{"minMm":[0,0,0],"maxMm":[2600.2,1400.1,1200],"lengthMm":2600.2,"widthMm":1400.1,"heightMm":1200},
			"parts":[{
				"id":"cargo-space",
				"kind":"usable-space",
				"collision":"aabb",
				"bounds":{"minMm":[0,0,0],"maxMm":[2600.2,1400.1,1200],"lengthMm":2600.2,"widthMm":1400.1,"heightMm":1200},
				"positionMm":[0,0,0],
				"nodeIndex":0,
				"meshIndex":0,
				"vertexCount":8
			},{
				"id":"rotated-keep-out",
				"kind":"keep-out",
				"collision":"obb",
				"bounds":{"minMm":[1046,246,0],"maxMm":[1754,954,400],"lengthMm":708,"widthMm":708,"heightMm":400},
				"obb":{
					"centerMm":[1400,600,200],
					"halfExtentsMm":[100,400,200],
					"axes":[
						[0.7071067811865476,0.7071067811865476,0],
						[-0.7071067811865476,0.7071067811865476,0],
						[0,0,1]
					]
				},
				"positionMm":[1046,246,0],
				"nodeIndex":1,
				"meshIndex":1,
				"vertexCount":8
			}],
			"warnings":[]
		}`),
	}
	previousRunner := vehicleModelTemplateGeometryParserRunner
	vehicleModelTemplateGeometryParserRunner = fakeRunner
	t.Cleanup(func() {
		vehicleModelTemplateGeometryParserRunner = previousRunner
	})

	created, err := SaveVehicleModelTemplate(newVehicleModelTemplateTestRequest(
		"面包车模板",
		"parser-v1.glb",
		2100,
	))
	if err != nil {
		t.Fatalf("save uploaded vehicle model template: %v", err)
	}

	parsed, err := ParseVehicleModelTemplateGeometry(
		context.Background(),
		created.ID,
		ParseVehicleModelTemplateGeometryRequest{
			ActorID:  "user-parser",
			Operator: "parser",
			IP:       "127.0.0.3",
		},
	)
	if err != nil {
		t.Fatalf("parse vehicle model template geometry: %v", err)
	}
	if fakeRunner.parseCallCount != 1 {
		t.Fatalf("expected parser runner to be called once, got %d", fakeRunner.parseCallCount)
	}
	if !strings.HasSuffix(fakeRunner.receivedPath, filepath.Join("uploads", uploadFileName)) {
		t.Fatalf("expected parser to receive controlled upload path, got %s", fakeRunner.receivedPath)
	}
	if parsed.Template.Status != "normalized" {
		t.Fatalf("expected template status normalized, got %s", parsed.Template.Status)
	}
	if parsed.Template.NormalizedFootprint.LengthMm != 2601 ||
		parsed.Template.NormalizedFootprint.WidthMm != 1401 ||
		parsed.Template.NormalizedFootprint.HeightMm != 1200 {
		t.Fatalf("unexpected parsed footprint: %#v", parsed.Template.NormalizedFootprint)
	}
	if parsed.Template.Version != 2 || parsed.Template.VersionCount != 2 {
		t.Fatalf("expected parsed version/count to be 2/2, got %d/%d", parsed.Template.Version, parsed.Template.VersionCount)
	}

	versions, err := ListVehicleModelTemplateVersions(created.ID)
	if err != nil {
		t.Fatalf("list parsed vehicle model template versions: %v", err)
	}
	if len(versions) != 2 {
		t.Fatalf("expected 2 versions after parse, got %d", len(versions))
	}
	var latestSnapshot map[string]json.RawMessage
	if err := json.Unmarshal(versions[0].Snapshot, &latestSnapshot); err != nil {
		t.Fatalf("decode latest snapshot: %v", err)
	}
	var snapshotGeometry VehicleModelTemplateParsedGeometry
	if err := json.Unmarshal(latestSnapshot["geometry"], &snapshotGeometry); err != nil {
		t.Fatalf("decode geometry snapshot: %v", err)
	}
	if snapshotGeometry.SchemaVersion != vehicleModelTemplateGeometrySchemaVersion ||
		snapshotGeometry.Parts[0].Kind != "usable-space" {
		t.Fatalf("unexpected geometry snapshot: %#v", snapshotGeometry)
	}
	if len(snapshotGeometry.Parts) != 2 ||
		snapshotGeometry.Parts[1].Collision != "obb" ||
		snapshotGeometry.Parts[1].Obb == nil {
		t.Fatalf("expected geometry snapshot to preserve OBB part, got %#v", snapshotGeometry.Parts)
	}
	if snapshotGeometry.Parts[1].Obb.HalfExtentsMm != [3]float64{100, 400, 200} {
		t.Fatalf("unexpected OBB half extents: %#v", snapshotGeometry.Parts[1].Obb.HalfExtentsMm)
	}

	restored, err := RestoreVehicleModelTemplateVersion(
		created.ID,
		2,
		RestoreVehicleModelTemplateVersionRequest{
			ActorID:  "user-restore",
			Operator: "restorer",
			IP:       "127.0.0.4",
		},
	)
	if err != nil {
		t.Fatalf("restore parsed vehicle model template version: %v", err)
	}
	if restored.Version != 3 || restored.VersionCount != 3 {
		t.Fatalf("expected restored parsed version/count to be 3/3, got %d/%d", restored.Version, restored.VersionCount)
	}

	versions, err = ListVehicleModelTemplateVersions(created.ID)
	if err != nil {
		t.Fatalf("list restored parsed versions: %v", err)
	}
	var restoredSnapshot map[string]json.RawMessage
	if err := json.Unmarshal(versions[0].Snapshot, &restoredSnapshot); err != nil {
		t.Fatalf("decode restored snapshot: %v", err)
	}
	if len(restoredSnapshot["geometry"]) == 0 {
		t.Fatal("expected restored snapshot to keep geometry")
	}

	var auditCount int64
	if err := testDB.Model(&models.AuditLog{}).
		Where("module = ? AND target_id = ?", AuditModuleVehicleModelTemplate, created.ID).
		Count(&auditCount).Error; err != nil {
		t.Fatalf("count vehicle model template audit logs: %v", err)
	}
	if auditCount != 3 {
		t.Fatalf("expected 3 audit logs after save/parse/restore, got %d", auditCount)
	}
}

func TestValidateVehicleModelTemplateParsedGeometryRejectsMissingUsableSpace(t *testing.T) {
	_, _, _, err := validateVehicleModelTemplateParsedGeometry(json.RawMessage(`{
		"schemaVersion":"vehicle-geometry.v1",
		"sourceFormat":"glb",
		"unit":"mm",
		"coordinateSystem":{"lengthAxis":"x","widthAxis":"y","heightAxis":"z"},
		"bounds":{"minMm":[0,0,0],"maxMm":[100,100,100],"lengthMm":100,"widthMm":100,"heightMm":100},
		"parts":[{
			"id":"reference",
			"kind":"reference",
			"collision":"none",
			"bounds":{"minMm":[0,0,0],"maxMm":[100,100,100],"lengthMm":100,"widthMm":100,"heightMm":100},
			"positionMm":[0,0,0],
			"nodeIndex":0,
			"meshIndex":0,
			"vertexCount":8
		}],
		"warnings":[]
	}`))
	if !errors.Is(err, ErrVehicleModelTemplateParsedGeometryInvalid) {
		t.Fatalf("expected parsed geometry invalid error, got %v", err)
	}
}

func TestValidateVehicleModelTemplateParsedGeometryRequiresObbForObbCollision(t *testing.T) {
	_, _, _, err := validateVehicleModelTemplateParsedGeometry(json.RawMessage(`{
		"schemaVersion":"vehicle-geometry.v1",
		"sourceFormat":"glb",
		"unit":"mm",
		"coordinateSystem":{"lengthAxis":"x","widthAxis":"y","heightAxis":"z"},
		"bounds":{"minMm":[0,0,0],"maxMm":[100,100,100],"lengthMm":100,"widthMm":100,"heightMm":100},
		"parts":[{
			"id":"cargo-space",
			"kind":"usable-space",
			"collision":"aabb",
			"bounds":{"minMm":[0,0,0],"maxMm":[100,100,100],"lengthMm":100,"widthMm":100,"heightMm":100},
			"positionMm":[0,0,0],
			"nodeIndex":0,
			"meshIndex":0,
			"vertexCount":8
		},{
			"id":"rotated-keep-out",
			"kind":"keep-out",
			"collision":"obb",
			"bounds":{"minMm":[20,20,0],"maxMm":[80,80,100],"lengthMm":60,"widthMm":60,"heightMm":100},
			"positionMm":[20,20,0],
			"nodeIndex":1,
			"meshIndex":1,
			"vertexCount":8
		}],
		"warnings":[]
	}`))
	if !errors.Is(err, ErrVehicleModelTemplateParsedGeometryInvalid) {
		t.Fatalf("expected parsed geometry invalid error, got %v", err)
	}
}

func TestValidateVehicleModelTemplateParsedGeometryRejectsObbOutsidePartBounds(t *testing.T) {
	_, _, _, err := validateVehicleModelTemplateParsedGeometry(json.RawMessage(`{
		"schemaVersion":"vehicle-geometry.v1",
		"sourceFormat":"glb",
		"unit":"mm",
		"coordinateSystem":{"lengthAxis":"x","widthAxis":"y","heightAxis":"z"},
		"bounds":{"minMm":[0,0,0],"maxMm":[100,100,100],"lengthMm":100,"widthMm":100,"heightMm":100},
		"parts":[{
			"id":"cargo-space",
			"kind":"usable-space",
			"collision":"aabb",
			"bounds":{"minMm":[0,0,0],"maxMm":[100,100,100],"lengthMm":100,"widthMm":100,"heightMm":100},
			"positionMm":[0,0,0],
			"nodeIndex":0,
			"meshIndex":0,
			"vertexCount":8
		},{
			"id":"rotated-keep-out",
			"kind":"keep-out",
			"collision":"obb",
			"bounds":{"minMm":[20,20,0],"maxMm":[80,80,100],"lengthMm":60,"widthMm":60,"heightMm":100},
			"obb":{
				"centerMm":[50,50,50],
				"halfExtentsMm":[25,45,50],
				"axes":[
					[0.7071067811865476,0.7071067811865476,0],
					[-0.7071067811865476,0.7071067811865476,0],
					[0,0,1]
				]
			},
			"positionMm":[20,20,0],
			"nodeIndex":1,
			"meshIndex":1,
			"vertexCount":8
		}],
		"warnings":[]
	}`))
	if !errors.Is(err, ErrVehicleModelTemplateParsedGeometryInvalid) {
		t.Fatalf("expected parsed geometry invalid error, got %v", err)
	}
}

func TestInspectVehicleModelTemplateGeometryParserRuntimeStatus(t *testing.T) {
	parserPath := filepath.Join(t.TempDir(), "xdfc-vehicle-geometry-parser")
	if err := os.WriteFile(parserPath, []byte("#!/bin/sh\n"), 0755); err != nil {
		t.Fatalf("write fake parser executable: %v", err)
	}

	t.Setenv(vehicleModelTemplateGeometryParserExecutableEnvName, parserPath)
	availableStatus := InspectVehicleModelTemplateGeometryParserRuntimeStatus()
	if !availableStatus.Available {
		t.Fatalf("expected fake parser path to be available, got %#v", availableStatus)
	}
	if availableStatus.ExecutablePath != parserPath {
		t.Fatalf("expected inspected parser path %s, got %s", parserPath, availableStatus.ExecutablePath)
	}

	t.Setenv(vehicleModelTemplateGeometryParserExecutableEnvName, parserPath+"-missing")
	missingStatus := InspectVehicleModelTemplateGeometryParserRuntimeStatus()
	if missingStatus.Available {
		t.Fatalf("expected missing parser path to be unavailable, got %#v", missingStatus)
	}
}
