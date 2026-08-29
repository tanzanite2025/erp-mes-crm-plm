package services

func MapSaveProcessStepHandlerRequestToServiceRequest(input SaveProcessStepHandlerRequest, operator string, ip string) SaveProcessStepRequest {
	return SaveProcessStepRequest{
		Step:     input.ProcessStepDTO,
		Operator: operator,
		IP:       ip,
	}
}
