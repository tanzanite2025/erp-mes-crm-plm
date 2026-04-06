package handlers

import (
	"bytes"
	"encoding/json"
	"net/http/httptest"
	"testing"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestSaveProductionLineHandlerRequestBinding(t *testing.T) {
	gin.SetMode(gin.TestMode)

	payload := services.SaveProductionLineHandlerRequest{
		ProductionLineDTO: services.ProductionLineDTO{
			ID:      "temp-line-1",
			Name:    "Line A",
			Code:    "LINE-A",
			Version: 1,
			Segments: []services.LineSegmentDTO{
				{
					ID:        "temp-segment-1",
					Name:      "Segment A",
					SortOrder: 1,
				},
			},
		},
		AuthCode: "622575",
	}

	body, err := json.Marshal(payload)
	require.NoError(t, err)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest("POST", "/api/v1/production/lines", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	ctx.Request = request

	var bound services.SaveProductionLineHandlerRequest
	err = ctx.ShouldBindJSON(&bound)
	require.NoError(t, err)
	require.Equal(t, payload.AuthCode, bound.AuthCode)
	require.Equal(t, payload.ID, bound.ID)
	require.Equal(t, payload.Name, bound.Name)
	require.Equal(t, payload.Code, bound.Code)
	require.Equal(t, payload.Version, bound.Version)
	require.Len(t, bound.Segments, 1)
	require.Equal(t, payload.Segments[0].ID, bound.Segments[0].ID)
	require.Equal(t, payload.Segments[0].Name, bound.Segments[0].Name)
}
