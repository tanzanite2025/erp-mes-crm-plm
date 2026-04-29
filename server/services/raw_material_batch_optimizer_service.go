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
	if canSolveRawMaterialBatchOptimizerPhase7Geometry(context) {
		candidates = seedRawMaterialBatchOptimizerPhase7GeometryCandidates(context)
	} else if canSolveRawMaterialBatchOptimizerPhase6Geometry(context) {
		candidates = seedRawMaterialBatchOptimizerPhase6GeometryCandidates(context)
	} else if canSolveRawMaterialBatchOptimizerPhase5Geometry(context) {
		candidates = seedRawMaterialBatchOptimizerPhase5GeometryCandidates(context)
	} else if canSolveRawMaterialBatchOptimizerPhase4Geometry(context) {
		candidates = seedRawMaterialBatchOptimizerPhase4GeometryCandidates(context)
	} else if canSolveRawMaterialBatchOptimizerPhase3Geometry(context) {
		candidates = seedRawMaterialBatchOptimizerPhase3GeometryCandidates(context)
	} else if canSolveRawMaterialBatchOptimizerPhase2Geometry(context) {
		candidates = seedRawMaterialBatchOptimizerPhase2GeometryCandidates(context)
	} else if canSolveRawMaterialBatchOptimizerPhase1Geometry(context) {
		candidates = seedRawMaterialBatchOptimizerPhase1GeometryCandidates(context)
	}
	response := buildRawMaterialBatchOptimizerSolveResponse(context, candidates)
	return response, nil
}
