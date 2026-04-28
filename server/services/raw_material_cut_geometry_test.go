package services

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestResolveRawMaterialCutGeometryKeepsBaseSizeAtZeroDegrees(t *testing.T) {
	geometry := resolveRawMaterialCutGeometry(980, 91, 0)

	require.Equal(t, 980.0, geometry.EnvelopeWidthMM)
	require.Equal(t, 91.0, geometry.EnvelopeLengthMM)
	require.Equal(t, 0.08918, geometry.BaseAreaM2)
	require.Equal(t, 0.08918, geometry.EnvelopeAreaM2)
}

func TestResolveRawMaterialCutGeometryExpandsEnvelopeAtFortyFiveDegrees(t *testing.T) {
	geometry := resolveRawMaterialCutGeometry(980, 91, 45)

	require.Equal(t, 757.311, geometry.EnvelopeWidthMM)
	require.Equal(t, 757.311, geometry.EnvelopeLengthMM)
	require.Greater(t, geometry.EnvelopeAreaM2, geometry.BaseAreaM2)
}

func TestNormalizeRawMaterialCutAngleDegreesKeepsCanonicalZeroAndFortyFiveAngles(t *testing.T) {
	require.Equal(t, 45.0, normalizeRawMaterialCutAngleDegrees(45))
	require.Equal(t, 0.0, normalizeRawMaterialCutAngleDegrees(180))
}
