package handlers

import (
	"fmt"
	"net/http"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// generateBatchNo generates a daily incremental batch number like P20260327-001.
func generateBatchNo(tx *gorm.DB) (string, error) {
	dateStr := time.Now().Format("20060102")
	prefix := "P" + dateStr

	var count int64
	if err := tx.Model(&models.PrintBatch{}).Where("batch_no LIKE ?", prefix+"%").Count(&count).Error; err != nil {
		return "", err
	}

	return fmt.Sprintf("%s-%03d", prefix, count+1), nil
}

// GetPrintBatchesHandler returns all print batches.
func GetPrintBatchesHandler(c *gin.Context) {
	var batches []models.PrintBatch
	if err := db.DB.Order("created_at desc").Find(&batches).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取打印批次失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, batches)
}

// SavePrintBatchHandler creates or updates a print batch.
func SavePrintBatchHandler(c *gin.Context) {
	var input models.PrintBatch
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 打印批次数据格式错误: " + err.Error()})
		return
	}

	input.TemplateName = strings.TrimSpace(input.TemplateName)

	productID, err := normalizeOptionalUUIDString(input.ProductID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] productId UUID 格式错误"})
		return
	}
	input.ProductID = productID

	bomID, err := normalizeOptionalUUIDString(input.BOMID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] bomId UUID 格式错误"})
		return
	}
	input.BOMID = bomID

	err = db.DB.Transaction(func(tx *gorm.DB) error {

		if input.ID != "" {
			var existing models.PrintBatch
			if err := tx.Where("id = ?", input.ID).First(&existing).Error; err != nil {
				return err
			}
			if input.Version != existing.Version {
				return ErrVersionConflict
			}

			input.Version = existing.Version + 1
			updateTx := tx.Model(&existing)
			if input.ProductID == "" {
				updateTx = updateTx.Omit("ProductID")
			}
			if input.BOMID == "" {
				updateTx = updateTx.Omit("BOMID")
			}
			if err := updateTx.Updates(input).Error; err != nil {
				return err
			}
			if input.ProductID == "" {
				if err := tx.Model(&existing).Update("product_id", nil).Error; err != nil {
					return err
				}
			}
			if input.BOMID == "" {
				if err := tx.Model(&existing).Update("bom_id", nil).Error; err != nil {
					return err
				}
			}

			return nil
		}

		if input.BatchNo == "" {
			no, err := generateBatchNo(tx)
			if err != nil {
				return err
			}
			input.BatchNo = no
		}

		input.Version = 1
		createTx := tx
		if input.ProductID == "" {
			createTx = createTx.Omit("ProductID")
		}
		if input.BOMID == "" {
			createTx = createTx.Omit("BOMID")
		}
		if err := createTx.Create(&input).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		if err == ErrVersionConflict {
			respondVersionConflict(c)
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 保存失败: " + err.Error()})
		return
	}

	db.DB.First(&input, "id = ?", input.ID)
	c.JSON(http.StatusOK, input)
}

// ActivateBatchHandler marks a batch as activated.
func ActivateBatchHandler(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Count   int `json:"count"`
		Version int `json:"_v"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 激活参数格式错误"})
		return
	}

	var batch models.PrintBatch
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.First(&batch, "id = ?", id).Error; err != nil {
			return err
		}
		if req.Version != batch.Version {
			return ErrVersionConflict
		}

		newCount := batch.ActivatedCount + req.Count
		if newCount > batch.Quantity {
			newCount = batch.Quantity
		}

		status := "PartiallyActivated"
		if newCount == batch.Quantity {
			status = "Activated"
		}

		if err := tx.Model(&batch).Where("id = ? AND version = ?", id, req.Version).Updates(map[string]interface{}{
			"activated_count": newCount,
			"status":          status,
			"version":         batch.Version + 1,
		}).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		if err == ErrVersionConflict {
			respondVersionConflict(c)
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 激活失败: " + err.Error()})
		return
	}

	db.DB.First(&batch, "id = ?", id)
	c.JSON(http.StatusOK, batch)
}

// ScrapBatchHandler marks a batch as scrapped.
func ScrapBatchHandler(c *gin.Context) {
	id := c.Param("id")
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var batch models.PrintBatch
		if err := tx.First(&batch, "id = ?", id).Error; err != nil {
			return err
		}

		if err := tx.Model(&batch).Update("status", "Scrapped").Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 报废失败: " + err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

// AtomicPrintHandler performs sequence allocation and print batch creation atomically.
func AtomicPrintHandler(c *gin.Context) {
	var req struct {
		ProductID    string `json:"productId"`
		BOMID        string `json:"bomId"`
		TemplateName string `json:"templateName"`
		Quantity     int    `json:"quantity"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 打印参数错误"})
		return
	}

	req.TemplateName = strings.TrimSpace(req.TemplateName)

	productID, err := normalizeOptionalUUIDString(req.ProductID)
	if err != nil || productID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] productId 必须是有效 UUID"})
		return
	}
	req.ProductID = productID

	bomID, err := normalizeOptionalUUIDString(req.BOMID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] bomId UUID 格式错误"})
		return
	}
	req.BOMID = bomID

	var batch models.PrintBatch
	var sn string

	err = db.DB.Transaction(func(tx *gorm.DB) error {
		key := fmt.Sprintf("product:%s:dm_sn", req.ProductID)
		var seq models.Sequence

		if err := tx.Where(models.Sequence{Key: key}).FirstOrCreate(&seq).Error; err != nil {
			return err
		}
		if err := tx.Raw("SELECT * FROM sequences WHERE key = ? FOR UPDATE", key).Scan(&seq).Error; err != nil {
			return err
		}

		seq.Value++
		if seq.Value > 60466175 {
			return fmt.Errorf("流水号已达到 36 进制 5 位上限")
		}
		if err := tx.Model(&seq).Update("value", seq.Value).Error; err != nil {
			return err
		}

		sn = toBase36(seq.Value)
		sn = fmt.Sprintf("%05s", sn)
		batch = models.PrintBatch{
			TemplateName: req.TemplateName,
			ProductID:    req.ProductID,
			BOMID:        req.BOMID,
			Quantity:     req.Quantity,
			StartSN:      sn,
			Status:       "Printed",
			Version:      1,
		}

		createTx := tx
		if req.BOMID == "" {
			createTx = createTx.Omit("BOMID")
		}
		if err := createTx.Create(&batch).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		if err == ErrVersionConflict {
			respondVersionConflict(c)
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 云端排号失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"batch": batch,
		"sn":    sn,
	})
}

// GetNextSequenceHandler returns the next sequence value in base36.
func GetNextSequenceHandler(c *gin.Context) {
	key := c.Query("key")
	if key == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 缺少 Key 参数"})
		return
	}

	var seq models.Sequence
	var sn string
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where(models.Sequence{Key: key}).FirstOrCreate(&seq).Error; err != nil {
			return err
		}
		if err := tx.Raw("SELECT * FROM sequences WHERE key = ? FOR UPDATE", key).Scan(&seq).Error; err != nil {
			return err
		}

		seq.Value++
		if seq.Value > 60466175 {
			return fmt.Errorf("溢出")
		}
		if err := tx.Model(&seq).Update("value", seq.Value).Error; err != nil {
			return err
		}

		sn = toBase36(seq.Value)
		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取流水号失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"value": seq.Value, "sn": sn})
}

// toBase36 converts a number to a zero-padded five-character base36 string.
func toBase36(n int64) string {
	const charset = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
	res := make([]byte, 5)
	for i := 4; i >= 0; i-- {
		res[i] = charset[n%36]
		n /= 36
	}
	return string(res)
}
