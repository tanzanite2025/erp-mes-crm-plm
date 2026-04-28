package services

import (
	"fmt"
	"time"
	"xdfc-server/models"
)

func SolveRawMaterialBatchOptimizer(input models.RawMaterialBatchOptimizerSolveRequest) (models.RawMaterialBatchOptimizerSolveResponse, error) {
	if err := validateRawMaterialBatchOptimizerSolveRequest(input); err != nil {
		return models.RawMaterialBatchOptimizerSolveResponse{}, err
	}

	requestID := fmt.Sprintf("batch-opt-%d", time.Now().UnixMilli())
	context := buildRawMaterialBatchOptimizerContext(requestID, input)
	candidates := seedRawMaterialBatchOptimizerCandidates(context)
	response := buildRawMaterialBatchOptimizerSolveResponse(context, candidates)
	return response, nil
}
