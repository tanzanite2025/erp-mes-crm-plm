package services

import (
	"testing"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
)

func TestDefaultBOMSectionCodeReturnsEmptyWhenNoActiveSectionExists(t *testing.T) {
	code := defaultBOMSectionCode([]models.BOMSection{
		{Code: "PREPARE", Active: false, IsDefault: true},
		{Code: "ROLLING", Active: false, IsDefault: false},
	})

	require.Equal(t, "", code)
}
