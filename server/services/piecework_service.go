package services

import (
	"context"
	"xdfc-server/audit"
	"xdfc-server/models"

	"gorm.io/gorm"
)

type PieceworkService struct {
	txManager transactionManager
}

func NewPieceworkService(txManager transactionManager) *PieceworkService {
	return &PieceworkService{txManager: txManager}
}

var defaultPieceworkService = NewPieceworkService(defaultServiceRuntime().txManager)

func SavePieceworkRate(ctx context.Context, rate *models.PieceworkRate) error {
	return defaultPieceworkService.SavePieceworkRate(ctx, rate)
}

func (s *PieceworkService) SavePieceworkRate(ctx context.Context, rate *models.PieceworkRate) error {
	actor, _ := audit.ActorFromContext(ctx)
	rate.Operator = actor.Username
	if rate.Operator == "" {
		rate.Operator = actor.UserID
	}
	if rate.Operator == "" {
		rate.Operator = "system"
	}

	return s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		var err error
		if rate.ID == "" {
			err = tx.Create(rate).Error
		} else {
			err = tx.Model(rate).Updates(rate).Error
		}
		if err != nil {
			return err
		}
		return recordLegacyAuditEntryWithContext(ctx, tx, "PieceworkRate", rate.ID, "save", nil)
	})
}
