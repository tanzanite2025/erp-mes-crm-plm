package services

import "xdfc-server/models"

type rawMaterialBatchOptimizerSearchConfig struct {
	PresetKey               string
	BeamWidth               int
	MaxSearchDepth          int
	PerDemandBranchingLimit int
	ResidualReuseBias       int
	ConvergenceAreaBucketM2 float64
}

func buildRawMaterialBatchOptimizerSearchConfig(
	input models.RawMaterialBatchOptimizerSolveRequest,
) rawMaterialBatchOptimizerSearchConfig {
	config := rawMaterialBatchOptimizerSearchConfig{
		PresetKey:               "phase5-balanced",
		BeamWidth:               4,
		MaxSearchDepth:          3,
		PerDemandBranchingLimit: 2,
		ResidualReuseBias:       2,
		ConvergenceAreaBucketM2: 0.001,
	}
	switch input.ObjectivePreset {
	case "yield-first":
		config.PresetKey = "phase5-yield"
		config.BeamWidth = 5
		config.MaxSearchDepth = 4
		config.PerDemandBranchingLimit = 3
		config.ResidualReuseBias = 3
		config.ConvergenceAreaBucketM2 = 0.002
	case "delivery-first":
		config.PresetKey = "phase5-delivery"
		config.BeamWidth = 4
		config.MaxSearchDepth = 2
		config.PerDemandBranchingLimit = 2
		config.ResidualReuseBias = 1
		config.ConvergenceAreaBucketM2 = 0.001
	case "stability-first":
		config.PresetKey = "phase5-stability"
		config.BeamWidth = 3
		config.MaxSearchDepth = 2
		config.PerDemandBranchingLimit = 2
		config.ResidualReuseBias = 2
		config.ConvergenceAreaBucketM2 = 0.001
	}
	if input.MaxCandidatePlans > 0 {
		config.BeamWidth = minIntRawMaterialBatchOptimizer(config.BeamWidth, input.MaxCandidatePlans)
	}
	config.BeamWidth = maxInt(config.BeamWidth, 1)
	config.MaxSearchDepth = maxInt(config.MaxSearchDepth, 1)
	config.PerDemandBranchingLimit = maxInt(config.PerDemandBranchingLimit, 1)
	config.ResidualReuseBias = maxInt(config.ResidualReuseBias, 0)
	config.ConvergenceAreaBucketM2 = maxFloat64(config.ConvergenceAreaBucketM2, 0.0001)
	return config
}

func toRawMaterialBatchOptimizerSearchConfigSummary(
	config rawMaterialBatchOptimizerSearchConfig,
) models.RawMaterialBatchOptimizerSearchConfigSummary {
	return models.RawMaterialBatchOptimizerSearchConfigSummary{
		PresetKey:               config.PresetKey,
		BeamWidth:               config.BeamWidth,
		MaxSearchDepth:          config.MaxSearchDepth,
		PerDemandBranchingLimit: config.PerDemandBranchingLimit,
		ResidualReuseBias:       config.ResidualReuseBias,
		ConvergenceAreaBucketM2: roundRawMaterialBatchOptimizer(config.ConvergenceAreaBucketM2, 6),
	}
}
