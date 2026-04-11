package services

import "xdfc-server/models"

func MapSaveProcessStepHandlerRequestToServiceRequest(input SaveProcessStepHandlerRequest, operator string, ip string) SaveProcessStepRequest {
	return SaveProcessStepRequest{
		Step:     input.ProcessStepDTO,
		Operator: operator,
		IP:       ip,
	}
}

func MapProcessStepsToDTO(steps []models.ProcessStep) []ProcessStepDTO {
	result := make([]ProcessStepDTO, 0, len(steps))
	for _, step := range steps {
		result = append(result, mapProcessStepToDTO(step))
	}
	return result
}
