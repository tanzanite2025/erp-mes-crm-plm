package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"xdfc-server/authz"
	"xdfc-server/middleware"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const (
	maxAssetUploadBytes                     int64 = 50 << 20
	maxVehicleModelTemplateAssetUploadBytes int64 = 8 << 20
	assetUploadMultipartOverheadBytes       int64 = 64 << 10
)

const vehicleModelTemplateUploadIntent = "VEHICLE_MODEL_TEMPLATE_UPLOAD"

type assetUploadMetadata struct {
	Intent string `json:"intent"`
}

type assetUploadPolicy struct {
	MaxBytes               int64
	MaxSizeLabel           string
	AllowedExtensions      map[string]bool
	RejectVehicleModelHint bool
	FileNamePrefix         string
}

func parseAssetUploadMetadata(c *gin.Context) assetUploadMetadata {
	rawMetadata := strings.TrimSpace(c.PostForm("metadata"))
	if rawMetadata == "" {
		return assetUploadMetadata{}
	}

	var metadata assetUploadMetadata
	if err := json.Unmarshal([]byte(rawMetadata), &metadata); err != nil {
		return assetUploadMetadata{}
	}
	return metadata
}

func enforceAssetUploadIntentPermission(c *gin.Context, metadata assetUploadMetadata) bool {
	if strings.EqualFold(strings.TrimSpace(metadata.Intent), vehicleModelTemplateUploadIntent) &&
		!middleware.HasAnyPermission(c, authz.PermissionManage) {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "[AUTH] 管理车型模型模板需要管理权限",
		})
		c.Abort()
		return false
	}

	return true
}

func generalAssetUploadAllowedExtensions() map[string]bool {
	return map[string]bool{
		".pdf":  true,
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".gif":  true,
		".dwg":  true,
		".dxf":  true,
		".stp":  true,
		".step": true,
		".xt":   true,
		".obj":  true,
		".glb":  true,
		".gltf": true,
		".stl":  true,
		".fbx":  true,
		".zip":  true,
		".rar":  true,
		".7z":   true,
		".doc":  true,
		".docx": true,
		".xls":  true,
		".xlsx": true,
	}
}

func vehicleModelTemplateAssetUploadAllowedExtensions() map[string]bool {
	return map[string]bool{
		".glb": true,
	}
}

func isDetectedAssetContentAllowed(ext string, detected string) bool {
	contentType := strings.ToLower(strings.TrimSpace(strings.Split(detected, ";")[0]))
	switch ext {
	case ".pdf":
		return contentType == "application/pdf"
	case ".jpg", ".jpeg":
		return contentType == "image/jpeg"
	case ".png":
		return contentType == "image/png"
	case ".gif":
		return contentType == "image/gif"
	case ".zip", ".docx", ".xlsx":
		return contentType == "application/zip" ||
			contentType == "application/x-zip-compressed" ||
			contentType == "application/octet-stream"
	case ".rar":
		return contentType == "application/vnd.rar" ||
			contentType == "application/x-rar-compressed" ||
			contentType == "application/octet-stream"
	case ".7z":
		return contentType == "application/x-7z-compressed" ||
			contentType == "application/octet-stream"
	case ".doc":
		return contentType == "application/msword" ||
			contentType == "application/octet-stream"
	case ".xls":
		return contentType == "application/vnd.ms-excel" ||
			contentType == "application/octet-stream"
	case ".dwg", ".stp", ".step", ".xt":
		return contentType == "application/octet-stream"
	case ".dxf":
		return contentType == "text/plain" ||
			contentType == "application/octet-stream"
	case ".obj", ".stl":
		return contentType == "text/plain" ||
			contentType == "application/octet-stream"
	case ".glb", ".fbx":
		return contentType == "application/octet-stream" ||
			contentType == "model/gltf-binary"
	case ".gltf":
		return contentType == "application/json" ||
			contentType == "text/plain" ||
			contentType == "application/octet-stream"
	default:
		return false
	}
}

func writeAssetUploadTooLarge(c *gin.Context, maxSizeLabel string) {
	c.JSON(http.StatusRequestEntityTooLarge, gin.H{
		"error": "[SECURITY] 文件大小不合法或超过 " + maxSizeLabel + " 限制",
	})
}

func uploadAssetWithPolicy(c *gin.Context, policy assetUploadPolicy) {
	c.Request.Body = http.MaxBytesReader(
		c.Writer,
		c.Request.Body,
		policy.MaxBytes+assetUploadMultipartOverheadBytes,
	)

	metadata := parseAssetUploadMetadata(c)
	if policy.RejectVehicleModelHint &&
		strings.EqualFold(strings.TrimSpace(metadata.Intent), vehicleModelTemplateUploadIntent) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "[VALIDATION] 车型模型模板源文件必须使用专用上传接口",
		})
		return
	}
	if !enforceAssetUploadIntentPermission(c, metadata) {
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "request body too large") {
			writeAssetUploadTooLarge(c, policy.MaxSizeLabel)
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": "[UPLOAD] 未接收到有效文件流 (file field is missing)"})
		return
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	if !policy.AllowedExtensions[ext] {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("[SECURITY] 不允许上传此类型的文件: %s", ext)})
		return
	}
	if file.Size <= 0 || file.Size > policy.MaxBytes {
		writeAssetUploadTooLarge(c, policy.MaxSizeLabel)
		return
	}
	openedFile, err := file.Open()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[UPLOAD] 无法读取上传文件"})
		return
	}
	defer openedFile.Close()
	header := make([]byte, 512)
	bytesRead, readErr := openedFile.Read(header)
	if readErr != nil && readErr != io.EOF {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[UPLOAD] 无法识别上传文件内容"})
		return
	}
	detectedContentType := http.DetectContentType(header[:bytesRead])
	if !isDetectedAssetContentAllowed(ext, detectedContentType) {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("[SECURITY] 文件内容类型与扩展名不匹配: %s", detectedContentType)})
		return
	}

	newFileName := fmt.Sprintf("%s%s%s", policy.FileNamePrefix, uuid.New().String(), ext)

	// 3. 确保本地 uploads 目录存在 (双重保障)
	uploadDir := "uploads"
	if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
		if err := os.MkdirAll(uploadDir, 0755); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 无法创建上传目录: " + err.Error()})
			return
		}
	}

	// 4. 保存文件
	dst := filepath.Join(uploadDir, newFileName)
	if err := c.SaveUploadedFile(file, dst); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 文件保存失败: " + err.Error()})
		return
	}

	// 5. 返回访问路径 (相对路径，由 Nginx 或后端静态转发)
	// 目前 Nginx 将代理 /uploads/ 到物理目录
	fileURL := fmt.Sprintf("/uploads/%s", newFileName)

	c.JSON(http.StatusOK, gin.H{
		"status":   "success",
		"url":      fileURL,
		"fileName": file.Filename,
		"size":     file.Size,
	})
}

// UploadAssetHandler 处理通用文件上传并保存到本地磁盘。
func UploadAssetHandler(c *gin.Context) {
	uploadAssetWithPolicy(c, assetUploadPolicy{
		MaxBytes:               maxAssetUploadBytes,
		MaxSizeLabel:           "50MB",
		AllowedExtensions:      generalAssetUploadAllowedExtensions(),
		RejectVehicleModelHint: true,
	})
}

// UploadVehicleModelTemplateAssetHandler handles controlled 3D source uploads
// for vehicle model templates. This route has its own small hard body limit
// before multipart parsing, so template uploads cannot consume the generic
// 50MB asset ingress budget.
func UploadVehicleModelTemplateAssetHandler(c *gin.Context) {
	uploadAssetWithPolicy(c, assetUploadPolicy{
		MaxBytes:          maxVehicleModelTemplateAssetUploadBytes,
		MaxSizeLabel:      "8MB",
		AllowedExtensions: vehicleModelTemplateAssetUploadAllowedExtensions(),
		FileNamePrefix:    services.VehicleModelTemplateSourceAssetFilePrefix,
	})
}

func ServeUploadedAssetHandler(c *gin.Context) {
	requestedPath := strings.TrimSpace(strings.TrimPrefix(c.Param("filepath"), "/"))
	if requestedPath == "" || strings.Contains(requestedPath, "\\") {
		c.Status(http.StatusNotFound)
		return
	}

	cleanedPath := filepath.Clean(requestedPath)
	if cleanedPath == "." ||
		cleanedPath == ".." ||
		strings.HasPrefix(cleanedPath, ".."+string(os.PathSeparator)) ||
		cleanedPath != filepath.Base(cleanedPath) {
		c.Status(http.StatusNotFound)
		return
	}

	fullPath := filepath.Join("uploads", cleanedPath)
	fileInfo, err := os.Stat(fullPath)
	if err != nil || fileInfo.IsDir() {
		c.Status(http.StatusNotFound)
		return
	}

	c.Header("Cache-Control", "private, no-store, max-age=0")
	c.Header("Pragma", "no-cache")
	c.Header("X-Content-Type-Options", "nosniff")
	c.File(fullPath)
}
