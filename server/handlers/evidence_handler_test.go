package handlers

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"xdfc-server/db"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestHandleEvidenceUploadSucceedsWhenRedisClientIsNil(t *testing.T) {
	gin.SetMode(gin.TestMode)

	worker := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, http.MethodPost, r.Method)
		require.Equal(t, "/v1/process-image", r.URL.Path)
		_, err := w.Write([]byte(`{"phash":"phash-nil-redis","webp_base64":"dGVzdC13ZWJw","width":1,"height":1}`))
		require.NoError(t, err)
	}))
	defer worker.Close()

	previousSearchClient := services.GlobalSearchClient
	previousRedisClient := db.RDB
	services.GlobalSearchClient = &services.SearchServiceClient{
		BaseURL:    worker.URL,
		HTTPClient: worker.Client(),
	}
	db.RDB = nil
	t.Cleanup(func() {
		services.GlobalSearchClient = previousSearchClient
		db.RDB = previousRedisClient
	})

	payload := &bytes.Buffer{}
	writer := multipart.NewWriter(payload)
	part, err := writer.CreateFormFile("file", "evidence.png")
	require.NoError(t, err)
	_, err = part.Write([]byte("fake-image-content"))
	require.NoError(t, err)
	require.NoError(t, writer.Close())

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(http.MethodPost, "/api/v1/sales-orders/evidence/upload", payload)
	request.Header.Set("Content-Type", writer.FormDataContentType())
	ctx.Request = request

	HandleEvidenceUpload(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var response EvidenceUploadResponse
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.False(t, response.IsDuplicate)
	require.NotEmpty(t, response.URL)

	storedPath := filepath.Join("uploads", response.URL)
	_, err = os.Stat(storedPath)
	require.NoError(t, err)
	t.Cleanup(func() {
		_ = os.Remove(storedPath)
		_ = os.Remove("uploads")
	})
}
