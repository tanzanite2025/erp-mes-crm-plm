package services

type SaveProcessStepHandlerRequest struct {
	ProcessStepDTO
	StationID string `json:"stationId"`
}

type StationProcessMappingHandlerRequest struct {
	StationID string `json:"stationId" binding:"required"`
	ProcessID string `json:"processId" binding:"required"`
}

type MessageResponse struct {
	Message string `json:"message"`
}

type StationProcessMappingsResponse map[string][]string

type StationMappingsResponse struct {
	Items StationProcessMappingsResponse `json:"items"`
}
