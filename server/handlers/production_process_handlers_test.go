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

func TestSaveProcessStepHandlerRequestBinding(t *testing.T) {
	gin.SetMode(gin.TestMode)

	payload := services.SaveProcessStepHandlerRequest{
		ProcessStepDTO: services.ProcessStepDTO{
			ID:        "step-1",
			Code:      "PROC-001",
			Name:      "Polish",
			SortOrder: 1,
			IsActive:  true,
		},
		StationID: "station-1",
	}

	body, err := json.Marshal(payload)
	require.NoError(t, err)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest("POST", "/api/v1/production/processes", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	ctx.Request = request

	var bound services.SaveProcessStepHandlerRequest
	err = ctx.ShouldBindJSON(&bound)
	require.NoError(t, err)
	require.Equal(t, payload.ID, bound.ID)
	require.Equal(t, payload.Code, bound.Code)
	require.Equal(t, payload.Name, bound.Name)
	require.Equal(t, payload.StationID, bound.StationID)
}
