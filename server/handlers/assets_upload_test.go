package handlers

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func newMultipartAssetUploadRequest(
	t *testing.T,
	fileName string,
	sizeBytes int,
	metadata string,
) *http.Request {
	t.Helper()

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	if metadata != "" {
		if err := writer.WriteField("metadata", metadata); err != nil {
			t.Fatalf("write metadata field: %v", err)
		}
	}
	part, err := writer.CreateFormFile("file", fileName)
	if err != nil {
		t.Fatalf("create file field: %v", err)
	}
	content := bytes.Repeat([]byte("0"), sizeBytes)
	if strings.EqualFold(filepath.Ext(fileName), ".glb") && sizeBytes >= 4 {
		copy(content, []byte("glTF"))
		if sizeBytes > 4 {
			content[4] = 0
		}
	}
	if _, err := part.Write(content); err != nil {
		t.Fatalf("write file field: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close multipart writer: %v", err)
	}

	request := httptest.NewRequest(http.MethodPost, "/upload", &body)
	request.Header.Set("Content-Type", writer.FormDataContentType())
	return request
}

func performAssetUploadHandler(
	request *http.Request,
	handler gin.HandlerFunc,
) *httptest.ResponseRecorder {
	gin.SetMode(gin.TestMode)
	response := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(response)
	context.Request = request
	handler(context)
	return response
}

func TestUploadVehicleModelTemplateAssetHandlerRejectsOversizedBody(t *testing.T) {
	request := newMultipartAssetUploadRequest(
		t,
		"vehicle.glb",
		int(maxVehicleModelTemplateAssetUploadBytes)+(512<<10),
		"",
	)

	response := performAssetUploadHandler(
		request,
		UploadVehicleModelTemplateAssetHandler,
	)

	if response.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("expected 413 for oversized vehicle model upload, got %d: %s", response.Code, response.Body.String())
	}
}

func TestUploadVehicleModelTemplateAssetHandlerRejectsNonModelExtension(t *testing.T) {
	request := newMultipartAssetUploadRequest(t, "manual.pdf", 1024, "")

	response := performAssetUploadHandler(
		request,
		UploadVehicleModelTemplateAssetHandler,
	)

	if response.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for non-model extension, got %d: %s", response.Code, response.Body.String())
	}
}

func TestUploadVehicleModelTemplateAssetHandlerRejectsLegacyModelExtensions(t *testing.T) {
	request := newMultipartAssetUploadRequest(t, "vehicle.obj", 1024, "")

	response := performAssetUploadHandler(
		request,
		UploadVehicleModelTemplateAssetHandler,
	)

	if response.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for legacy vehicle model extension, got %d: %s", response.Code, response.Body.String())
	}
}

func TestUploadVehicleModelTemplateAssetHandlerUsesDedicatedFilePrefix(t *testing.T) {
	previousDir, err := os.Getwd()
	if err != nil {
		t.Fatalf("get current directory: %v", err)
	}
	uploadDir := t.TempDir()
	if err := os.Chdir(uploadDir); err != nil {
		t.Fatalf("switch to temporary upload directory: %v", err)
	}
	t.Cleanup(func() {
		_ = os.Chdir(previousDir)
	})

	request := newMultipartAssetUploadRequest(t, "vehicle.glb", 1024, "")
	response := performAssetUploadHandler(
		request,
		UploadVehicleModelTemplateAssetHandler,
	)

	if response.Code != http.StatusOK {
		t.Fatalf("expected successful vehicle model upload, got %d: %s", response.Code, response.Body.String())
	}

	var payload struct {
		URL string `json:"url"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode upload response: %v", err)
	}
	if !strings.HasPrefix(filepath.Base(payload.URL), "vehicle-model-template-") {
		t.Fatalf("expected dedicated vehicle model asset prefix, got %q", payload.URL)
	}
}

func TestUploadAssetHandlerRejectsVehicleModelTemplateIntentOnGenericEndpoint(t *testing.T) {
	request := newMultipartAssetUploadRequest(
		t,
		"vehicle.glb",
		1024,
		`{"intent":"VEHICLE_MODEL_TEMPLATE_UPLOAD"}`,
	)

	response := performAssetUploadHandler(request, UploadAssetHandler)

	if response.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for vehicle model upload on generic endpoint, got %d: %s", response.Code, response.Body.String())
	}
}
