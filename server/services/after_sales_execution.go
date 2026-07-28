package services

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"sort"
	"strings"
	"time"
	"xdfc-server/models"

	"gorm.io/gorm"
)

const afterSalesExecutionKeyMaxLength = 128

func canonicalAfterSalesCode(raw string, normalized string) string {
	code := strings.TrimSpace(normalized)
	if code == "" {
		code = strings.TrimSpace(raw)
	}
	return strings.ToUpper(code)
}

func normalizeAfterSalesExecutionKey(raw string) (string, error) {
	key := strings.TrimSpace(raw)
	if key == "" {
		return "", errors.New("clientRequestId is required")
	}
	if len(key) > afterSalesExecutionKeyMaxLength {
		return "", errors.New("clientRequestId is too long")
	}
	return key, nil
}

type afterSalesExecutionBarcodeFingerprint struct {
	LineID uint   `json:"lineId"`
	Side   string `json:"side,omitempty"`
	Code   string `json:"code"`
}

type afterSalesReturnInboundLineFingerprint struct {
	LineID   uint                                    `json:"lineId"`
	Quantity float64                                 `json:"quantity"`
	Barcodes []afterSalesExecutionBarcodeFingerprint `json:"barcodes,omitempty"`
}

type afterSalesExchangeReplacementLineFingerprint struct {
	LineID   uint                                    `json:"lineId"`
	Quantity float64                                 `json:"quantity"`
	Barcodes []afterSalesExecutionBarcodeFingerprint `json:"barcodes,omitempty"`
}

func afterSalesTimeFingerprint(value time.Time) string {
	if value.IsZero() {
		return ""
	}
	return value.UTC().Format(time.RFC3339Nano)
}

func afterSalesInputTimeFingerprint(raw string, value time.Time) string {
	// An omitted date is filled with time.Now() during normalization. It is a
	// server default, not part of the client's request identity, so it must not
	// make a replay with the same clientRequestId look like a new request.
	if strings.TrimSpace(raw) == "" {
		return ""
	}
	return afterSalesTimeFingerprint(value)
}

func hashAfterSalesExecutionPayload(payload any) (string, error) {
	encoded, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	digest := sha256.Sum256(encoded)
	return hex.EncodeToString(digest[:]), nil
}

func normalizeSalesReturnBarcodeFingerprints(
	lineID uint,
	side string,
	inputs []SalesReturnLineBarcodeInput,
) []afterSalesExecutionBarcodeFingerprint {
	result := make([]afterSalesExecutionBarcodeFingerprint, 0, len(inputs))
	for _, input := range inputs {
		code := canonicalAfterSalesCode(input.RawCode, input.NormalizedCode)
		if code == "" {
			continue
		}
		result = append(result, afterSalesExecutionBarcodeFingerprint{
			LineID: lineID,
			Side:   strings.TrimSpace(side),
			Code:   code,
		})
	}
	sort.Slice(result, func(left, right int) bool {
		if result[left].LineID != result[right].LineID {
			return result[left].LineID < result[right].LineID
		}
		if result[left].Side != result[right].Side {
			return result[left].Side < result[right].Side
		}
		return result[left].Code < result[right].Code
	})
	return result
}

func normalizeSalesExchangeBarcodeFingerprints(
	lineID uint,
	side string,
	inputs []SalesExchangeExecutionBarcodeInput,
) []afterSalesExecutionBarcodeFingerprint {
	result := make([]afterSalesExecutionBarcodeFingerprint, 0, len(inputs))
	for _, input := range inputs {
		code := canonicalAfterSalesCode(input.RawLabelCode, input.NormalizedLabelCode)
		if code == "" {
			continue
		}
		result = append(result, afterSalesExecutionBarcodeFingerprint{
			LineID: lineID,
			Side:   strings.TrimSpace(side),
			Code:   code,
		})
	}
	sort.Slice(result, func(left, right int) bool {
		if result[left].LineID != result[right].LineID {
			return result[left].LineID < result[right].LineID
		}
		if result[left].Side != result[right].Side {
			return result[left].Side < result[right].Side
		}
		return result[left].Code < result[right].Code
	})
	return result
}

func salesReturnInboundExecutionFingerprint(input ConfirmSalesReturnInboundInput) (string, error) {
	lines := make([]afterSalesReturnInboundLineFingerprint, 0, len(input.Lines))
	for _, line := range input.Lines {
		lines = append(lines, afterSalesReturnInboundLineFingerprint{
			LineID:   line.SalesReturnLineID,
			Quantity: line.Quantity,
			Barcodes: normalizeSalesReturnBarcodeFingerprints(
				line.SalesReturnLineID,
				"",
				line.Barcodes,
			),
		})
	}
	sort.Slice(lines, func(left, right int) bool {
		return lines[left].LineID < lines[right].LineID
	})
	return hashAfterSalesExecutionPayload(struct {
		TargetCategory string                                   `json:"targetCategory"`
		BatchNo        string                                   `json:"batchNo"`
		InboundDate    string                                   `json:"inboundDate"`
		Remarks        string                                   `json:"remarks"`
		Lines          []afterSalesReturnInboundLineFingerprint `json:"lines"`
	}{
		TargetCategory: input.TargetCategory,
		BatchNo:        input.BatchNo,
		InboundDate:    afterSalesInputTimeFingerprint(input.InboundDateRaw, input.InboundDate),
		Remarks:        input.Remarks,
		Lines:          lines,
	})
}

func salesExchangeOldItemInboundExecutionFingerprint(input ConfirmSalesExchangeOldItemInboundInput) (string, error) {
	return hashAfterSalesExecutionPayload(struct {
		LineID         uint                                    `json:"lineId"`
		Quantity       float64                                 `json:"quantity"`
		TargetCategory string                                  `json:"targetCategory"`
		BatchNo        string                                  `json:"batchNo"`
		InboundDate    string                                  `json:"inboundDate"`
		Remarks        string                                  `json:"remarks"`
		Barcodes       []afterSalesExecutionBarcodeFingerprint `json:"barcodes,omitempty"`
	}{
		LineID:         input.SalesExchangeLineID,
		Quantity:       input.Quantity,
		TargetCategory: input.TargetCategory,
		BatchNo:        input.BatchNo,
		InboundDate:    afterSalesInputTimeFingerprint(input.InboundDateRaw, input.InboundDate),
		Remarks:        input.Remarks,
		Barcodes: normalizeSalesExchangeBarcodeFingerprints(
			input.SalesExchangeLineID,
			SalesExchangeLabelSideOldItem,
			input.Barcodes,
		),
	})
}

func salesExchangeReplacementShipmentExecutionFingerprint(input ConfirmSalesExchangeReplacementShipmentInput) (string, error) {
	lines := make([]afterSalesExchangeReplacementLineFingerprint, 0, len(input.Lines))
	for _, line := range input.Lines {
		lines = append(lines, afterSalesExchangeReplacementLineFingerprint{
			LineID:   line.SalesExchangeLineID,
			Quantity: line.Quantity,
			Barcodes: normalizeSalesExchangeBarcodeFingerprints(
				line.SalesExchangeLineID,
				SalesExchangeLabelSideReplacementItem,
				line.Barcodes,
			),
		})
	}
	sort.Slice(lines, func(left, right int) bool {
		return lines[left].LineID < lines[right].LineID
	})
	return hashAfterSalesExecutionPayload(struct {
		SourceCategory        string                                         `json:"sourceCategory"`
		BatchNo               string                                         `json:"batchNo"`
		ShipmentDate          string                                         `json:"shipmentDate"`
		ReplacementTrackingNo string                                         `json:"replacementTrackingNo"`
		Remarks               string                                         `json:"remarks"`
		Lines                 []afterSalesExchangeReplacementLineFingerprint `json:"lines"`
	}{
		SourceCategory:        input.SourceCategory,
		BatchNo:               input.BatchNo,
		ShipmentDate:          afterSalesInputTimeFingerprint(input.ShipmentDateRaw, input.ShipmentDate),
		ReplacementTrackingNo: input.ReplacementTrackingNo,
		Remarks:               input.Remarks,
		Lines:                 lines,
	})
}

func validateExecutionReplayFingerprint(
	records []models.InboundRecord,
	executionFingerprint string,
) error {
	for _, record := range records {
		if strings.TrimSpace(record.ExecutionFingerprint) == "" {
			continue
		}
		if record.ExecutionFingerprint != executionFingerprint {
			return errors.New("execution key was reused with a different request")
		}
	}
	return nil
}

func validateShipmentExecutionReplayFingerprint(
	records []models.ShipmentRecord,
	executionFingerprint string,
) error {
	for _, record := range records {
		if strings.TrimSpace(record.ExecutionFingerprint) == "" {
			continue
		}
		if record.ExecutionFingerprint != executionFingerprint {
			return errors.New("execution key was reused with a different request")
		}
	}
	return nil
}

func loadInboundRecordsByExecutionKeyTx(
	tx *gorm.DB,
	sourceType string,
	sourceID string,
	executionKey string,
) ([]models.InboundRecord, error) {
	var records []models.InboundRecord
	if err := tx.
		Where("source_type = ? AND source_id = ? AND execution_key = ?", sourceType, sourceID, executionKey).
		Order("source_line_id asc, created_at asc").
		Find(&records).Error; err != nil {
		return nil, err
	}
	return records, nil
}

func loadShipmentRecordsByExecutionKeyTx(
	tx *gorm.DB,
	sourceType string,
	sourceID string,
	executionKey string,
) ([]models.ShipmentRecord, error) {
	var records []models.ShipmentRecord
	if err := tx.
		Where("source_type = ? AND source_id = ? AND execution_key = ?", sourceType, sourceID, executionKey).
		Order("source_line_id asc, created_at asc").
		Find(&records).Error; err != nil {
		return nil, err
	}
	return records, nil
}

func validateExecutionReplayCount(found int, expected int) error {
	if found == 0 {
		return nil
	}
	if found != expected {
		return errors.New("execution request has partial records; inspect inventory records before retrying")
	}
	return nil
}
