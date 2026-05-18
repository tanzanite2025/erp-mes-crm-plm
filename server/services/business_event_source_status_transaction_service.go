// Package services - 业务事件源状态字段重命名的事务化迁移。
//
// 当用户重命名一个状态字段(如 "已审核" → "通过")时,所有引用此状态的下游配置
// (审批规则的状态过滤、通知规则的触发条件、派生动作等)都必须同步迁移,
// 否则下游配置会指向不存在的状态码,造成静默故障。
//
// 本服务提供事务化的状态重命名:
//   - validateBusinessEventStatusRenameTransactionRequest  入参校验
//   - buildBusinessEventStatusRenameDraftsForTransaction   计算迁移草稿(预览影响范围)
//   - analyzeBusinessEventStatusTransactionRules           分析受影响的下游规则
//   - migrateBusinessEventStatusRuleSegments               实际迁移规则字段
//   - CommitBusinessEventStatusRenameTransaction           最终提交(单事务)
//
// 关键不变量:
//   - 重命名后,旧状态码不再可用(强一致),新状态码替代
//   - 迁移过程中如果发现规则会因迁移变得无效(equalStringSlices/equalApprovalDTO 等价比较失败),报错回滚
//   - 派生动作 ID(buildBusinessEventStatusDerivedApprovalAction)随状态码变化同步更新
package services

import (
	"errors"
	"fmt"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var (
	ErrBusinessEventStatusTransactionConflict    = errors.New("business event status transaction conflict")
	ErrBusinessEventStatusTransactionBlocked     = errors.New("business event status transaction blocked")
	ErrBusinessEventStatusTransactionUnsupported = errors.New("business event status transaction unsupported")
)

type BusinessEventStatusTransactionStatusRequest struct {
	ID    string `json:"id"`
	Order int    `json:"order"`
	Code  string `json:"code"`
}

type BusinessEventStatusTransactionAffectedRuleRequest struct {
	RuleID          string `json:"ruleId"`
	ExpectedVersion int    `json:"expectedVersion"`
}

type BusinessEventStatusRenameTransactionRequest struct {
	ExpectedUpdatedAt string                                              `json:"expectedUpdatedAt"`
	Statuses          []BusinessEventStatusTransactionStatusRequest       `json:"statuses"`
	AffectedRules     []BusinessEventStatusTransactionAffectedRuleRequest `json:"affectedRules"`
}

type BusinessEventStatusRenameTransactionSummary struct {
	RenamedStatusCount         int `json:"renamedStatusCount"`
	AffectedRuleCount          int `json:"affectedRuleCount"`
	TargetSegmentCount         int `json:"targetSegmentCount"`
	ResolveSegmentCount        int `json:"resolveSegmentCount"`
	DerivedApprovalActionCount int `json:"derivedApprovalActionCount"`
}

type BusinessEventStatusRenameTransactionResponse struct {
	EventSource BusinessEventSourceResponse                 `json:"eventSource"`
	Rules       []NotificationRuleResponse                  `json:"rules"`
	Summary     BusinessEventStatusRenameTransactionSummary `json:"summary"`
}

type businessEventStatusRenameDraft struct {
	StatusID string
	OldCode  string
	NextCode string
}

type businessEventStatusRuleAnalysis struct {
	AffectedRuleIDs            []string
	TargetSegmentCount         int
	ResolveSegmentCount        int
	DerivedApprovalActionCount int
}

func buildBusinessEventStatusDerivedApprovalAction(sourceCode string, statusCode string) string {
	return fmt.Sprintf("%s_%s_APPROVAL", sourceCode, statusCode)
}

func normalizeBusinessEventStatusRenameTransactionRequest(
	input BusinessEventStatusRenameTransactionRequest,
) BusinessEventStatusRenameTransactionRequest {
	input.ExpectedUpdatedAt = strings.TrimSpace(input.ExpectedUpdatedAt)
	if input.Statuses == nil {
		input.Statuses = []BusinessEventStatusTransactionStatusRequest{}
	}
	if input.AffectedRules == nil {
		input.AffectedRules = []BusinessEventStatusTransactionAffectedRuleRequest{}
	}
	for index := range input.Statuses {
		input.Statuses[index].ID = strings.TrimSpace(input.Statuses[index].ID)
		input.Statuses[index].Code = strings.TrimSpace(input.Statuses[index].Code)
	}
	for index := range input.AffectedRules {
		input.AffectedRules[index].RuleID = strings.TrimSpace(input.AffectedRules[index].RuleID)
	}
	return input
}

func validateBusinessEventStatusRenameTransactionRequest(
	input BusinessEventStatusRenameTransactionRequest,
) error {
	if len(input.Statuses) == 0 {
		return fmt.Errorf("statuses is required")
	}
	statusIDs := make(map[string]struct{}, len(input.Statuses))
	for index, status := range input.Statuses {
		if status.ID == "" {
			return fmt.Errorf("statuses[%d].id is required", index)
		}
		if status.Code == "" {
			return fmt.Errorf("statuses[%d].code is required", index)
		}
		if status.Order != index {
			return fmt.Errorf("statuses[%d].order must equal %d", index, index)
		}
		if _, exists := statusIDs[status.ID]; exists {
			return fmt.Errorf("statuses[%d].id duplicated: %s", index, status.ID)
		}
		statusIDs[status.ID] = struct{}{}
	}

	ruleIDs := make(map[string]struct{}, len(input.AffectedRules))
	for index, rule := range input.AffectedRules {
		if rule.RuleID == "" {
			return fmt.Errorf("affectedRules[%d].ruleId is required", index)
		}
		if rule.ExpectedVersion <= 0 {
			return fmt.Errorf("affectedRules[%d].expectedVersion must be positive", index)
		}
		if _, exists := ruleIDs[rule.RuleID]; exists {
			return fmt.Errorf("affectedRules[%d].ruleId duplicated: %s", index, rule.RuleID)
		}
		ruleIDs[rule.RuleID] = struct{}{}
	}

	return nil
}

func buildBusinessEventStatusRenameDraftsForTransaction(
	existingConfig BusinessEventSourceStoredConfigDTO,
	nextStatuses []BusinessEventStatusTransactionStatusRequest,
) ([]BusinessStatusStoredDTO, []businessEventStatusRenameDraft, error) {
	if len(existingConfig.Statuses) != len(nextStatuses) {
		return nil, nil, fmt.Errorf(
			"%w: status rename transaction cannot add or delete persisted statuses",
			ErrBusinessEventStatusTransactionUnsupported,
		)
	}

	existingByID := make(map[string]BusinessStatusStoredDTO, len(existingConfig.Statuses))
	for _, status := range existingConfig.Statuses {
		existingByID[status.ID] = status
	}

	nextConfigStatuses := make([]BusinessStatusStoredDTO, 0, len(nextStatuses))
	renameDrafts := make([]businessEventStatusRenameDraft, 0)
	seenStatusIDs := make(map[string]struct{}, len(nextStatuses))
	seenNextCodes := make(map[string]struct{}, len(nextStatuses))
	for index, nextStatus := range nextStatuses {
		existingStatus, ok := existingByID[nextStatus.ID]
		if !ok {
			return nil, nil, fmt.Errorf(
				"%w: status %s is not persisted on current event source",
				ErrBusinessEventStatusTransactionUnsupported,
				nextStatus.ID,
			)
		}
		if _, exists := seenStatusIDs[nextStatus.ID]; exists {
			return nil, nil, fmt.Errorf("status %s duplicated", nextStatus.ID)
		}
		seenStatusIDs[nextStatus.ID] = struct{}{}
		if _, exists := seenNextCodes[nextStatus.Code]; exists {
			return nil, nil, fmt.Errorf(
				"%w: duplicate target status code %s",
				ErrBusinessEventStatusTransactionBlocked,
				nextStatus.Code,
			)
		}
		seenNextCodes[nextStatus.Code] = struct{}{}

		nextConfigStatus := existingStatus
		nextConfigStatus.Order = index
		nextConfigStatus.Code = nextStatus.Code
		nextConfigStatuses = append(nextConfigStatuses, nextConfigStatus)
		if existingStatus.Code != nextStatus.Code {
			renameDrafts = append(renameDrafts, businessEventStatusRenameDraft{
				StatusID: existingStatus.ID,
				OldCode:  existingStatus.Code,
				NextCode: nextStatus.Code,
			})
		}
	}

	if len(renameDrafts) == 0 {
		return nil, nil, fmt.Errorf(
			"%w: no persisted status rename detected",
			ErrBusinessEventStatusTransactionUnsupported,
		)
	}

	return nextConfigStatuses, renameDrafts, nil
}

func validateBusinessEventStatusRenameDrafts(
	renameDrafts []businessEventStatusRenameDraft,
) error {
	nextCodeToOldCodes := make(map[string][]string)
	renames := make(map[string]string, len(renameDrafts))
	for _, draft := range renameDrafts {
		renames[draft.OldCode] = draft.NextCode
		nextCodeToOldCodes[draft.NextCode] = append(nextCodeToOldCodes[draft.NextCode], draft.OldCode)
	}
	for nextCode, oldCodes := range nextCodeToOldCodes {
		if len(oldCodes) > 1 {
			return fmt.Errorf(
				"%w: merge rename %s -> %s",
				ErrBusinessEventStatusTransactionBlocked,
				strings.Join(oldCodes, ","),
				nextCode,
			)
		}
	}

	visited := make(map[string]bool, len(renameDrafts))
	for oldCode := range renames {
		if visited[oldCode] {
			continue
		}
		path := make([]string, 0)
		indexByCode := make(map[string]int)
		current := oldCode
		for {
			nextCode, ok := renames[current]
			if !ok {
				break
			}
			if position, exists := indexByCode[current]; exists {
				cycle := path[position:]
				if len(cycle) > 2 {
					return fmt.Errorf(
						"%w: rename cycle %s",
						ErrBusinessEventStatusTransactionBlocked,
						strings.Join(cycle, " -> "),
					)
				}
				break
			}
			indexByCode[current] = len(path)
			path = append(path, current)
			visited[current] = true
			if _, tracked := renames[nextCode]; !tracked {
				break
			}
			current = nextCode
		}
	}

	return nil
}

func analyzeBusinessEventStatusTransactionRules(
	sourceCode string,
	rules []models.NotificationRule,
	renameDrafts []businessEventStatusRenameDraft,
) (businessEventStatusRuleAnalysis, error) {
	analysis := businessEventStatusRuleAnalysis{
		AffectedRuleIDs: make([]string, 0),
	}
	derivedApprovalActions := make(map[string]string, len(renameDrafts))
	for _, draft := range renameDrafts {
		derivedApprovalActions[draft.OldCode] = buildBusinessEventStatusDerivedApprovalAction(sourceCode, draft.OldCode)
	}

	for _, rule := range rules {
		segments, err := unmarshalNotificationRuleSegments(rule.Segments)
		if err != nil {
			return businessEventStatusRuleAnalysis{}, err
		}
		ruleAffected := false
		for _, segment := range segments {
			for _, draft := range renameDrafts {
				targetsOldCode := stringSliceContains(segment.TargetStatuses, draft.OldCode)
				resolvesOldCode := stringSliceContains(segment.ResolveOnStatuses, draft.OldCode)
				if targetsOldCode {
					analysis.TargetSegmentCount += 1
					ruleAffected = true
					configuredAction := ""
					if segment.Approval != nil {
						configuredAction = strings.TrimSpace(segment.Approval.Action)
					}
					if configuredAction != "" {
						if configuredAction == derivedApprovalActions[draft.OldCode] {
							analysis.DerivedApprovalActionCount += 1
						} else {
							return businessEventStatusRuleAnalysis{}, fmt.Errorf(
								"%w: rule %s segment %s uses custom approval action %s",
								ErrBusinessEventStatusTransactionBlocked,
								rule.Name,
								segment.Title,
								configuredAction,
							)
						}
					}
				}
				if resolvesOldCode {
					analysis.ResolveSegmentCount += 1
					ruleAffected = true
				}
			}
		}
		if ruleAffected {
			analysis.AffectedRuleIDs = append(analysis.AffectedRuleIDs, rule.ID)
		}
	}

	return analysis, nil
}

func validateBusinessEventStatusTransactionAffectedRules(
	actualRuleIDs []string,
	expectedRules []BusinessEventStatusTransactionAffectedRuleRequest,
) (map[string]int, error) {
	expectedVersions := make(map[string]int, len(expectedRules))
	for _, expectedRule := range expectedRules {
		expectedVersions[expectedRule.RuleID] = expectedRule.ExpectedVersion
	}
	if len(actualRuleIDs) != len(expectedVersions) {
		return nil, fmt.Errorf(
			"%w: affected rules mismatch between client and server",
			ErrBusinessEventStatusTransactionConflict,
		)
	}
	for _, ruleID := range actualRuleIDs {
		if _, ok := expectedVersions[ruleID]; !ok {
			return nil, fmt.Errorf(
				"%w: affected rule %s missing expected version",
				ErrBusinessEventStatusTransactionConflict,
				ruleID,
			)
		}
	}
	return expectedVersions, nil
}

func stringSliceContains(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

func replaceBusinessEventStatusCodes(values []string, renames map[string]string) []string {
	result := make([]string, 0, len(values))
	seen := make(map[string]struct{}, len(values))
	for _, value := range values {
		nextValue := value
		if mapped, ok := renames[value]; ok {
			nextValue = mapped
		}
		if _, exists := seen[nextValue]; exists {
			continue
		}
		seen[nextValue] = struct{}{}
		result = append(result, nextValue)
	}
	return result
}

func migrateBusinessEventStatusRuleSegments(
	sourceCode string,
	segments []RuleSegmentDTO,
	renames map[string]string,
) ([]RuleSegmentDTO, bool) {
	nextSegments := make([]RuleSegmentDTO, 0, len(segments))
	changed := false
	for _, segment := range segments {
		nextSegment := segment
		nextSegment.TargetStatuses = replaceBusinessEventStatusCodes(segment.TargetStatuses, renames)
		nextSegment.ResolveOnStatuses = replaceBusinessEventStatusCodes(segment.ResolveOnStatuses, renames)
		if segment.Approval != nil {
			nextApproval := *segment.Approval
			for oldCode, nextCode := range renames {
				oldDerivedAction := buildBusinessEventStatusDerivedApprovalAction(sourceCode, oldCode)
				nextDerivedAction := buildBusinessEventStatusDerivedApprovalAction(sourceCode, nextCode)
				if stringSliceContains(segment.TargetStatuses, oldCode) && nextApproval.Action == oldDerivedAction {
					nextApproval.Action = nextDerivedAction
				}
			}
			nextSegment.Approval = &nextApproval
		}
		if !changed && (!equalStringSlices(nextSegment.TargetStatuses, segment.TargetStatuses) || !equalStringSlices(nextSegment.ResolveOnStatuses, segment.ResolveOnStatuses) || !equalApprovalDTO(nextSegment.Approval, segment.Approval)) {
			changed = true
		}
		nextSegments = append(nextSegments, nextSegment)
	}
	return nextSegments, changed
}

func equalStringSlices(left []string, right []string) bool {
	if len(left) != len(right) {
		return false
	}
	for index := range left {
		if left[index] != right[index] {
			return false
		}
	}
	return true
}

func equalApprovalDTO(left *NotificationRuleApprovalDTO, right *NotificationRuleApprovalDTO) bool {
	if left == nil || right == nil {
		return left == nil && right == nil
	}
	leftDynamic := ""
	rightDynamic := ""
	if left.DynamicApproverField != nil {
		leftDynamic = *left.DynamicApproverField
	}
	if right.DynamicApproverField != nil {
		rightDynamic = *right.DynamicApproverField
	}
	return left.Enabled == right.Enabled &&
		left.Module == right.Module &&
		left.Action == right.Action &&
		left.Approver1ID == right.Approver1ID &&
		left.Approver2ID == right.Approver2ID &&
		leftDynamic == rightDynamic &&
		left.ReasonTemplate == right.ReasonTemplate
}

func CommitBusinessEventStatusRenameTransaction(
	id string,
	input BusinessEventStatusRenameTransactionRequest,
) (BusinessEventStatusRenameTransactionResponse, error) {
	id = strings.TrimSpace(id)
	normalized := normalizeBusinessEventStatusRenameTransactionRequest(input)
	if err := validateBusinessEventStatusRenameTransactionRequest(normalized); err != nil {
		return BusinessEventStatusRenameTransactionResponse{}, err
	}

	var updatedSource models.BusinessEventSource
	updatedRules := make([]models.NotificationRule, 0)
	summary := BusinessEventStatusRenameTransactionSummary{}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var existingSource models.BusinessEventSource
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ?", id).First(&existingSource).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrBusinessEventSourceNotFound
			}
			return err
		}

		if normalized.ExpectedUpdatedAt != "" {
			expectedUpdatedAt, err := time.Parse(time.RFC3339, normalized.ExpectedUpdatedAt)
			if err != nil {
				parsedNano, nanoErr := time.Parse(time.RFC3339Nano, normalized.ExpectedUpdatedAt)
				if nanoErr != nil {
					return fmt.Errorf("expectedUpdatedAt is invalid: %w", err)
				}
				expectedUpdatedAt = parsedNano
			}
			if !existingSource.UpdatedAt.Equal(expectedUpdatedAt) {
				return fmt.Errorf(
					"%w: event source has been modified by another request",
					ErrBusinessEventStatusTransactionConflict,
				)
			}
		}

		existingConfig, err := unmarshalBusinessEventSourceStoredConfig(existingSource.Config)
		if err != nil {
			return err
		}
		nextStatuses, renameDrafts, err := buildBusinessEventStatusRenameDraftsForTransaction(
			existingConfig,
			normalized.Statuses,
		)
		if err != nil {
			return err
		}
		if err := validateBusinessEventStatusRenameDrafts(renameDrafts); err != nil {
			return err
		}

		var sourceRules []models.NotificationRule
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("source_code = ?", existingSource.Code).Order("created_at desc").Find(&sourceRules).Error; err != nil {
			return err
		}
		ruleAnalysis, err := analyzeBusinessEventStatusTransactionRules(existingSource.Code, sourceRules, renameDrafts)
		if err != nil {
			return err
		}
		expectedRuleVersions, err := validateBusinessEventStatusTransactionAffectedRules(
			ruleAnalysis.AffectedRuleIDs,
			normalized.AffectedRules,
		)
		if err != nil {
			return err
		}

		nextConfig := existingConfig
		nextConfig.Statuses = nextStatuses
		nextConfigRaw, err := marshalBusinessEventSourceStoredConfig(nextConfig)
		if err != nil {
			return err
		}
		nextSource := existingSource
		nextSource.Config = nextConfigRaw

		renames := make(map[string]string, len(renameDrafts))
		for _, draft := range renameDrafts {
			renames[draft.OldCode] = draft.NextCode
		}

		for _, rule := range sourceRules {
			expectedVersion, affected := expectedRuleVersions[rule.ID]
			if !affected {
				continue
			}
			if rule.Version != expectedVersion {
				return fmt.Errorf(
					"%w: rule %s version mismatch",
					ErrBusinessEventStatusTransactionConflict,
					rule.ID,
				)
			}
			segments, err := unmarshalNotificationRuleSegments(rule.Segments)
			if err != nil {
				return err
			}
			nextSegments, changed := migrateBusinessEventStatusRuleSegments(
				existingSource.Code,
				segments,
				renames,
			)
			if !changed {
				continue
			}
			nextSegmentsRaw, err := marshalNotificationRuleSegments(nextSegments)
			if err != nil {
				return err
			}
			nextRule := rule
			nextRule.Segments = nextSegmentsRaw
			nextRule.Version = rule.Version + 1
			if err := validateNotificationRuleReferencesWithDB(tx, nextRule, nextSource); err != nil {
				return err
			}
			if err := tx.Model(&rule).Updates(map[string]interface{}{
				"segments": nextSegmentsRaw,
				"version":  nextRule.Version,
			}).Error; err != nil {
				return err
			}
			var savedRule models.NotificationRule
			if err := tx.First(&savedRule, "id = ?", rule.ID).Error; err != nil {
				return err
			}
			updatedRules = append(updatedRules, savedRule)
		}

		if err := tx.Model(&existingSource).Updates(map[string]interface{}{
			"config": nextConfigRaw,
		}).Error; err != nil {
			return err
		}
		if err := tx.First(&updatedSource, "id = ?", existingSource.ID).Error; err != nil {
			return err
		}

		summary = BusinessEventStatusRenameTransactionSummary{
			RenamedStatusCount:         len(renameDrafts),
			AffectedRuleCount:          len(ruleAnalysis.AffectedRuleIDs),
			TargetSegmentCount:         ruleAnalysis.TargetSegmentCount,
			ResolveSegmentCount:        ruleAnalysis.ResolveSegmentCount,
			DerivedApprovalActionCount: ruleAnalysis.DerivedApprovalActionCount,
		}
		return nil
	})
	if err != nil {
		return BusinessEventStatusRenameTransactionResponse{}, err
	}

	eventSourceResponse, err := MapBusinessEventSourceToResponse(updatedSource)
	if err != nil {
		return BusinessEventStatusRenameTransactionResponse{}, err
	}
	ruleResponses, err := MapNotificationRulesToResponse(updatedRules)
	if err != nil {
		return BusinessEventStatusRenameTransactionResponse{}, err
	}

	return BusinessEventStatusRenameTransactionResponse{
		EventSource: eventSourceResponse,
		Rules:       ruleResponses,
		Summary:     summary,
	}, nil
}
