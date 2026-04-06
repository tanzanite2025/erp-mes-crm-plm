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

func TestStationProcessMappingHandlerRequestBinding(t *testing.T) {
	gin.SetMode(gin.TestMode)

	payload := services.StationProcessMappingHandlerRequest{
		StationID: "station-1",
		ProcessID: "step-1",
	}

	body, err := json.Marshal(payload)
	require.NoError(t, err)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest("POST", "/api/v1/production/mappings/assign", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	ctx.Request = request

	var bound services.StationProcessMappingHandlerRequest
	err = ctx.ShouldBindJSON(&bound)
	require.NoError(t, err)
	require.Equal(t, payload.StationID, bound.StationID)
	require.Equal(t, payload.ProcessID, bound.ProcessID)
}
