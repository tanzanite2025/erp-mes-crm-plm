package handlers

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"
	"xdfc-server/middleware"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

type scanIngestRequest struct {
	RawCode      string                 `json:"rawCode" binding:"required"`
	Symbology    string                 `json:"symbology"`
	DeviceID     string                 `json:"deviceId"`
	Scene        string                 `json:"scene"`
	TaskID       string                 `json:"taskId"`
	MaterialCode string                 `json:"materialCode"`
	BatchNo      string                 `json:"batchNo"`
	ScannedQty   float64                `json:"scannedQty"`
	ScanTime     *time.Time             `json:"scanTime"`
	ScannerID    string                 `json:"scannerId"`
	Metadata     map[string]interface{} `json:"metadata"`
}

type scanResolvedPayload struct {
	Product  *services.ResolvedProduct  `json:"product,omitempty"`
	Material *services.ResolvedMaterial `json:"material,omitempty"`
}

type scanBridgeResult struct {
	Applied      bool    `json:"applied"`
	TaskID       string  `json:"taskId,omitempty"`
	MaterialCode string  `json:"materialCode,omitempty"`
	BatchNo      string  `json:"batchNo,omitempty"`
	ScannedQty   float64 `json:"scannedQty,omitempty"`
}

type scanEventPayload struct {
	RawCode   string                             `json:"rawCode"`
	Protocol  string                             `json:"protocol"`
	Symbology string                             `json:"symbology"`
	DeviceID  string                             `json:"deviceId,omitempty"`
	Scene     string                             `json:"scene,omitempty"`
	Operator  string                             `json:"operator,omitempty"`
	ScannedAt string                             `json:"scannedAt"`
	Summary   string                             `json:"summary"`
	Parsed    *services.LinearBarcodeParseResult `json:"parsed"`
	Resolved  scanResolvedPayload                `json:"resolved"`
	Bridge    scanBridgeResult                   `json:"bridge"`
	Metadata  map[string]interface{}             `json:"metadata,omitempty"`
}

func PDAIngestScanHandler(c *gin.Context) {
	var input scanIngestRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 原始扫码数据格式错误"})
		return
	}

	parsed, err := services.ParseLinearBarcode(input.RawCode)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 一维码解析失败: " + err.Error()})
		return
	}

	product, err := services.ResolveScanProductByModelCode(parsed.Segments.ModelCode)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 产品解析失败: " + err.Error()})
		return
	}
	material, err := services.ResolveScanMaterialByCode(input.MaterialCode)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 物料解析失败: " + err.Error()})
		return
	}

	resolved := scanResolvedPayload{
		Product:  product,
		Material: material,
	}

	scannerID := middleware.GetSafeUsername(c)

	bridge, bridgeErr := bridgeStocktakeScanIfRequested(auditContextFromGin(c), input, scannerID)
	if bridgeErr != nil {
		status := mapPDAScanErrorToStatus(bridgeErr)
		prefix := "[SERVER]"
		if status < http.StatusInternalServerError {
			prefix = "[VALIDATION]"
		}
		c.JSON(status, gin.H{
			"error":    prefix + " 扫码桥接失败: " + bridgeErr.Error(),
			"protocol": parsed.Protocol,
			"parsed":   parsed,
			"resolved": resolved,
		})
		return
	}

	scannedAt := time.Now().UTC()
	if input.ScanTime != nil && !input.ScanTime.IsZero() {
		scannedAt = input.ScanTime.UTC()
	}

	payload := scanEventPayload{
		RawCode:   parsed.RawCode,
		Protocol:  parsed.Protocol,
		Symbology: defaultString(strings.TrimSpace(input.Symbology), "code128"),
		DeviceID:  strings.TrimSpace(input.DeviceID),
		Scene:     strings.TrimSpace(input.Scene),
		Operator:  scannerID,
		ScannedAt: scannedAt.Format(time.RFC3339),
		Summary:   parsed.Summary,
		Parsed:    parsed,
		Resolved:  resolved,
		Bridge:    bridge,
		Metadata:  input.Metadata,
	}

	NotifyTrigger("Scan", "INGESTED", "扫码采集成功", "", payload)

	c.JSON(http.StatusOK, gin.H{
		"message":  "扫码已采集并广播",
		"protocol": parsed.Protocol,
		"parsed":   parsed,
		"resolved": resolved,
		"bridge":   bridge,
	})
}

func bridgeStocktakeScanIfRequested(ctx context.Context, input scanIngestRequest, scannerID string) (scanBridgeResult, error) {
	taskID := strings.TrimSpace(input.TaskID)
	materialCode := strings.TrimSpace(input.MaterialCode)
	batchNo := strings.TrimSpace(input.BatchNo)
	scene := strings.TrimSpace(input.Scene)

	bridgeRequested := taskID != "" || materialCode != "" || input.ScannedQty > 0 || strings.EqualFold(scene, "stocktake")
	if !bridgeRequested {
		return scanBridgeResult{}, nil
	}

	if taskID == "" || materialCode == "" || input.ScannedQty <= 0 {
		return scanBridgeResult{}, errInvalidStocktakeBridgePayload(scene, taskID, materialCode, input.ScannedQty)
	}

	err := processPDAScan(ctx, pdaScanPayload{
		TaskID:       taskID,
		MaterialCode: materialCode,
		BatchNo:      batchNo,
		ScannedQty:   input.ScannedQty,
		ScanTime:     input.ScanTime,
	}, scannerID)
	if err != nil {
		return scanBridgeResult{}, err
	}

	return scanBridgeResult{
		Applied:      true,
		TaskID:       taskID,
		MaterialCode: strings.ToUpper(materialCode),
		BatchNo:      batchNo,
		ScannedQty:   input.ScannedQty,
	}, nil
}

func errInvalidStocktakeBridgePayload(scene, taskID, materialCode string, scannedQty float64) error {
	return fmt.Errorf("扫描数据缺失 taskId 或 materialCode，或 scannedQty 不合法: scene=%s taskId=%s materialCode=%s scannedQty=%.3f", scene, taskID, materialCode, scannedQty)
}

func defaultString(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}
