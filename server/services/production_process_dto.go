package services

type SaveProcessStepHandlerRequest struct {
	ProcessStepDTO
}

type MessageResponse struct {
	Message string `json:"message"`
}
