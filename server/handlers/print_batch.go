package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgconn"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const maxPrintSequenceValue int64 = 60466175

var canonicalLinearBarcodeFullCodePattern = regexp.MustCompile(
	`^\d{2}[1-90ND](?:0[1-9]|[12]\d|3[01])\d{3}[RD]\d{6}$`,
)

var (
	ErrPrintBatchActivationRequiresLinearBarcodeScan = errors.New("product-code print batches can only be activated by scanning")
	ErrPrintBatchLifecycleFieldsAreManaged           = errors.New("print batch lifecycle fields are managed by lifecycle actions")
	ErrPrintBatchWithProductCodeInventoryIsImmutable = errors.New("print batch with product-code inventory cannot be edited")
	ErrPrintBatchNotActivatable                      = errors.New("print batch is not in an activatable state")
)

func isPrintBatchFullCodeConflict(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) &&
		pgErr.Code == "23505" &&
		strings.Contains(strings.ToLower(pgErr.ConstraintName), "full_code")
}

// generateBatchNo generates a daily incremental batch number like P20260327-001.
func generateBatchNo(tx *gorm.DB) (string, error) {
	return services.GeneratePrintBatchNoTx(tx, time.Now())
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
	input.FullCode = strings.ToUpper(strings.TrimSpace(input.FullCode))
	input.StartSN = strings.ToUpper(strings.TrimSpace(input.StartSN))

	if input.TemplateName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] templateName 不能为空"})
		return
	}
	if input.Quantity <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] quantity 必须大于 0"})
		return
	}
	if input.FullCode != "" {
		if input.Quantity != 1 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "[BUSINESS_RULE_VIOLATION] 单个完整条码只能对应一枚标签，批量打印必须先生成并保存逐枚唯一条码",
				"code":  "LINEAR_BARCODE_UNIQUE_CODES_REQUIRED",
			})
			return
		}
		if !canonicalLinearBarcodeFullCodePattern.MatchString(input.FullCode) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "[VALIDATION] fullCode 必须是符合当前协议的 15 位一维码",
				"code":  "LINEAR_BARCODE_INVALID_FULL_CODE",
			})
			return
		}

		expectedStartSN := input.FullCode[len(input.FullCode)-4:]
		if input.StartSN == "" {
			input.StartSN = expectedStartSN
		}
		if input.StartSN != expectedStartSN {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "[VALIDATION] startSn 必须与 fullCode 末四位流水号一致",
				"code":  "LINEAR_BARCODE_START_SN_MISMATCH",
			})
			return
		}
	}

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
			var productCodeInventoryItemCount int64
			if err := tx.Unscoped().Model(&models.LinearBarcodeInventoryItem{}).
				Where("batch_id = ?", existing.ID).
				Count(&productCodeInventoryItemCount).Error; err != nil {
				return err
			}
			if productCodeInventoryItemCount > 0 {
				return ErrPrintBatchWithProductCodeInventoryIsImmutable
			}
			if (input.Status != "" && input.Status != existing.Status) ||
				(input.ActivatedCount > 0 && input.ActivatedCount != existing.ActivatedCount) ||
				(existing.ActivatedCount > 0 && input.Quantity != existing.Quantity) {
				return ErrPrintBatchLifecycleFieldsAreManaged
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
		input.ActivatedCount = 0
		input.Status = "Printed"
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
		if errors.Is(err, ErrPrintBatchWithProductCodeInventoryIsImmutable) {
			c.JSON(http.StatusConflict, gin.H{
				"error": "[BUSINESS_RULE_VIOLATION] 已签发逐枚产品编码的打印批次不能通过通用保存接口修改",
				"code":  "PRODUCT_CODE_PRINT_BATCH_IS_IMMUTABLE",
			})
			return
		}
		if errors.Is(err, ErrPrintBatchLifecycleFieldsAreManaged) {
			c.JSON(http.StatusConflict, gin.H{
				"error": "[BUSINESS_RULE_VIOLATION] 激活数和批次状态只能通过专用生命周期操作更新；开始激活后不能修改批次数量",
				"code":  "PRINT_BATCH_LIFECYCLE_FIELDS_ARE_MANAGED",
			})
			return
		}
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "[NOT_FOUND] 打印批次不存在"})
			return
		}
		if isPrintBatchFullCodeConflict(err) {
			c.JSON(http.StatusConflict, gin.H{
				"error": "[BUSINESS_RULE_VIOLATION] 该一维码已存在打印批次，禁止重复生成",
				"code":  "LINEAR_BARCODE_DUPLICATE_FULL_CODE",
			})
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
	if req.Count <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] count 必须大于 0"})
		return
	}

	var batch models.PrintBatch
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&batch, "id = ?", id).Error; err != nil {
			return err
		}
		if req.Version != batch.Version {
			return ErrVersionConflict
		}

		var productCodeInventoryItemCount int64
		if err := tx.Unscoped().Model(&models.LinearBarcodeInventoryItem{}).
			Where("batch_id = ?", id).
			Count(&productCodeInventoryItemCount).Error; err != nil {
			return err
		}
		if productCodeInventoryItemCount > 0 {
			return ErrPrintBatchActivationRequiresLinearBarcodeScan
		}
		if batch.Status != "Printed" && batch.Status != "PartiallyActivated" {
			return ErrPrintBatchNotActivatable
		}

		if batch.Quantity <= 0 || batch.ActivatedCount < 0 || batch.ActivatedCount > batch.Quantity {
			return ErrPrintBatchNotActivatable
		}

		remainingCount := batch.Quantity - batch.ActivatedCount
		newCount := batch.Quantity
		if req.Count < remainingCount {
			newCount = batch.ActivatedCount + req.Count
		}

		status := "PartiallyActivated"
		if newCount == batch.Quantity {
			status = "Activated"
		}

		result := tx.Model(&batch).Where("id = ? AND version = ?", id, req.Version).Updates(map[string]interface{}{
			"activated_count": newCount,
			"status":          status,
			"version":         batch.Version + 1,
		})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected != 1 {
			return ErrVersionConflict
		}

		return nil
	})

	if err != nil {
		if err == ErrVersionConflict {
			respondVersionConflict(c)
			return
		}
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "[NOT_FOUND] 打印批次不存在"})
			return
		}
		if errors.Is(err, ErrPrintBatchActivationRequiresLinearBarcodeScan) {
			c.JSON(http.StatusConflict, gin.H{
				"error": "[BUSINESS_RULE_VIOLATION] 产品编码批次只能通过扫码绑定更新激活状态",
				"code":  "LINEAR_BARCODE_SCAN_REQUIRED_FOR_ACTIVATION",
			})
			return
		}
		if errors.Is(err, ErrPrintBatchNotActivatable) {
			c.JSON(http.StatusConflict, gin.H{
				"error": "[BUSINESS_RULE_VIOLATION] 已激活或已报废的打印批次不能再次激活",
				"code":  "PRINT_BATCH_NOT_ACTIVATABLE",
			})
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
		return services.ScrapLinearBarcodePrintBatchTx(tx, id)
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
	if req.Quantity <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] quantity 必须大于 0"})
		return
	}

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
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("key = ?", key).First(&seq).Error; err != nil {
			return err
		}

		startValue := seq.Value + 1
		nextValue := seq.Value + int64(req.Quantity)
		if nextValue > maxPrintSequenceValue {
			return fmt.Errorf("流水号已达到 36 进制 5 位上限")
		}
		result := tx.Model(&models.Sequence{}).
			Where("key = ? AND value = ?", key, seq.Value).
			Update("value", nextValue)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return ErrVersionConflict
		}

		batchNo, err := generateBatchNo(tx)
		if err != nil {
			return err
		}

		sn = toBase36(startValue)
		sn = fmt.Sprintf("%05s", sn)
		batch = models.PrintBatch{
			BatchNo:      batchNo,
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
