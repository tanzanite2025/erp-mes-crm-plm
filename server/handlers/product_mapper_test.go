package handlers

import (
	"encoding/json"
	"testing"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
)

func TestToProductApiDTONormalizesNullRestrictionsToEmptyArray(t *testing.T) {
	dto := toProductApiDTO(models.Product{
		BaseModel: models.BaseModel{
			ID: "product-1",
		},
		SKU:             "SKU-001",
		Name:            "Product A",
		ModelCode:       "01",
		TypeID:          "type-1",
		Restrictions:    []byte("null"),
		AttributeValues: []models.ProductAttributeValue{},
		Status:          "Active",
		Version:         1,
	})

	require.NotNil(t, dto.Restrictions)
	require.Equal(t, []string{}, dto.Restrictions)

	encoded, err := json.Marshal(dto)
	require.NoError(t, err)
	require.Contains(t, string(encoded), `"restrictions":[]`)
}
