package services

import (
	"testing"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
)

func TestValidateProductionPlanStatuses_AllowsCanonicalPlanAndTaskStatuses(t *testing.T) {
	err := ValidateProductionPlanStatuses(models.ProductionPlan{
		Status: "SCHEDULED",
		Tasks: []models.ProductionTask{
			{Status: "PENDING"},
			{Status: "RUNNING"},
			{Status: "HOLD"},
			{Status: "DONE"},
		},
	})

	require.NoError(t, err)
}

func TestValidateProductionPlanStatuses_RejectsNonCanonicalPlanStatus(t *testing.T) {
	err := ValidateProductionPlanStatuses(models.ProductionPlan{
		Status: "PLANNING",
	})

	require.ErrorIs(t, err, ErrInvalidProductionPlanStatus)
	require.Contains(t, err.Error(), "PLANNING")
}

func TestValidateProductionPlanStatuses_RejectsTaskStatusInPlanStatusDictionary(t *testing.T) {
	err := ValidateProductionPlanStatuses(models.ProductionPlan{
		Status: "SCHEDULED",
		Tasks: []models.ProductionTask{
			{Status: "SCHEDULED"},
		},
	})

	require.ErrorIs(t, err, ErrInvalidProductionTaskStatus)
	require.Contains(t, err.Error(), "tasks[0]")
	require.Contains(t, err.Error(), "SCHEDULED")
}
