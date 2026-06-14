package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const maxAssetUploadBytes int64 = 50 << 20

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
	default:
		return false
	}
}

// UploadAssetHandler 处理文件上传并保存到本地磁盘
func UploadAssetHandler(c *gin.Context) {
	// 1. 获取上传的文件
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[UPLOAD] 未接收到有效文件流 (file field is missing)"})
		return
	}

	// 2. 验证与生成新文件名 (UUID 防止冲突)
	ext := strings.ToLower(filepath.Ext(file.Filename))

	// 安全加固：后缀白名单校验 (防止上传 .html / .sh / .exe 等恶意文件)
	allowedExts := map[string]bool{
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
		".zip":  true,
		".rar":  true,
		".7z":   true,
		".doc":  true,
		".docx": true,
		".xls":  true,
		".xlsx": true,
	}

	if !allowedExts[ext] {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("[SECURITY] 不允许上传此类型的文件: %s", ext)})
		return
	}
	if file.Size <= 0 || file.Size > maxAssetUploadBytes {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[SECURITY] 文件大小不合法或超过 50MB 限制"})
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

	newFileName := fmt.Sprintf("%s%s", uuid.New().String(), ext)

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
