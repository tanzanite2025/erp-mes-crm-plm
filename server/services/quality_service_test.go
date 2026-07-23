package services

import (
	"testing"

	"xdfc-server/models"

	"github.com/stretchr/testify/require"
)

func TestValidateQualityAbnormalityDisposalRequiresScrapQuantityAndUnit(t *testing.T) {
	quantity := 2.0

	valid := &models.QualityAbnormality{
		DisposalMethod: "scrap",
		ScrapQuantity:  &quantity,
		ScrapUnit:      " pcs ",
	}
	require.NoError(t, ValidateQualityAbnormalityDisposal(valid))
	require.Equal(t, "SCRAP", valid.DisposalMethod)
	require.Equal(t, "pcs", valid.ScrapUnit)
	require.NotNil(t, valid.OccurredAt)

	missingQuantity := &models.QualityAbnormality{
		DisposalMethod: "SCRAP",
		ScrapUnit:      "pcs",
	}
	require.Error(t, ValidateQualityAbnormalityDisposal(missingQuantity))

	missingUnit := &models.QualityAbnormality{
		DisposalMethod: "SCRAP",
		ScrapQuantity:  &quantity,
	}
	require.Error(t, ValidateQualityAbnormalityDisposal(missingUnit))

	unsupported := &models.QualityAbnormality{
		DisposalMethod: "UNKNOWN",
	}
	require.Error(t, ValidateQualityAbnormalityDisposal(unsupported))
}

func TestValidateQualityAbnormalityDisposalClearsScrapFieldsForNonScrap(t *testing.T) {
	quantity := 2.0
	abnormality := &models.QualityAbnormality{
		DisposalMethod: "REWORK",
		ScrapQuantity:  &quantity,
		ScrapUnit:      "pcs",
	}

	require.NoError(t, ValidateQualityAbnormalityDisposal(abnormality))
	require.Nil(t, abnormality.ScrapQuantity)
	require.Empty(t, abnormality.ScrapUnit)
	require.NotNil(t, abnormality.OccurredAt)
}
