package handlers

import (
	"bytes"
	"errors"
	"fmt"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const (
	maxEnterpriseLogoUploadBytes int64 = 512 << 10
	maxEnterpriseLogoDimension         = 1024
	minEnterpriseLogoDimension         = 16
)

func detectEnterpriseLogoExtension(contentType string) (string, error) {
	switch strings.ToLower(strings.TrimSpace(strings.Split(contentType, ";")[0])) {
	case "image/png":
		return ".png", nil
	case "image/jpeg":
		return ".jpg", nil
	default:
		return "", errors.New("[SECURITY] enterprise logo must be PNG or JPEG")
	}
}

func validateEnterpriseLogoBytes(data []byte) (string, error) {
	detectedContentType := http.DetectContentType(data)
	ext, err := detectEnterpriseLogoExtension(detectedContentType)
	if err != nil {
		return "", err
	}

	config, _, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil {
		return "", errors.New("[SECURITY] enterprise logo image is invalid")
	}
	if config.Width < minEnterpriseLogoDimension || config.Height < minEnterpriseLogoDimension {
		return "", fmt.Errorf("[SECURITY] enterprise logo must be at least %dx%d px", minEnterpriseLogoDimension, minEnterpriseLogoDimension)
	}
	if config.Width > maxEnterpriseLogoDimension || config.Height > maxEnterpriseLogoDimension {
		return "", fmt.Errorf("[SECURITY] enterprise logo must be no larger than %dx%d px", maxEnterpriseLogoDimension, maxEnterpriseLogoDimension)
	}

	return ext, nil
}

func readEnterpriseLogoUpload(c *gin.Context) ([]byte, error) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxEnterpriseLogoUploadBytes+(64<<10))
	file, err := c.FormFile("file")
	if err != nil {
		return nil, errors.New("[UPLOAD] file field is required")
	}
	if file.Size <= 0 || file.Size > maxEnterpriseLogoUploadBytes {
		return nil, errors.New("[SECURITY] enterprise logo must be 512KB or smaller")
	}

	openedFile, err := file.Open()
	if err != nil {
		return nil, errors.New("[UPLOAD] failed to read enterprise logo")
	}
	defer openedFile.Close()

	data, err := io.ReadAll(io.LimitReader(openedFile, maxEnterpriseLogoUploadBytes+1))
	if err != nil {
		return nil, errors.New("[UPLOAD] failed to read enterprise logo")
	}
	if int64(len(data)) > maxEnterpriseLogoUploadBytes {
		return nil, errors.New("[SECURITY] enterprise logo must be 512KB or smaller")
	}

	return data, nil
}

func currentEnterpriseConfig() models.EnterpriseConfig {
	var config models.EnterpriseConfig
	if err := db.DB.First(&config).Error; err != nil {
		return models.EnterpriseConfig{}
	}
	return config
}

func enterpriseLogoStoragePathFromURL(logoURL string) (string, bool) {
	trimmedURL := strings.TrimSpace(logoURL)
	if !strings.HasPrefix(trimmedURL, "/uploads/enterprise-logo-") {
		return "", false
	}

	fileName := strings.TrimPrefix(trimmedURL, "/uploads/")
	if fileName == "" ||
		strings.Contains(fileName, "..") ||
		strings.Contains(fileName, "/") ||
		strings.Contains(fileName, "\\") {
		return "", false
	}

	ext := strings.ToLower(filepath.Ext(fileName))
	if ext != ".png" && ext != ".jpg" && ext != ".jpeg" {
		return "", false
	}

	return filepath.Join("uploads", fileName), true
}

func removePreviousEnterpriseLogo(previousURL string, nextURL string) {
	if strings.TrimSpace(previousURL) == strings.TrimSpace(nextURL) {
		return
	}
	previousPath, ok := enterpriseLogoStoragePathFromURL(previousURL)
	if !ok {
		return
	}
	_ = os.Remove(previousPath)
}

func UploadEnterpriseLogoHandler(c *gin.Context) {
	data, err := readEnterpriseLogoUpload(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ext, err := validateEnterpriseLogoBytes(data)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := os.MkdirAll("uploads", 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to prepare upload storage: " + err.Error()})
		return
	}

	fileName := fmt.Sprintf("enterprise-logo-%s%s", uuid.NewString(), ext)
	dst := filepath.Join("uploads", fileName)
	if err := os.WriteFile(dst, data, 0644); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to store enterprise logo: " + err.Error()})
		return
	}

	logoURL := "/uploads/" + fileName
	config := currentEnterpriseConfig()
	previousLogoURL := config.LogoURL
	config.LogoURL = logoURL
	if err := services.SaveEnterpriseConfig(auditContextFromGin(c), &config); err != nil {
		_ = os.Remove(dst)
		respondDomainError(c, err, "[SERVER] failed to update enterprise logo: ")
		return
	}
	removePreviousEnterpriseLogo(previousLogoURL, logoURL)

	var updated models.EnterpriseConfig
	if err := db.DB.First(&updated).Error; err == nil {
		services.ApplyEnterpriseConfigDefaults(&updated)
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"logoUrl": logoURL,
		"size":    len(data),
		"config":  updated,
	})
}
