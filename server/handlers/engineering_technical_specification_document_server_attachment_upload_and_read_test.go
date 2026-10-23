package handlers

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestTechnicalSpecificationDocumentServerAttachmentsUploadAndReadAcrossRequests(t *testing.T) {
	previousDirectory, err := os.Getwd()
	require.NoError(t, err)
	require.NoError(t, os.Chdir(t.TempDir()))
	t.Cleanup(func() { require.NoError(t, os.Chdir(previousDirectory)) })
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/upload", UploadAssetHandler)
	router.GET("/uploads/*filepath", ServeUploadedAssetHandler)
	for _, extension := range []string{"pdf", "xlsx", "docx"} {
		t.Run(extension, func(t *testing.T) {
			content := []byte("%PDF-1.4\n% isolated specification attachment\n")
			if extension != "pdf" {
				var archive bytes.Buffer
				writer := zip.NewWriter(&archive)
				file, err := writer.Create("[Content_Types].xml")
				require.NoError(t, err)
				_, err = file.Write([]byte(`<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>`))
				require.NoError(t, err)
				require.NoError(t, writer.Close())
				content = archive.Bytes()
			}
			var requestBody bytes.Buffer
			multipartWriter := multipart.NewWriter(&requestBody)
			require.NoError(t, multipartWriter.WriteField("metadata", `{"intent":"ASSET_UPLOAD"}`))
			file, err := multipartWriter.CreateFormFile("file", "工艺规范."+extension)
			require.NoError(t, err)
			_, err = file.Write(content)
			require.NoError(t, err)
			require.NoError(t, multipartWriter.Close())
			request := httptest.NewRequest(http.MethodPost, "/upload", &requestBody)
			request.Header.Set("Content-Type", multipartWriter.FormDataContentType())
			uploadResponse := httptest.NewRecorder()
			router.ServeHTTP(uploadResponse, request)
			require.Equal(t, http.StatusOK, uploadResponse.Code, uploadResponse.Body.String())
			var uploaded struct {
				URL string `json:"url"`
			}
			require.NoError(t, json.Unmarshal(uploadResponse.Body.Bytes(), &uploaded))
			require.Contains(t, uploaded.URL, "/uploads/")
			readResponse := httptest.NewRecorder()
			router.ServeHTTP(readResponse, httptest.NewRequest(http.MethodGet, uploaded.URL, nil))
			require.Equal(t, http.StatusOK, readResponse.Code, readResponse.Body.String())
			require.Equal(t, content, readResponse.Body.Bytes())
			require.Equal(t, "nosniff", readResponse.Header().Get("X-Content-Type-Options"))
		})
	}
}
