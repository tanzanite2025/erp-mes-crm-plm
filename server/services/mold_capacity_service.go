package services

import (
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"
)

type MoldCapacityCheckRequest struct {
	GroupName    string `json:"groupName"`
	RequestedQty int    `json:"requestedQty"`
}

type MoldCapacityInstance struct {
	SN     string `json:"sn"`
	Health int    `json:"health"`
	Status string `json:"status"`
}

type MoldCapacityCheckResponse struct {
	IsSufficient   bool                   `json:"isSufficient"`
	TotalRemaining int                    `json:"totalRemaining"`
	Shortage       int                    `json:"shortage"`
	Instances      []MoldCapacityInstance `json:"instances"`
}

type MoldCapacityAlert struct {
	ModelName      string                 `json:"modelName"`
	TotalQty       int                    `json:"totalQty"`
	IsSufficient   bool                   `json:"isSufficient"`
	TotalRemaining int                    `json:"totalRemaining"`
	Shortage       int                    `json:"shortage"`
	CriticalMolds  []MoldCapacityInstance `json:"criticalMolds"`
}

func CheckMoldCapacity(groupName string, requestedQty int) (MoldCapacityCheckResponse, error) {
	groupName = strings.TrimSpace(groupName)
	if requestedQty < 0 {
		requestedQty = 0
	}

	var molds []models.Mold
	query := db.DB.Model(&models.Mold{}).Where("deleted_at IS NULL")
	if groupName != "" {
		query = query.Where("group_name = ?", groupName)
	} else {
		query = query.Where("group_name = '' OR group_name IS NULL")
	}
	if err := query.Order("created_at desc").Find(&molds).Error; err != nil {
		return MoldCapacityCheckResponse{}, err
	}

	response := MoldCapacityCheckResponse{
		Instances: make([]MoldCapacityInstance, 0, len(molds)),
	}

	for _, mold := range molds {
		health := calculateMoldHealth(mold)
		instance := MoldCapacityInstance{
			SN:     mold.SN,
			Health: health,
			Status: mold.Status,
		}
		response.Instances = append(response.Instances, instance)

		if !isMoldCapacityAvailable(mold.Status) {
			continue
		}
		response.TotalRemaining += calculateMoldRemainingCapacity(mold)
	}

	response.IsSufficient = response.TotalRemaining >= requestedQty
	if !response.IsSufficient {
		response.Shortage = requestedQty - response.TotalRemaining
	}

	return response, nil
}

func CheckMoldCapacityAlerts(input []MoldCapacityCheckRequest) ([]MoldCapacityAlert, error) {
	alerts := make([]MoldCapacityAlert, 0, len(input))

	for _, item := range input {
		status, err := CheckMoldCapacity(item.GroupName, item.RequestedQty)
		if err != nil {
			return nil, err
		}

		criticalMolds := make([]MoldCapacityInstance, 0)
		for _, instance := range status.Instances {
			if instance.Health < 20 || instance.Status == "CHECKING" {
				criticalMolds = append(criticalMolds, instance)
			}
		}

		if status.IsSufficient && len(criticalMolds) == 0 {
			continue
		}

		alerts = append(alerts, MoldCapacityAlert{
			ModelName:      item.GroupName,
			TotalQty:       item.RequestedQty,
			IsSufficient:   status.IsSufficient,
			TotalRemaining: status.TotalRemaining,
			Shortage:       status.Shortage,
			CriticalMolds:  criticalMolds,
		})
	}

	return alerts, nil
}

func calculateMoldHealth(mold models.Mold) int {
	if mold.MaxCycles <= 0 {
		return 0
	}
	remaining := mold.MaxCycles - mold.CurrentCycles
	if remaining < 0 {
		remaining = 0
	}
	health := int(float64(remaining) / float64(mold.MaxCycles) * 100)
	if health > 100 {
		return 100
	}
	if health < 0 {
		return 0
	}
	return health
}

func calculateMoldRemainingCapacity(mold models.Mold) int {
	remaining := mold.MaxCycles - mold.CurrentCycles
	if remaining < 0 {
		return 0
	}
	return remaining
}

func isMoldCapacityAvailable(status string) bool {
	switch strings.TrimSpace(status) {
	case "IDLE", "IN_USE", "BORROWED":
		return true
	default:
		return false
	}
}
