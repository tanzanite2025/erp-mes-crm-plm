package services

import (
	"context"
	"xdfc-server/models"
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

func SaveTeam(ctx context.Context, team *models.Team) error {
	return defaultPieceworkService.SaveTeam(ctx, team)
}

func PatchTeam(ctx context.Context, id string, updates map[string]interface{}) (models.Team, error) {
	return defaultPieceworkService.PatchTeam(ctx, id, updates)
}

func DeleteTeam(ctx context.Context, id string) error {
	return defaultPieceworkService.DeleteTeam(ctx, id)
}
