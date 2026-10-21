package services

import (
	"xdfc-server/db"
	"xdfc-server/models"
)

// GetQualityStandardApprovalSummaries only exposes the approval explicitly
// linked to the current standard. Historical requests never imply submission.
func GetQualityStandardApprovalSummaries(standards []models.InspectionStandard) (map[string]*models.ApprovalRequest, error) {
	result := make(map[string]*models.ApprovalRequest)
	ids := make([]string, 0, len(standards))
	for _, standard := range standards {
		if standard.ApprovalRequestID != nil {
			ids = append(ids, *standard.ApprovalRequestID)
		}
	}
	if len(ids) == 0 {
		return result, nil
	}
	var requests []models.ApprovalRequest
	if err := db.DB.Where("id IN ?", ids).Find(&requests).Error; err != nil {
		return nil, err
	}
	byID := make(map[string]*models.ApprovalRequest)
	for index := range requests {
		byID[requests[index].ID] = &requests[index]
	}
	for _, standard := range standards {
		if standard.ApprovalRequestID == nil {
			continue
		}
		request := byID[*standard.ApprovalRequestID]
		if request != nil && request.TargetID == standard.ID && request.Module == "Quality" {
			result[standard.ID] = request
		}
	}
	return result, nil
}

func GetQualityStandardApprovalSummary(standard models.InspectionStandard) (*models.ApprovalRequest, error) {
	summaries, err := GetQualityStandardApprovalSummaries([]models.InspectionStandard{standard})
	return summaries[standard.ID], err
}
