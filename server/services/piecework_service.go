package services

import (
	"context"
	"encoding/json"
	"sort"
	"strings"
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

func SaveTeam(ctx context.Context, team *models.Team) error {
	return defaultPieceworkService.SaveTeam(ctx, team)
}

func PatchTeam(ctx context.Context, id string, updates map[string]interface{}) (models.Team, error) {
	return defaultPieceworkService.PatchTeam(ctx, id, updates)
}

func DeleteTeam(ctx context.Context, id string) error {
	return defaultPieceworkService.DeleteTeam(ctx, id)
}

func auditOperatorFromContext(ctx context.Context) string {
	actor, _ := audit.ActorFromContext(ctx)
	operator := strings.TrimSpace(actor.Username)
	if operator == "" {
		operator = strings.TrimSpace(actor.UserID)
	}
	if operator == "" {
		operator = "system"
	}
	return operator
}

func teamAuditSnapshot(team models.Team) map[string]any {
	return map[string]any{
		"id":             strings.TrimSpace(team.ID),
		"code":           strings.TrimSpace(team.Code),
		"name":           strings.TrimSpace(team.Name),
		"shortName":      strings.TrimSpace(team.ShortName),
		"step":           team.Step,
		"section":        strings.TrimSpace(team.Section),
		"process":        strings.TrimSpace(team.Process),
		"processCommand": strings.TrimSpace(team.ProcessCommand),
		"type":           strings.TrimSpace(team.Type),
		"isMaintenance":  team.IsMaintenance,
		"status":         strings.TrimSpace(team.Status),
		"remarks":        strings.TrimSpace(team.Remarks),
		"operator":       strings.TrimSpace(team.Operator),
		"operateTime":    strings.TrimSpace(team.OperateTime),
	}
}

func teamAuditDiff(before map[string]any, payload map[string]any) json.RawMessage {
	diff, _ := json.Marshal(map[string]any{
		"before":  before,
		"payload": payload,
	})
	return diff
}

func writeTeamAuditEntryWithContext(ctx context.Context, tx *gorm.DB, targetID string, action string, before map[string]any, payload map[string]any) error {
	return recordLegacyAuditEntryWithContext(ctx, tx, AuditModuleTeam, strings.TrimSpace(targetID), strings.TrimSpace(action), teamAuditDiff(before, payload))
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

func (s *PieceworkService) SaveTeam(ctx context.Context, team *models.Team) error {
	if team == nil {
		return nil
	}
	team.Operator = auditOperatorFromContext(ctx)

	return s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		action := "CREATE"
		var before map[string]any
		if strings.TrimSpace(team.ID) == "" {
			if err := tx.Create(team).Error; err != nil {
				return err
			}
		} else {
			var existing models.Team
			if err := tx.First(&existing, "id = ?", team.ID).Error; err != nil {
				return err
			}
			before = teamAuditSnapshot(existing)
			action = "UPDATE"
			if err := tx.Model(&existing).Updates(team).Error; err != nil {
				return err
			}
			if err := tx.First(team, "id = ?", team.ID).Error; err != nil {
				return err
			}
		}

		payload := teamAuditSnapshot(*team)
		payload["operation"] = strings.ToLower(action)
		return writeTeamAuditEntryWithContext(ctx, tx, team.ID, action, before, payload)
	})
}

func (s *PieceworkService) PatchTeam(ctx context.Context, id string, updates map[string]interface{}) (models.Team, error) {
	var updated models.Team
	operator := auditOperatorFromContext(ctx)

	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		var existing models.Team
		if err := tx.First(&existing, "id = ?", id).Error; err != nil {
			return err
		}

		if updates == nil {
			updates = map[string]interface{}{}
		}
		updates["operator"] = operator

		before := teamAuditSnapshot(existing)
		if err := tx.Model(&existing).Updates(updates).Error; err != nil {
			return err
		}
		if err := tx.First(&updated, "id = ?", id).Error; err != nil {
			return err
		}

		payload := teamAuditSnapshot(updated)
		deltaKeys := make([]string, 0, len(updates))
		for key := range updates {
			deltaKeys = append(deltaKeys, key)
		}
		sort.Strings(deltaKeys)
		payload["deltaKeys"] = deltaKeys
		payload["operation"] = "patch"
		return writeTeamAuditEntryWithContext(ctx, tx, updated.ID, "PATCH", before, payload)
	})
	return updated, err
}

func (s *PieceworkService) DeleteTeam(ctx context.Context, id string) error {
	return s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		var existing models.Team
		if err := tx.First(&existing, "id = ?", id).Error; err != nil {
			return err
		}
		before := teamAuditSnapshot(existing)
		if err := tx.Delete(&models.Team{}, "id = ?", id).Error; err != nil {
			return err
		}
		payload := map[string]any{
			"deleted":   true,
			"operation": "delete",
		}
		return writeTeamAuditEntryWithContext(ctx, tx, existing.ID, "DELETE", before, payload)
	})
}
