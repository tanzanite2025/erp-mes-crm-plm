package services

import (
	"context"
	"encoding/json"
	"errors"
	"slices"
	"strings"
	"unicode/utf8"
	"xdfc-server/audit"
	"xdfc-server/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type SaveQualityDefectTypeRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	SortOrder   int    `json:"sortOrder"`
	Active      *bool  `json:"active"`
	Version     int64  `json:"version"`
}

type QualityInspectionStageDefectTypeBindings struct {
	InspectionStageID string   `json:"inspectionStageId"`
	DefectTypeIDs     []string `json:"defectTypeIds"`
	Version           int64    `json:"version"`
}

type ReplaceQualityInspectionStageDefectTypeBindingsRequest struct {
	DefectTypeIDs *[]string `json:"defectTypeIds"`
	Version       int64     `json:"version"`
}

func ListQualityDefectTypes() ([]models.QualityDefectType, error) {
	return defaultQualityService.ListQualityDefectTypes()
}

func SaveQualityDefectType(ctx context.Context, id string, input SaveQualityDefectTypeRequest) (models.QualityDefectType, error) {
	return defaultQualityService.SaveQualityDefectType(ctx, id, input)
}

func GetQualityInspectionStageDefectTypeBindings(id string) (QualityInspectionStageDefectTypeBindings, error) {
	return defaultQualityService.GetQualityInspectionStageDefectTypeBindings(id)
}

func ReplaceQualityInspectionStageDefectTypeBindings(ctx context.Context, id string, input ReplaceQualityInspectionStageDefectTypeBindingsRequest) (QualityInspectionStageDefectTypeBindings, error) {
	return defaultQualityService.ReplaceQualityInspectionStageDefectTypeBindings(ctx, id, input)
}

func (s *QualityService) ListQualityDefectTypes() ([]models.QualityDefectType, error) {
	defectTypes := make([]models.QualityDefectType, 0)
	err := s.txManager.DB().Order("sort_order ASC, code ASC").Find(&defectTypes).Error
	return defectTypes, err
}

func (s *QualityService) SaveQualityDefectType(ctx context.Context, id string, input SaveQualityDefectTypeRequest) (models.QualityDefectType, error) {
	name := strings.Join(strings.Fields(input.Name), " ")
	if name == "" || utf8.RuneCountInString(name) > 100 || utf8.RuneCountInString(input.Description) > 2000 || input.SortOrder < 0 || input.SortOrder > 1000000 || input.Active == nil {
		return models.QualityDefectType{}, domainValidationError("请填写 1 到 100 字的异常点名称、最多 2000 字的说明、有效的顺序和启用状态")
	}
	if id != "" {
		parsedID, err := uuid.Parse(id)
		if err != nil {
			return models.QualityDefectType{}, domainValidationError("异常点 ID 无效")
		}
		id = parsedID.String()
	}
	var saved models.QualityDefectType
	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		if id == "" {
			saved = models.QualityDefectType{BaseModel: models.BaseModel{ID: uuid.NewString()}, Code: "QDT-" + uuid.NewString(), Version: 1}
		} else {
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&saved, "id = ?", id).Error; errors.Is(err, gorm.ErrRecordNotFound) {
				return domainNotFoundError("异常点不存在")
			} else if err != nil {
				return err
			}
			if input.Version != saved.Version {
				return domainConflictError("异常点已被修改，请重新加载后编辑；当前输入未保存")
			}
			saved.Version++
		}
		saved.Name, saved.NormalizedName = name, strings.ToLower(name)
		saved.Description, saved.SortOrder, saved.Active = strings.TrimSpace(input.Description), input.SortOrder, *input.Active
		if id == "" {
			if err := tx.Create(&saved).Error; err != nil {
				return err
			}
		} else if err := tx.Model(&saved).Select("Name", "NormalizedName", "Description", "SortOrder", "Active", "Version").Updates(&saved).Error; err != nil {
			return err
		}
		return recordLegacyAuditEntryWithContext(ctx, tx, "QualityDefectType", saved.ID, "save", nil)
	})
	var postgresError *pgconn.PgError
	if errors.Is(err, gorm.ErrDuplicatedKey) || errors.As(err, &postgresError) && postgresError.Code == "23505" || err != nil && strings.Contains(err.Error(), "UNIQUE constraint failed") {
		return models.QualityDefectType{}, domainConflictError("异常点名称已存在；停用项也保留原名称")
	}
	return saved, err
}

func (s *QualityService) GetQualityInspectionStageDefectTypeBindings(id string) (QualityInspectionStageDefectTypeBindings, error) {
	parsedID, err := uuid.Parse(id)
	if err != nil {
		return QualityInspectionStageDefectTypeBindings{}, domainValidationError("检验站 ID 无效")
	}
	id = parsedID.String()
	var bindings QualityInspectionStageDefectTypeBindings
	err = s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		var stage models.QualityInspectionStage
		// The shared lock keeps the version and binding set from different saves
		// from being combined into a seemingly current read.
		if err := tx.Clauses(clause.Locking{Strength: "SHARE"}).First(&stage, "id = ?", id).Error; errors.Is(err, gorm.ErrRecordNotFound) {
			return domainNotFoundError("检验站不存在")
		} else if err != nil {
			return err
		}
		bindings = QualityInspectionStageDefectTypeBindings{InspectionStageID: id, Version: stage.Version, DefectTypeIDs: make([]string, 0)}
		return tx.Model(&models.QualityInspectionStageDefectTypeBinding{}).Where("inspection_stage_id = ?", id).Order("defect_type_id ASC").Pluck("defect_type_id", &bindings.DefectTypeIDs).Error
	})
	return bindings, err
}

func (s *QualityService) ReplaceQualityInspectionStageDefectTypeBindings(ctx context.Context, id string, input ReplaceQualityInspectionStageDefectTypeBindingsRequest) (QualityInspectionStageDefectTypeBindings, error) {
	parsedID, err := uuid.Parse(id)
	if err != nil {
		return QualityInspectionStageDefectTypeBindings{}, domainValidationError("检验站 ID 无效")
	}
	id = parsedID.String()
	if input.DefectTypeIDs == nil || input.Version < 1 || len(*input.DefectTypeIDs) > 1000 {
		return QualityInspectionStageDefectTypeBindings{}, domainValidationError("请明确提交异常点集合（清空时提交空数组）及当前版本，最多绑定 1000 项")
	}
	ids := append([]string{}, (*input.DefectTypeIDs)...)
	seen := make(map[string]bool, len(ids))
	for index, defectTypeID := range ids {
		parsedDefectTypeID, err := uuid.Parse(defectTypeID)
		if err != nil || seen[parsedDefectTypeID.String()] {
			return QualityInspectionStageDefectTypeBindings{}, domainValidationError("异常点 ID 无效或重复")
		}
		ids[index] = parsedDefectTypeID.String()
		seen[ids[index]] = true
	}
	slices.Sort(ids)
	var saved QualityInspectionStageDefectTypeBindings
	err = s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		var stage models.QualityInspectionStage
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&stage, "id = ?", id).Error; errors.Is(err, gorm.ErrRecordNotFound) {
			return domainNotFoundError("检验站不存在")
		} else if err != nil {
			return err
		}
		if input.Version != stage.Version {
			return domainConflictError("检验站或绑定已被修改，请重新加载后编辑；当前选择未保存")
		}
		if !stage.Active {
			return domainValidationError("检验站已停用，启用后才能修改绑定")
		}
		previousIDs := make([]string, 0)
		if err := tx.Model(&models.QualityInspectionStageDefectTypeBinding{}).Where("inspection_stage_id = ?", id).Order("defect_type_id ASC").Pluck("defect_type_id", &previousIDs).Error; err != nil {
			return err
		}
		if len(ids) > 0 {
			var defectTypes []models.QualityDefectType
			if err := tx.Clauses(clause.Locking{Strength: "SHARE"}).Where("id IN ?", ids).Order("id ASC").Find(&defectTypes).Error; err != nil {
				return err
			}
			if len(defectTypes) != len(ids) {
				return domainValidationError("部分异常点不存在，请重新加载目录")
			}
			for _, defectType := range defectTypes {
				if !defectType.Active && !slices.Contains(previousIDs, defectType.ID) {
					return domainValidationError("不能新增绑定到已停用的异常点")
				}
			}
		}
		saved = QualityInspectionStageDefectTypeBindings{InspectionStageID: id, DefectTypeIDs: ids, Version: stage.Version}
		if slices.Equal(previousIDs, ids) {
			return nil
		}
		if err := tx.Where("inspection_stage_id = ?", id).Delete(&models.QualityInspectionStageDefectTypeBinding{}).Error; err != nil {
			return err
		}
		for _, defectTypeID := range ids {
			binding := models.QualityInspectionStageDefectTypeBinding{InspectionStageID: id, DefectTypeID: defectTypeID}
			if err := tx.Create(&binding).Error; err != nil {
				return err
			}
		}
		saved.Version++
		if err := tx.Model(&stage).Update("version", saved.Version).Error; err != nil {
			return err
		}
		diff, err := json.Marshal([]audit.DiffItem{{Field: "defectTypeIds", Old: previousIDs, New: ids, Alias: "适用异常点"}})
		if err != nil {
			return err
		}
		return recordLegacyAuditEntryWithContext(ctx, tx, "QualityInspectionStage", id, "replace_defect_type_bindings", diff)
	})
	return saved, err
}
