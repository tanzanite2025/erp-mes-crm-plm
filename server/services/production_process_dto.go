package services

type SaveProcessStepHandlerRequest struct {
	ProcessStepDTO
}

type MessageResponse struct {
	Message string `json:"message"`
}

type JobCategoryProcessMappingHandlerRequest struct {
	JobCategoryID string `json:"jobCategoryId" binding:"required"`
	ProcessID     string `json:"processId" binding:"required"`
}
