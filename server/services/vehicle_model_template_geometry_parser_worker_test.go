package services

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"testing"
	"time"
	appdb "xdfc-server/db"
	"xdfc-server/models"
)

const vehicleModelTemplateWorkerTestGeometry = `{
	"schemaVersion":"vehicle-geometry.v1",
	"sourceFormat":"glb",
	"unit":"mm",
	"coordinateSystem":{"lengthAxis":"x","widthAxis":"y","heightAxis":"z"},
	"bounds":{"minMm":[0,0,0],"maxMm":[2600,1400,1200],"lengthMm":2600,"widthMm":1400,"heightMm":1200},
	"parts":[{
		"id":"cargo-space",
		"kind":"usable-space",
		"collision":"aabb",
		"bounds":{"minMm":[0,0,0],"maxMm":[2600,1400,1200],"lengthMm":2600,"widthMm":1400,"heightMm":1200},
		"positionMm":[0,0,0],
		"nodeIndex":0,
		"meshIndex":0,
		"vertexCount":8
	}],
	"warnings":[]
}`

func TestEnqueueVehicleModelTemplateGeometryParseTaskIsIdempotentForActiveVersion(t *testing.T) {
	testDB := openVehicleModelTemplateTestDB(t)

	created, err := SaveVehicleModelTemplate(newVehicleModelTemplateTestRequest(
		"Worker 幂等模板",
		"worker-idempotent.glb",
		2100,
	))
	if err != nil {
		t.Fatalf("save vehicle model template: %v", err)
	}

	first, err := EnqueueVehicleModelTemplateGeometryParseTask(
		created.ID,
		ParseVehicleModelTemplateGeometryRequest{ActorID: "user-a", Operator: "tester", IP: "127.0.0.1"},
	)
	if err != nil {
		t.Fatalf("enqueue first parse task: %v", err)
	}
	second, err := EnqueueVehicleModelTemplateGeometryParseTask(
		created.ID,
		ParseVehicleModelTemplateGeometryRequest{ActorID: "user-b", Operator: "tester-2", IP: "127.0.0.2"},
	)
	if err != nil {
		t.Fatalf("enqueue second parse task: %v", err)
	}

	if first.ID == "" || first.ID != second.ID {
		t.Fatalf("expected active task enqueue to be idempotent, got first=%q second=%q", first.ID, second.ID)
	}
	if first.Status != models.VehicleModelTemplateParseTaskStatusQueued {
		t.Fatalf("expected queued task, got %s", first.Status)
	}

	var taskCount int64
	if err := testDB.Model(&models.LogisticsVehicleModelTemplateParseTask{}).
		Where("template_id = ?", created.ID).
		Count(&taskCount).Error; err != nil {
		t.Fatalf("count parse tasks: %v", err)
	}
	if taskCount != 1 {
		t.Fatalf("expected one active parse task, got %d", taskCount)
	}
}

func TestRunVehicleModelTemplateGeometryParserWorkerOnceSucceeds(t *testing.T) {
	_ = openVehicleModelTemplateTestDB(t)
	template := createVehicleModelTemplateWorkerTestTemplate(t, "worker-success.glb")

	previousRunner := vehicleModelTemplateGeometryParserRunner
	vehicleModelTemplateGeometryParserRunner = &fakeVehicleModelTemplateGeometryParserRunner{
		geometry: json.RawMessage(vehicleModelTemplateWorkerTestGeometry),
	}
	t.Cleanup(func() {
		vehicleModelTemplateGeometryParserRunner = previousRunner
	})

	task, err := EnqueueVehicleModelTemplateGeometryParseTask(
		template.ID,
		ParseVehicleModelTemplateGeometryRequest{ActorID: "user-a", Operator: "tester", IP: "127.0.0.1"},
	)
	if err != nil {
		t.Fatalf("enqueue parse task: %v", err)
	}

	processed, err := RunVehicleModelTemplateGeometryParserWorkerOnce(context.Background())
	if err != nil {
		t.Fatalf("run parser worker: %v", err)
	}
	if !processed {
		t.Fatal("expected worker to process one task")
	}

	stored, err := GetVehicleModelTemplateGeometryParseTask(template.ID, task.ID)
	if err != nil {
		t.Fatalf("get completed parse task: %v", err)
	}
	if stored.Status != models.VehicleModelTemplateParseTaskStatusSucceeded {
		t.Fatalf("expected succeeded task, got %s", stored.Status)
	}
	if stored.AttemptCount != 1 {
		t.Fatalf("expected one parse attempt, got %d", stored.AttemptCount)
	}
	if stored.FinishedAt == nil {
		t.Fatal("expected completed task to have finishedAt")
	}

	var updated models.LogisticsVehicleModelTemplate
	if err := appdb.DB.First(&updated, "id = ?", template.ID).Error; err != nil {
		t.Fatalf("reload normalized template: %v", err)
	}
	if updated.Status != "normalized" || updated.Version != 2 {
		t.Fatalf("expected parser to normalize template to version 2, got status=%s version=%d", updated.Status, updated.Version)
	}
}

func TestRunVehicleModelTemplateGeometryParserWorkerRetriesAndAllowsManualRetry(t *testing.T) {
	_ = openVehicleModelTemplateTestDB(t)
	template := createVehicleModelTemplateWorkerTestTemplate(t, "worker-retry.glb")
	parserError := errors.New("temporary parser failure")
	fakeRunner := &fakeVehicleModelTemplateGeometryParserRunner{returnedError: parserError}

	previousRunner := vehicleModelTemplateGeometryParserRunner
	vehicleModelTemplateGeometryParserRunner = fakeRunner
	t.Cleanup(func() {
		vehicleModelTemplateGeometryParserRunner = previousRunner
	})

	task, err := EnqueueVehicleModelTemplateGeometryParseTask(
		template.ID,
		ParseVehicleModelTemplateGeometryRequest{ActorID: "user-a", Operator: "tester", IP: "127.0.0.1"},
	)
	if err != nil {
		t.Fatalf("enqueue parse task: %v", err)
	}

	for attempt := 1; attempt <= task.MaxAttempts; attempt++ {
		processed, runErr := RunVehicleModelTemplateGeometryParserWorkerOnce(context.Background())
		if !processed {
			t.Fatalf("expected worker to process attempt %d", attempt)
		}
		if !errors.Is(runErr, parserError) {
			t.Fatalf("expected parser error on attempt %d, got %v", attempt, runErr)
		}

		stored, getErr := GetVehicleModelTemplateGeometryParseTask(template.ID, task.ID)
		if getErr != nil {
			t.Fatalf("get parse task after attempt %d: %v", attempt, getErr)
		}
		expectedStatus := models.VehicleModelTemplateParseTaskStatusQueued
		if attempt == task.MaxAttempts {
			expectedStatus = models.VehicleModelTemplateParseTaskStatusFailed
		}
		if stored.Status != expectedStatus {
			t.Fatalf("expected status %s after attempt %d, got %s", expectedStatus, attempt, stored.Status)
		}
		if stored.AttemptCount != attempt {
			t.Fatalf("expected attemptCount=%d, got %d", attempt, stored.AttemptCount)
		}
		if attempt < task.MaxAttempts {
			if err := appdb.DB.Model(&models.LogisticsVehicleModelTemplateParseTask{}).
				Where("id = ?", task.ID).
				Update("next_attempt_at", time.Now()).Error; err != nil {
				t.Fatalf("make retry immediately available: %v", err)
			}
		}
	}

	failed, err := GetVehicleModelTemplateGeometryParseTask(template.ID, task.ID)
	if err != nil {
		t.Fatalf("get failed parse task: %v", err)
	}
	if failed.FinishedAt == nil || failed.LastError == "" {
		t.Fatalf("expected failed task to have completion metadata, got %#v", failed)
	}

	retried, err := RetryVehicleModelTemplateGeometryParseTask(template.ID, task.ID)
	if err != nil {
		t.Fatalf("retry failed parse task: %v", err)
	}
	if retried.Status != models.VehicleModelTemplateParseTaskStatusQueued || retried.AttemptCount != 0 {
		t.Fatalf("expected manual retry to reset task, got status=%s attempts=%d", retried.Status, retried.AttemptCount)
	}
}

func TestRunVehicleModelTemplateGeometryParserWorkerDoesNotParseStaleTask(t *testing.T) {
	_ = openVehicleModelTemplateTestDB(t)
	template := createVehicleModelTemplateWorkerTestTemplate(t, "worker-stale-v1.glb")
	fakeRunner := &fakeVehicleModelTemplateGeometryParserRunner{
		geometry: json.RawMessage(vehicleModelTemplateWorkerTestGeometry),
	}

	previousRunner := vehicleModelTemplateGeometryParserRunner
	vehicleModelTemplateGeometryParserRunner = fakeRunner
	t.Cleanup(func() {
		vehicleModelTemplateGeometryParserRunner = previousRunner
	})

	task, err := EnqueueVehicleModelTemplateGeometryParseTask(
		template.ID,
		ParseVehicleModelTemplateGeometryRequest{ActorID: "user-a", Operator: "tester", IP: "127.0.0.1"},
	)
	if err != nil {
		t.Fatalf("enqueue parse task: %v", err)
	}

	if _, err := UpdateVehicleModelTemplate(
		template.ID,
		newVehicleModelTemplateTestRequest("Worker stale 模板", "worker-stale-v2.glb", 2200),
	); err != nil {
		t.Fatalf("update template before worker claim: %v", err)
	}

	processed, err := RunVehicleModelTemplateGeometryParserWorkerOnce(context.Background())
	if !processed {
		t.Fatal("expected worker to process stale task")
	}
	if !errors.Is(err, ErrVehicleModelTemplateChangedDuringParse) {
		t.Fatalf("expected stale task error, got %v", err)
	}
	if fakeRunner.parseCallCount != 0 {
		t.Fatalf("expected stale task not to invoke parser, got %d calls", fakeRunner.parseCallCount)
	}

	stored, err := GetVehicleModelTemplateGeometryParseTask(template.ID, task.ID)
	if err != nil {
		t.Fatalf("get stale parse task: %v", err)
	}
	if stored.Status != models.VehicleModelTemplateParseTaskStatusFailed {
		t.Fatalf("expected stale task to fail terminally, got %s", stored.Status)
	}
}

func createVehicleModelTemplateWorkerTestTemplate(
	t *testing.T,
	sourceFileName string,
) VehicleModelTemplateResponse {
	t.Helper()

	if err := os.MkdirAll("uploads", 0755); err != nil {
		t.Fatalf("create uploads directory: %v", err)
	}
	sourceURLFileName := VehicleModelTemplateSourceAssetFilePrefix + sourceFileName
	sourcePath := filepath.Join("uploads", sourceURLFileName)
	if err := os.WriteFile(sourcePath, []byte("glb"), 0644); err != nil {
		t.Fatalf("write worker source asset: %v", err)
	}
	t.Cleanup(func() {
		if err := os.Remove(sourcePath); err != nil && !errors.Is(err, os.ErrNotExist) {
			t.Errorf("remove worker source asset: %v", err)
		}
	})

	template, err := SaveVehicleModelTemplate(newVehicleModelTemplateTestRequest(
		"Worker "+sourceFileName,
		sourceFileName,
		2100,
	))
	if err != nil {
		t.Fatalf("save worker test template: %v", err)
	}
	return template
}
