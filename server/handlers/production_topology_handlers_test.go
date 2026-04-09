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

func TestPatchProductionLineHandlerRequestBinding(t *testing.T) {
	gin.SetMode(gin.TestMode)

	payload := services.PatchProductionLineHandlerRequest{
		Op: "PATCH",
		Delta: services.PatchProductionLineDeltaDTO{
			Segments: &services.DeltaItemDTO{
				New: json.RawMessage(`[{"id":"segment-1","name":"Segment A","sortOrder":1,"processes":[]}]`),
			},
		},
		Metadata: services.PatchProductionLineMetadata{
			ID:       "line-1",
			Version:  3,
			AuthCode: "622575",
		},
	}

	body, err := json.Marshal(payload)
	require.NoError(t, err)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest("PATCH", "/api/v1/production/lines/line-1", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	ctx.Request = request

	var bound services.PatchProductionLineHandlerRequest
	err = ctx.ShouldBindJSON(&bound)
	require.NoError(t, err)
	require.Equal(t, payload.Op, bound.Op)
	require.Equal(t, payload.Metadata.ID, bound.Metadata.ID)
	require.Equal(t, payload.Metadata.Version, bound.Metadata.Version)
	require.Equal(t, payload.Metadata.AuthCode, bound.Metadata.AuthCode)
	require.NotNil(t, bound.Delta.Segments)
	require.NotNil(t, bound.Delta.Segments.New)
}

func TestSaveEquipmentPartnerRequestBinding(t *testing.T) {
	gin.SetMode(gin.TestMode)

	payload := services.SaveEquipmentPartnerRequest{
		ID:            "partner-1",
		Name:          "外协厂A",
		Type:          "EXTERNAL",
		ContactPerson: "张三",
		Phone:         "13800000000",
		Address:       "深圳",
	}

	body, err := json.Marshal(payload)
	require.NoError(t, err)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest("POST", "/api/v1/equipment-partners", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	ctx.Request = request

	var bound services.SaveEquipmentPartnerRequest
	err = ctx.ShouldBindJSON(&bound)
	require.NoError(t, err)
	require.Equal(t, payload.Name, bound.Name)
	require.Equal(t, payload.Type, bound.Type)
	require.Equal(t, payload.ContactPerson, bound.ContactPerson)
}

func TestPatchDrawingDeltaRequestBinding(t *testing.T) {
	gin.SetMode(gin.TestMode)

	payload := services.SDRTSDeltaHandlerRequest{
		Op: "PATCH",
		Delta: map[string]json.RawMessage{
			"status": json.RawMessage(`{"o":"DRAFT","n":"ACTIVE"}`),
		},
		Metadata: services.SDRTSDeltaMetadata{
			ID:      "drawing-1",
			Version: 2,
		},
	}

	body, err := json.Marshal(payload)
	require.NoError(t, err)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest("PATCH", "/api/v1/drawings/drawing-1", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	ctx.Request = request

	var bound services.SDRTSDeltaHandlerRequest
	err = ctx.ShouldBindJSON(&bound)
	require.NoError(t, err)
	require.Equal(t, payload.Op, bound.Op)
	require.Equal(t, payload.Metadata.ID, bound.Metadata.ID)
	require.Equal(t, payload.Metadata.Version, bound.Metadata.Version)
	require.Contains(t, bound.Delta, "status")
}
