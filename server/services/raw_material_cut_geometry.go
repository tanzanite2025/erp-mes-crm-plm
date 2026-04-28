package services

import "math"

type rawMaterialCutGeometry struct {
	AngleDeg         float64
	NormalizedAngle  float64
	BaseWidthMM      float64
	BaseLengthMM     float64
	EnvelopeWidthMM  float64
	EnvelopeLengthMM float64
	BaseAreaM2       float64
	EnvelopeAreaM2   float64
}

func normalizeRawMaterialCutAngleDegrees(value float64) float64 {
	if math.IsNaN(value) || math.IsInf(value, 0) {
		return 0
	}
	normalized := math.Mod(value, 180)
	if normalized < 0 {
		normalized += 180
	}
	if normalized == 180 {
		return 0
	}
	return normalized
}

func resolveRawMaterialCutGeometry(widthMM float64, lengthMM float64, cutAngle float64) rawMaterialCutGeometry {
	baseWidthMM := maxFloat64(widthMM, 0)
	baseLengthMM := maxFloat64(lengthMM, 0)
	normalizedAngle := normalizeRawMaterialCutAngleDegrees(cutAngle)
	if baseWidthMM <= 0 || baseLengthMM <= 0 {
		return rawMaterialCutGeometry{
			AngleDeg:         normalizedAngle,
			NormalizedAngle:  normalizedAngle,
			BaseWidthMM:      baseWidthMM,
			BaseLengthMM:     baseLengthMM,
			EnvelopeWidthMM:  0,
			EnvelopeLengthMM: 0,
			BaseAreaM2:       0,
			EnvelopeAreaM2:   0,
		}
	}

	radians := normalizedAngle * math.Pi / 180
	envelopeWidthMM := math.Abs(baseWidthMM*math.Cos(radians)) + math.Abs(baseLengthMM*math.Sin(radians))
	envelopeLengthMM := math.Abs(baseWidthMM*math.Sin(radians)) + math.Abs(baseLengthMM*math.Cos(radians))
	baseAreaM2 := (baseWidthMM * baseLengthMM) / 1_000_000
	envelopeAreaM2 := (envelopeWidthMM * envelopeLengthMM) / 1_000_000
	return rawMaterialCutGeometry{
		AngleDeg:         roundRawMaterialBatchOptimizer(normalizedAngle, 3),
		NormalizedAngle:  roundRawMaterialBatchOptimizer(normalizedAngle, 3),
		BaseWidthMM:      roundRawMaterialBatchOptimizer(baseWidthMM, 3),
		BaseLengthMM:     roundRawMaterialBatchOptimizer(baseLengthMM, 3),
		EnvelopeWidthMM:  roundRawMaterialBatchOptimizer(envelopeWidthMM, 3),
		EnvelopeLengthMM: roundRawMaterialBatchOptimizer(envelopeLengthMM, 3),
		BaseAreaM2:       roundRawMaterialBatchOptimizer(baseAreaM2, 6),
		EnvelopeAreaM2:   roundRawMaterialBatchOptimizer(envelopeAreaM2, 6),
	}
}
