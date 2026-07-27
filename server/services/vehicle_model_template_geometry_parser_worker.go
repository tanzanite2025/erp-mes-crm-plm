package services

import (
	"context"
	"errors"
	"log"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

const (
	vehicleModelTemplateParseTaskDefaultMaxAttempts = 3
	vehicleModelTemplateParseTaskRetryDelay         = 5 * time.Second
	vehicleModelTemplateParseWorkerInterval         = 5 * time.Second
)

var (
	ErrVehicleModelTemplateParseTaskNotFound     = errors.New("vehicle model template parse task not found")
	ErrVehicleModelTemplateParseTaskNotRetryable = errors.New("vehicle model template parse task is not retryable")
)

type VehicleModelTemplateGeometryParseTaskResponse struct {
	ID              string     `json:"id"`
	TemplateID      string     `json:"templateId"`
	SourceAssetURL  string     `json:"sourceAssetUrl"`
	SourceAssetName string     `json:"sourceAssetName"`
	SourceFormat    string     `json:"sourceFormat"`
	TemplateVersion int        `json:"templateVersion"`
	Status          string     `json:"status"`
	AttemptCount    int        `json:"attemptCount"`
	MaxAttempts     int        `json:"maxAttempts"`
	NextAttemptAt   time.Time  `json:"nextAttemptAt"`
	StartedAt       *time.Time `json:"startedAt,omitempty"`
	FinishedAt      *time.Time `json:"finishedAt,omitempty"`
	LastError       string     `json:"lastError,omitempty"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
}

func EnqueueVehicleModelTemplateGeometryParseTask(
	templateID string,
	request ParseVehicleModelTemplateGeometryRequest,
) (VehicleModelTemplateGeometryParseTaskResponse, error) {
	trimmedTemplateID := strings.TrimSpace(templateID)
	if trimmedTemplateID == "" {
		return VehicleModelTemplateGeometryParseTaskResponse{}, ErrVehicleModelTemplateNotFound
	}

	var template models.LogisticsVehicleModelTemplate
	if err := db.DB.First(&template, "id = ?", trimmedTemplateID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return VehicleModelTemplateGeometryParseTaskResponse{}, ErrVehicleModelTemplateNotFound
		}
		return VehicleModelTemplateGeometryParseTaskResponse{}, err
	}
	if !strings.EqualFold(template.SourceFormat, "glb") {
		return VehicleModelTemplateGeometryParseTaskResponse{}, ErrVehicleModelTemplateSourceFormatInvalid
	}

	var existing models.LogisticsVehicleModelTemplateParseTask
	activeTaskQuery := db.DB.
		Where(
			"template_id = ? AND template_version = ? AND source_asset_url = ? AND source_asset_name = ? AND source_format = ?",
			template.ID,
			template.Version,
			template.SourceAssetURL,
			template.SourceAssetName,
			template.SourceFormat,
		).
		Where(
			"status IN ?",
			[]string{
				models.VehicleModelTemplateParseTaskStatusQueued,
				models.VehicleModelTemplateParseTaskStatusRunning,
			},
		).
		Order("created_at desc")
	if err := activeTaskQuery.First(&existing).Error; err == nil {
		return mapVehicleModelTemplateGeometryParseTaskResponse(existing), nil
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return VehicleModelTemplateGeometryParseTaskResponse{}, err
	}

	now := time.Now()
	task := models.LogisticsVehicleModelTemplateParseTask{
		BaseModel:       models.BaseModel{ID: uuid.NewString()},
		TemplateID:      template.ID,
		SourceAssetURL:  template.SourceAssetURL,
		SourceAssetName: template.SourceAssetName,
		SourceFormat:    template.SourceFormat,
		TemplateVersion: template.Version,
		Status:          models.VehicleModelTemplateParseTaskStatusQueued,
		AttemptCount:    0,
		MaxAttempts:     vehicleModelTemplateParseTaskDefaultMaxAttempts,
		NextAttemptAt:   now,
		ActorID:         request.ActorID,
		Operator:        request.Operator,
		IP:              request.IP,
	}
	if err := db.DB.Create(&task).Error; err != nil {
		return VehicleModelTemplateGeometryParseTaskResponse{}, err
	}
	return mapVehicleModelTemplateGeometryParseTaskResponse(task), nil
}

func GetVehicleModelTemplateGeometryParseTask(
	templateID string,
	taskID string,
) (VehicleModelTemplateGeometryParseTaskResponse, error) {
	trimmedTemplateID := strings.TrimSpace(templateID)
	trimmedTaskID := strings.TrimSpace(taskID)
	if trimmedTemplateID == "" {
		return VehicleModelTemplateGeometryParseTaskResponse{}, ErrVehicleModelTemplateNotFound
	}
	if trimmedTaskID == "" {
		return VehicleModelTemplateGeometryParseTaskResponse{}, ErrVehicleModelTemplateParseTaskNotFound
	}

	var task models.LogisticsVehicleModelTemplateParseTask
	if err := db.DB.
		Where("id = ? AND template_id = ?", trimmedTaskID, trimmedTemplateID).
		First(&task).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return VehicleModelTemplateGeometryParseTaskResponse{}, ErrVehicleModelTemplateParseTaskNotFound
		}
		return VehicleModelTemplateGeometryParseTaskResponse{}, err
	}
	return mapVehicleModelTemplateGeometryParseTaskResponse(task), nil
}

func RetryVehicleModelTemplateGeometryParseTask(
	templateID string,
	taskID string,
) (VehicleModelTemplateGeometryParseTaskResponse, error) {
	trimmedTemplateID := strings.TrimSpace(templateID)
	trimmedTaskID := strings.TrimSpace(taskID)
	if trimmedTemplateID == "" {
		return VehicleModelTemplateGeometryParseTaskResponse{}, ErrVehicleModelTemplateNotFound
	}
	if trimmedTaskID == "" {
		return VehicleModelTemplateGeometryParseTaskResponse{}, ErrVehicleModelTemplateParseTaskNotFound
	}

	var task models.LogisticsVehicleModelTemplateParseTask
	if err := db.DB.
		Where("id = ? AND template_id = ?", trimmedTaskID, trimmedTemplateID).
		First(&task).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return VehicleModelTemplateGeometryParseTaskResponse{}, ErrVehicleModelTemplateParseTaskNotFound
		}
		return VehicleModelTemplateGeometryParseTaskResponse{}, err
	}
	if task.Status != models.VehicleModelTemplateParseTaskStatusFailed {
		return VehicleModelTemplateGeometryParseTaskResponse{}, ErrVehicleModelTemplateParseTaskNotRetryable
	}

	now := time.Now()
	if err := db.DB.Model(&task).Updates(map[string]any{
		"status":          models.VehicleModelTemplateParseTaskStatusQueued,
		"attempt_count":   0,
		"next_attempt_at": now,
		"started_at":      nil,
		"finished_at":     nil,
		"last_error":      "",
	}).Error; err != nil {
		return VehicleModelTemplateGeometryParseTaskResponse{}, err
	}
	if err := db.DB.First(&task, "id = ?", task.ID).Error; err != nil {
		return VehicleModelTemplateGeometryParseTaskResponse{}, err
	}
	return mapVehicleModelTemplateGeometryParseTaskResponse(task), nil
}

func RunVehicleModelTemplateGeometryParserWorkerOnce(ctx context.Context) (bool, error) {
	task, claimed, err := claimNextVehicleModelTemplateGeometryParseTask()
	if err != nil || !claimed {
		return claimed, err
	}

	if err := ensureVehicleModelTemplateParseTaskSourceIsCurrent(task); err != nil {
		return true, finishVehicleModelTemplateGeometryParseTaskWithError(task, err)
	}

	_, parseErr := ParseVehicleModelTemplateGeometry(
		ctx,
		task.TemplateID,
		ParseVehicleModelTemplateGeometryRequest{
			ActorID:  task.ActorID,
			Operator: task.Operator,
			IP:       task.IP,
		},
	)
	if parseErr != nil {
		return true, finishVehicleModelTemplateGeometryParseTaskWithError(task, parseErr)
	}

	now := time.Now()
	if err := db.DB.Model(&models.LogisticsVehicleModelTemplateParseTask{}).
		Where("id = ? AND status = ?", task.ID, models.VehicleModelTemplateParseTaskStatusRunning).
		Updates(map[string]any{
			"status":      models.VehicleModelTemplateParseTaskStatusSucceeded,
			"finished_at": now,
			"last_error":  "",
		}).Error; err != nil {
		return true, err
	}
	return true, nil
}

func StartVehicleModelTemplateGeometryParserWorker(ctx context.Context) {
	go func() {
		runVehicleModelTemplateGeometryParserWorkerIteration(ctx)
		ticker := time.NewTicker(vehicleModelTemplateParseWorkerInterval)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				runVehicleModelTemplateGeometryParserWorkerIteration(ctx)
			}
		}
	}()
}

func runVehicleModelTemplateGeometryParserWorkerIteration(ctx context.Context) {
	processed, err := RunVehicleModelTemplateGeometryParserWorkerOnce(ctx)
	if err != nil {
		log.Printf("[WORKER][vehicle-model-template-geometry] processed=%t error=%v", processed, err)
	}
}

func claimNextVehicleModelTemplateGeometryParseTask() (
	models.LogisticsVehicleModelTemplateParseTask,
	bool,
	error,
) {
	if db.DB == nil {
		return models.LogisticsVehicleModelTemplateParseTask{}, false, errors.New("database is not initialized")
	}

	now := time.Now()
	var candidates []models.LogisticsVehicleModelTemplateParseTask
	if err := db.DB.
		Where(
			"status = ? AND next_attempt_at <= ? AND attempt_count < max_attempts",
			models.VehicleModelTemplateParseTaskStatusQueued,
			now,
		).
		Order("next_attempt_at asc, created_at asc").
		Limit(10).
		Find(&candidates).Error; err != nil {
		return models.LogisticsVehicleModelTemplateParseTask{}, false, err
	}

	for _, candidate := range candidates {
		startedAt := time.Now()
		result := db.DB.Model(&models.LogisticsVehicleModelTemplateParseTask{}).
			Where(
				"id = ? AND status = ? AND next_attempt_at <= ? AND attempt_count < max_attempts",
				candidate.ID,
				models.VehicleModelTemplateParseTaskStatusQueued,
				now,
			).
			Updates(map[string]any{
				"status":        models.VehicleModelTemplateParseTaskStatusRunning,
				"attempt_count": gorm.Expr("attempt_count + ?", 1),
				"started_at":    startedAt,
				"last_error":    "",
			})
		if result.Error != nil {
			return models.LogisticsVehicleModelTemplateParseTask{}, false, result.Error
		}
		if result.RowsAffected != 1 {
			continue
		}

		var claimed models.LogisticsVehicleModelTemplateParseTask
		if err := db.DB.First(&claimed, "id = ?", candidate.ID).Error; err != nil {
			return models.LogisticsVehicleModelTemplateParseTask{}, false, err
		}
		return claimed, true, nil
	}
	return models.LogisticsVehicleModelTemplateParseTask{}, false, nil
}

func ensureVehicleModelTemplateParseTaskSourceIsCurrent(
	task models.LogisticsVehicleModelTemplateParseTask,
) error {
	var template models.LogisticsVehicleModelTemplate
	if err := db.DB.First(&template, "id = ?", task.TemplateID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrVehicleModelTemplateNotFound
		}
		return err
	}
	if template.Version != task.TemplateVersion ||
		template.SourceAssetURL != task.SourceAssetURL ||
		template.SourceAssetName != task.SourceAssetName ||
		template.SourceFormat != task.SourceFormat {
		return ErrVehicleModelTemplateChangedDuringParse
	}
	return nil
}

func finishVehicleModelTemplateGeometryParseTaskWithError(
	task models.LogisticsVehicleModelTemplateParseTask,
	parseErr error,
) error {
	now := time.Now()
	status := models.VehicleModelTemplateParseTaskStatusQueued
	nextAttemptAt := now.Add(vehicleModelTemplateParseTaskRetryDelay * time.Duration(maxInt(task.AttemptCount, 1)))
	var finishedAt *time.Time
	if !isVehicleModelTemplateParseTaskRetryable(parseErr) || task.AttemptCount >= task.MaxAttempts {
		status = models.VehicleModelTemplateParseTaskStatusFailed
		nextAttemptAt = now
		finishedAt = &now
	}

	lastError := strings.TrimSpace(parseErr.Error())
	if lastError == "" {
		lastError = "unknown parser error"
	}
	if err := db.DB.Model(&models.LogisticsVehicleModelTemplateParseTask{}).
		Where("id = ? AND status = ?", task.ID, models.VehicleModelTemplateParseTaskStatusRunning).
		Updates(map[string]any{
			"status":          status,
			"next_attempt_at": nextAttemptAt,
			"finished_at":     finishedAt,
			"last_error":      lastError,
		}).Error; err != nil {
		return errors.Join(parseErr, err)
	}
	return parseErr
}

func isVehicleModelTemplateParseTaskRetryable(err error) bool {
	switch {
	case errors.Is(err, ErrVehicleModelTemplateChangedDuringParse),
		errors.Is(err, ErrVehicleModelTemplateNotFound),
		errors.Is(err, ErrVehicleModelTemplateSourceFormatInvalid):
		return false
	default:
		return true
	}
}

func mapVehicleModelTemplateGeometryParseTaskResponse(
	task models.LogisticsVehicleModelTemplateParseTask,
) VehicleModelTemplateGeometryParseTaskResponse {
	return VehicleModelTemplateGeometryParseTaskResponse{
		ID:              task.ID,
		TemplateID:      task.TemplateID,
		SourceAssetURL:  task.SourceAssetURL,
		SourceAssetName: task.SourceAssetName,
		SourceFormat:    task.SourceFormat,
		TemplateVersion: task.TemplateVersion,
		Status:          task.Status,
		AttemptCount:    task.AttemptCount,
		MaxAttempts:     task.MaxAttempts,
		NextAttemptAt:   task.NextAttemptAt,
		StartedAt:       task.StartedAt,
		FinishedAt:      task.FinishedAt,
		LastError:       task.LastError,
		CreatedAt:       task.CreatedAt,
		UpdatedAt:       task.UpdatedAt,
	}
}

func maxInt(left, right int) int {
	if left > right {
		return left
	}
	return right
}
