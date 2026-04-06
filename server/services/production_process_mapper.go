package services

import "xdfc-server/models"

func MapSaveProcessStepHandlerRequestToServiceRequest(input SaveProcessStepHandlerRequest, operator string, ip string) SaveProcessStepRequest {
	return SaveProcessStepRequest{
		Step:      input.ProcessStepDTO,
		StationID: input.StationID,
		Operator:  operator,
		IP:        ip,
	}
}

func MapProcessStepsToDTO(steps []models.ProcessStep) []ProcessStepDTO {
	result := make([]ProcessStepDTO, 0, len(steps))
	for _, step := range steps {
		result = append(result, mapProcessStepToDTO(step))
	}
	return result
}

func MapStationMappingsToResponse(mappings map[string][]string) StationProcessMappingsResponse {
	result := make(StationProcessMappingsResponse, len(mappings))
	for stationID, processIDs := range mappings {
		copied := append([]string(nil), processIDs...)
		result[stationID] = copied
	}
	return result
}
