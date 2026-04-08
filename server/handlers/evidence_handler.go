package handlers

import (
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"
	"xdfc-server/db"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
)

const (
	REDIS_PHASH_KEY = "xdfc:evidence:phashes"
	MAX_UPLOAD_SIZE = 10 << 20 // 10MB 工业安全阈值
)

// EvidenceUploadResponse 返回给前端的结构
type EvidenceUploadResponse struct {
	ID          string `json:"id"`
	URL         string `json:"url"`
	Name        string `json:"name"`
	UploadedAt  string `json:"uploadedAt"`
	IsDuplicate bool   `json:"isDuplicate"`
}

/**
 * HandleEvidenceUpload 处理凭据加固上传逻辑
 * 核心安全项:
 *   1. DoS 防护: 物理限制 Request Body 大小
 *   2. 路径加固: UUID 随机命名，杜绝文件名注入
 *   3. 存储复用: 视觉查重命中后直接引用旧文件，节省存储空间
 */
func HandleEvidenceUpload(c *gin.Context) {
	// [SECURITY] DoS 锁死：限制整个 Request Body 的大小
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, MAX_UPLOAD_SIZE)

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		// 如果是因为超大文件导致的错误
		if err.Error() == "http: request body too large" {
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": "Content too large (Max 10MB)"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}
	defer file.Close()

	// 1. 读取原始数据
	rawData, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file"})
		return
	}

	// 2. 调用 Rust 算力插件处理图像
	if services.GlobalSearchClient == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Image worker offline"})
		return
	}

	processed, err := services.GlobalSearchClient.ProcessImage(rawData)
	if err != nil {
		log.Error().Err(err).Msg("Rust image processor failed")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Image processing failed"})
		return
	}

	// 3. Redis 感知哈希查重 (pHash)
	isDuplicate := false
	var fileName string
	
	// [CRITICAL] 增强健壮性：检查 Redis 客户端是否初始化
	if db.RDB != nil {
		existingFileName, err := db.RDB.HGet(c.Request.Context(), REDIS_PHASH_KEY, processed.PHash).Result()
		if err == nil && existingFileName != "" {
			isDuplicate = true
			fileName = existingFileName // 查重命中，直接复用旧文件名
			log.Info().Str("phash", processed.PHash).Str("existing", fileName).Msg("Storage Optimization: Reusing existing physical file for duplicate pHash")
		}
	} else {
		log.Warn().Msg("Redis client (RDB) is nil, skipping perceptual hash deduplication to maintain service availability")
	}

	// 4. 持久化 (仅在非重复时执行物理写入)
	if !isDuplicate {
		// [INFRA] 确保存储目录存在
		if err := os.MkdirAll("uploads", 0755); err != nil {
			log.Error().Err(err).Msg("Failed to initialize uploads directory")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Storage infrastructure error"})
			return
		}

		// [SECURITY] 使用随机 UUID 命名，彻底规避路径穿越与恶意文件名攻击
		fileName = fmt.Sprintf("ev-%s.webp", uuid.New().String())
		storagePath := filepath.Join("uploads", fileName)

		webpBytes, err := base64.StdEncoding.DecodeString(processed.WebPBase64)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode processed image"})
			return
		}

		if err := os.WriteFile(storagePath, webpBytes, 0644); err != nil {
			log.Error().Err(err).Msg("Failed to write to physical storage")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Disk write failed"})
			return
		}

		// 5. 登记 Redis 指纹库 (仅非重复时)
		db.RDB.HSet(c.Request.Context(), REDIS_PHASH_KEY, processed.PHash, fileName)
	}

	c.JSON(http.StatusOK, EvidenceUploadResponse{
		ID:          fmt.Sprintf("ev-%d", time.Now().UnixNano()),
		URL:         fileName, // 前端透传，NGINX 负责 /uploads/ 代理
		Name:        header.Filename,
		UploadedAt:  time.Now().Format(time.RFC3339),
		IsDuplicate: isDuplicate,
	})
}
