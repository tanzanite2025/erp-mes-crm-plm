package services

import (
	"context"
	"encoding/json"
	"errors"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"reflect"
	"strings"
	"time"
	"xdfc-server/audit"
	"xdfc-server/models"
)

// A retry after a lost response returns the original immutable result. Reusing
// the key with different measurements or another actor is rejected.
func restorePreviouslySubmittedQualityInspectionWithinTransaction(ctx context.Context, tx *gorm.DB, task *models.InspectionTask) (bool, error) {
	if task.SubmissionKey == nil {
		return false, nil
	}
	parsedSubmissionKey, err := uuid.Parse(*task.SubmissionKey)
	if err != nil {
		return false, domainValidationError("实测提交标识无效")
	}
	canonicalSubmissionKey := parsedSubmissionKey.String()
	task.SubmissionKey = &canonicalSubmissionKey
	// Serialize concurrent retries before checking the unique submission key.
	if tx.Dialector.Name() == "postgres" {
		if err := tx.Exec("SELECT pg_advisory_xact_lock(hashtextextended(?, 0))", *task.SubmissionKey).Error; err != nil {
			return false, err
		}
	}
	var existing models.InspectionTask
	err = tx.Where("submission_key = ?", *task.SubmissionKey).First(&existing).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	actor, _ := audit.ActorFromContext(ctx)
	inspector := actor.Username
	if inspector == "" {
		inspector = actor.UserID
	}
	var requestedInput, storedInput qualityInspectionMeasurementInput
	requestedError := json.Unmarshal(task.InputData, &requestedInput)
	storedError := json.Unmarshal(existing.InputData, &storedInput)
	if requestedError != nil || storedError != nil || existing.Inspector != inspector ||
		(task.ID != "" && task.ID != existing.ID) || task.StandardID != existing.StandardID ||
		task.StandardVersion != existing.StandardVersion || task.ProductID != existing.ProductID ||
		task.BatchNo != existing.BatchNo || task.Remarks != existing.Remarks ||
		!reflect.DeepEqual(requestedInput, storedInput) {
		return false, domainValidationError("该提交标识已用于其他实测内容，请查看原记录或重新建立检测")
	}
	*task = existing
	return true, nil
}

func prepareAndEvaluateInspectionTaskWithinTransaction(ctx context.Context, tx *gorm.DB, task *models.InspectionTask) error {
	requested := *task
	if task.ID != "" {
		var existing models.InspectionTask
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&existing, "id = ?", task.ID).Error; err != nil {
			return err
		}
		if existing.SourceType == QualityInspectionTaskSourceProductionOutsource {
			return domainValidationError("委外品质任务必须通过委外收发检验入口判定")
		}
		if existing.Status == QualityInspectionTaskStatusCompleted || existing.Status == QualityInspectionTaskStatusCancelled || existing.Result != "" && existing.Result != "PENDING" {
			return domainValidationError("已完成或取消的检验任务不能覆盖，请建立复检任务")
		}
		actor, _ := audit.ActorFromContext(ctx)
		if existing.Status == QualityInspectionTaskStatusClaimed && existing.ClaimedBy != actor.Username && existing.ClaimedBy != actor.UserID {
			return ErrQualityInspectionTaskClaimed
		}
		if requested.ProductID != "" && requested.ProductID != existing.ProductID || requested.StandardID != "" && existing.StandardID != "" && requested.StandardID != existing.StandardID {
			return domainValidationError("不能更改任务关联的产品或标准")
		}
		*task = existing
		task.InputData, task.Remarks = requested.InputData, requested.Remarks
		task.SubmissionKey = requested.SubmissionKey
		if task.StandardID == "" {
			task.StandardID = requested.StandardID
		}
	} else {
		if requested.SourceType != "" || requested.SourceID != "" || requested.SourceLineID != "" {
			return domainValidationError("来源任务必须通过对应业务入口创建")
		}
		task.Status = QualityInspectionTaskStatusOpen
		// Manual measurements cannot invent production/order linkage or claims.
		if task.ProductionPlanID != "" || task.OrderID != "" || task.ProductBarcode != "" || task.ClaimedBy != "" || task.ClaimedAt != nil {
			return domainValidationError("生产关联及领取信息必须通过来源任务建立")
		}
	}
	if strings.TrimSpace(task.StandardID) == "" || strings.TrimSpace(task.ProductID) == "" || strings.TrimSpace(task.BatchNo) == "" {
		return domainValidationError("检验任务必须关联产品、批次和已发布标准")
	}
	var standard models.InspectionStandard
	if err := tx.Clauses(clause.Locking{Strength: "SHARE"}).First(&standard, "id = ?", task.StandardID).Error; err != nil {
		return err
	}
	if standard.Status != "PUBLISHED" || standard.ProductID == "" || standard.ProductID != task.ProductID {
		return domainValidationError("标准必须已发布且与任务产品一致")
	}
	task.ProductName = standard.ProductName
	result, evaluation, err := evaluateQualityInspectionMeasurements(standard.Items, task.InputData)
	if requested.StandardVersion != standard.Version {
		return domainValidationError("标准版本已变化，请重新加载标准后核对实测值")
	}
	if err != nil {
		return err
	}
	var input qualityInspectionMeasurementInput
	if err := json.Unmarshal(task.InputData, &input); err != nil {
		return err
	}
	task.InputData, err = json.Marshal(input)
	if err != nil {
		return err
	}
	snapshot, err := json.Marshal(map[string]any{"id": standard.ID, "code": standard.Code, "name": standard.Name, "version": standard.Version, "productId": standard.ProductID, "publishedAt": standard.PublishedAt, "items": standard.Items})
	if err != nil {
		return err
	}
	task.StandardVersion, task.StandardSnapshot, task.EvaluationData = standard.Version, snapshot, evaluation
	task.Result, task.Status = result, QualityInspectionTaskStatusCompleted
	actor, _ := audit.ActorFromContext(ctx)
	task.Inspector = actor.Username
	if task.Inspector == "" {
		task.Inspector = actor.UserID
	}
	now := time.Now().UTC()
	task.CompletedAt = &now
	return nil
}
