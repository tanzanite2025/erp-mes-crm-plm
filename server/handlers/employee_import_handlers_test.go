package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestPreviewEmployeeImportHandlerRequiresFile(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(http.MethodPost, "/api/v1/employees/import/preview", nil)
	ctx.Request = request

	PreviewEmployeeImportHandler(ctx)

	require.Equal(t, http.StatusBadRequest, recorder.Code)
	require.Contains(t, recorder.Body.String(), "file is required")
}

func TestCommitEmployeeImportHandlerRejectsExpiredPreviewToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/employees/import/commit",
		strings.NewReader(`{"previewToken":"missing","mode":"sync"}`),
	)
	request.Header.Set("Content-Type", "application/json")
	ctx.Request = request

	CommitEmployeeImportHandler(ctx)

	require.Equal(t, http.StatusGone, recorder.Code)
	require.Contains(t, recorder.Body.String(), "preview token is invalid or expired")
}
