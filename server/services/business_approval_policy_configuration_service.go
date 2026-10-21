package services

import (
	"context"
	"errors"
	"strings"
	"time"
	"xdfc-server/audit"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type BusinessApprovalPolicyConfigurationDefinition struct {
	BusinessType          string `json:"businessType"`
	BusinessName          string `json:"businessName"`
	SubmissionDescription string `json:"submissionDescription"`
}

type BusinessApprovalPolicyConfigurationResponse struct {
	BusinessApprovalPolicyConfigurationDefinition
	Enabled     bool       `json:"enabled"`
	Approver1ID string     `json:"approver1Id"`
	Approver2ID string     `json:"approver2Id"`
	Version     int        `json:"version"`
	UpdatedAt   *time.Time `json:"updatedAt"`
}

type BusinessApprovalPolicyConfigurationWriteInput struct {
	Enabled     bool   `json:"enabled"`
	Approver1ID string `json:"approver1Id"`
	Approver2ID string `json:"approver2Id"`
	Version     int    `json:"version"`
}

func findBusinessApprovalPolicyConfigurationDefinition(businessType string) (BusinessApprovalPolicyConfigurationDefinition, error) {
	for _, definition := range listSupportedBusinessApprovalPolicyConfigurationDefinitions() {
		if definition.BusinessType == businessType {
			return definition, nil
		}
	}
	return BusinessApprovalPolicyConfigurationDefinition{}, domainValidationError("该业务尚未接入独立审批配置")
}

func mapBusinessApprovalPolicyConfigurationResponse(definition BusinessApprovalPolicyConfigurationDefinition, policy models.BusinessApprovalPolicyConfiguration) BusinessApprovalPolicyConfigurationResponse {
	response := BusinessApprovalPolicyConfigurationResponse{BusinessApprovalPolicyConfigurationDefinition: definition,
		Enabled: policy.Enabled, Approver1ID: policy.Approver1ID, Approver2ID: policy.Approver2ID, Version: policy.Version}
	if !policy.UpdatedAt.IsZero() {
		response.UpdatedAt = &policy.UpdatedAt
	}
	return response
}

func ListBusinessApprovalPolicyConfigurations(ctx context.Context) ([]BusinessApprovalPolicyConfigurationResponse, error) {
	var policies []models.BusinessApprovalPolicyConfiguration
	if err := db.DB.WithContext(ctx).Find(&policies).Error; err != nil {
		return nil, err
	}
	byType := make(map[string]models.BusinessApprovalPolicyConfiguration, len(policies))
	for _, policy := range policies {
		byType[policy.BusinessType] = policy
	}
	responses := make([]BusinessApprovalPolicyConfigurationResponse, 0)
	for _, definition := range listSupportedBusinessApprovalPolicyConfigurationDefinitions() {
		responses = append(responses, mapBusinessApprovalPolicyConfigurationResponse(definition, byType[definition.BusinessType]))
	}
	return responses, nil
}

func validateBusinessApprovalPolicyApproversWithinTransaction(tx *gorm.DB, primary, secondary string, enabled bool) error {
	if enabled && primary == "" {
		return domainValidationError("请配置一级审批人后再启用审批链")
	}
	if secondary != "" && primary == "" {
		return domainValidationError("配置二级审批人前必须先配置一级审批人")
	}
	if primary != "" && primary == secondary {
		return domainValidationError("一级和二级审批人不能是同一账号")
	}
	for _, userID := range []string{primary, secondary} {
		if userID == "" {
			continue
		}
		if _, err := uuid.Parse(userID); err != nil {
			return domainValidationError("审批账号标识无效")
		}
		if !enabled {
			continue
		}
		var user models.User
		err := tx.Clauses(clause.Locking{Strength: "SHARE"}).Where("id = ? AND status = ?", userID, "active").First(&user).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return domainValidationError("审批人不存在或已停用")
		}
		if err != nil {
			return err
		}
	}
	return nil
}

func SaveBusinessApprovalPolicyConfiguration(ctx context.Context, businessType string, input BusinessApprovalPolicyConfigurationWriteInput) (BusinessApprovalPolicyConfigurationResponse, error) {
	definition, err := findBusinessApprovalPolicyConfigurationDefinition(businessType)
	if err != nil {
		return BusinessApprovalPolicyConfigurationResponse{}, err
	}
	if input.Version < 0 {
		return BusinessApprovalPolicyConfigurationResponse{}, domainValidationError("审批配置版本无效")
	}
	input.Approver1ID, input.Approver2ID = strings.TrimSpace(input.Approver1ID), strings.TrimSpace(input.Approver2ID)
	var saved models.BusinessApprovalPolicyConfiguration
	err = db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var existing models.BusinessApprovalPolicyConfiguration
		loadErr := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("business_type = ?", businessType).First(&existing).Error
		if loadErr != nil && !errors.Is(loadErr, gorm.ErrRecordNotFound) {
			return loadErr
		}
		if existing.Version != input.Version {
			return domainConflictError("审批配置已变更，请刷新后重新编辑")
		}
		if err := validateBusinessApprovalPolicyApproversWithinTransaction(tx, input.Approver1ID, input.Approver2ID, input.Enabled); err != nil {
			return err
		}
		actor, _ := audit.ActorFromContext(ctx)
		if actor.UserID == "" {
			return domainValidationError("审批配置操作者身份缺失")
		}
		saved = models.BusinessApprovalPolicyConfiguration{BaseModel: existing.BaseModel, BusinessType: businessType,
			Enabled: input.Enabled, Approver1ID: input.Approver1ID, Approver2ID: input.Approver2ID, Version: input.Version + 1, UpdatedBy: actor.UserID}
		if errors.Is(loadErr, gorm.ErrRecordNotFound) {
			saved.ID = uuid.NewString()
			result := tx.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "business_type"}}, DoNothing: true}).Create(&saved)
			if result.Error != nil {
				return result.Error
			}
			if result.RowsAffected != 1 {
				return domainConflictError("审批配置已被其他管理员创建，请刷新后重新编辑")
			}
		} else if err := tx.Model(&saved).Select("Enabled", "Approver1ID", "Approver2ID", "Version", "UpdatedBy", "UpdatedAt").Updates(&saved).Error; err != nil {
			return err
		}
		return recordLegacyAuditEntryWithContext(ctx, tx, "BusinessApprovalPolicyConfiguration", saved.ID, "configure", mustJSONRawMessage(map[string]any{"businessType": businessType, "previousVersion": input.Version, "version": saved.Version, "enabled": saved.Enabled, "approver1Id": saved.Approver1ID, "approver2Id": saved.Approver2ID}))
	})
	if err != nil {
		return BusinessApprovalPolicyConfigurationResponse{}, err
	}
	return mapBusinessApprovalPolicyConfigurationResponse(definition, saved), nil
}
