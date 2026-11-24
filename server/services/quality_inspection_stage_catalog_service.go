package services

import (
	"context"
	"errors"
	"strings"
	"unicode/utf8"
	"xdfc-server/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type SaveQualityInspectionStageRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	SortOrder   int    `json:"sortOrder"`
	Active      *bool  `json:"active"`
	Version     int64  `json:"version"`
}

func ListQualityInspectionStages() ([]models.QualityInspectionStage, error) {
	stages := make([]models.QualityInspectionStage, 0)
	err := defaultQualityService.txManager.DB().Order("sort_order ASC, code ASC").Find(&stages).Error
	return stages, err
}

func SaveQualityInspectionStage(ctx context.Context, id string, input SaveQualityInspectionStageRequest) (models.QualityInspectionStage, error) {
	return defaultQualityService.SaveQualityInspectionStage(ctx, id, input)
}

func (s *QualityService) SaveQualityInspectionStage(ctx context.Context, id string, input SaveQualityInspectionStageRequest) (models.QualityInspectionStage, error) {
	name := strings.Join(strings.Fields(input.Name), " ")
	if name == "" || utf8.RuneCountInString(name) > 100 {
		return models.QualityInspectionStage{}, domainValidationError("检验站名称必须为 1 到 100 个字符")
	}
	if input.SortOrder < 0 || input.SortOrder > 1000000 || utf8.RuneCountInString(input.Description) > 2000 || input.Active == nil {
		return models.QualityInspectionStage{}, domainValidationError("请填写有效的检验站顺序、启用状态和说明（最多 2000 字）")
	}
	if id != "" {
		if _, err := uuid.Parse(id); err != nil {
			return models.QualityInspectionStage{}, domainValidationError("检验站 ID 无效")
		}
	}
	var saved models.QualityInspectionStage
	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		if id == "" {
			saved = models.QualityInspectionStage{BaseModel: models.BaseModel{ID: uuid.NewString()}, Code: "QST-" + uuid.NewString(), Version: 1}
		} else {
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&saved, "id = ?", id).Error; errors.Is(err, gorm.ErrRecordNotFound) {
				return domainNotFoundError("检验站不存在")
			} else if err != nil {
				return err
			}
			if input.Version != saved.Version {
				return domainConflictError("检验站已被修改，请刷新后重新编辑；当前输入未保存")
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
		return recordLegacyAuditEntryWithContext(ctx, tx, "QualityInspectionStage", saved.ID, "save", nil)
	})
	var postgresError *pgconn.PgError
	if errors.Is(err, gorm.ErrDuplicatedKey) || errors.As(err, &postgresError) && postgresError.Code == "23505" || err != nil && strings.Contains(err.Error(), "UNIQUE constraint failed") {
		return models.QualityInspectionStage{}, domainConflictError("检验站名称已存在，请修改名称；停用检验站也保留原名称")
	}
	return saved, err
}
