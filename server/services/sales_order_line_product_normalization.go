package services

import (
	"encoding/json"
	"errors"
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
)

const salesOrderProductDisplayStrategyVersion = "product-display-v1"

type salesOrderProductBarcodeConfig struct {
	Category string `json:"category"`
}

type salesOrderLineProductDisplayProjection struct {
	Title           string
	Subtitle        string
	Code            string
	FullLabel       string
	StrategyVersion string
}

func normalizeSalesOrderLineProductFieldsTx(tx *gorm.DB, lines []models.SalesOrderLine) error {
	if tx == nil {
		return errors.New("transaction is required")
	}

	for index := range lines {
		product, found, err := loadSalesOrderLineProductTx(tx, lines[index].ProductID)
		if err != nil {
			return err
		}
		if !found {
			continue
		}

		normalizeSalesOrderLineProductFields(&lines[index], product)
	}

	return nil
}

func loadSalesOrderLineProductTx(tx *gorm.DB, productID string) (models.Product, bool, error) {
	trimmedProductID := strings.TrimSpace(productID)
	if trimmedProductID == "" {
		return models.Product{}, false, nil
	}

	var product models.Product
	if err := tx.Where("id = ?", trimmedProductID).First(&product).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return models.Product{}, false, nil
		}
		return models.Product{}, false, err
	}

	return product, true, nil
}

func normalizeSalesOrderLineProductFields(line *models.SalesOrderLine, product models.Product) {
	if line == nil {
		return
	}

	display := buildSalesOrderLineProductDisplayProjection(product)
	derivedCode := firstNonEmptySalesOrderLineValue(strings.TrimSpace(product.SKU), display.Code)

	if shouldReplaceSalesOrderLineGeneratedValue(line.ProductModel) {
		line.ProductModel = derivedCode
	}
	if shouldReplaceSalesOrderLineGeneratedValue(line.ProductCode) {
		line.ProductCode = derivedCode
	}
	if shouldReplaceSalesOrderLineGeneratedValue(line.Specification) {
		line.Specification = display.FullLabel
	}

	if hasInvalidGeneratedSalesOrderLineSnapshot(*line) {
		setSalesOrderLineDisplaySnapshot(line, display)
	} else {
		if strings.TrimSpace(line.ProductDisplayTitleSnapshot) == "" {
			line.ProductDisplayTitleSnapshot = display.Title
		}
		if strings.TrimSpace(line.ProductDisplaySubtitleSnapshot) == "" {
			line.ProductDisplaySubtitleSnapshot = display.Subtitle
		}
		if strings.TrimSpace(line.ProductDisplayCodeSnapshot) == "" {
			line.ProductDisplayCodeSnapshot = display.Code
		}
		if strings.TrimSpace(line.ProductDisplayFullLabelSnapshot) == "" {
			line.ProductDisplayFullLabelSnapshot = display.FullLabel
		}
		if strings.TrimSpace(line.ProductDisplayStrategyVersionSnapshot) == "" {
			line.ProductDisplayStrategyVersionSnapshot = display.StrategyVersion
		}
	}

	if strings.TrimSpace(line.ModelCodeSnapshot) == "" {
		line.ModelCodeSnapshot = strings.TrimSpace(product.ModelCode)
	}
	if strings.TrimSpace(line.HolePrefixSnapshot) == "" {
		line.HolePrefixSnapshot = resolveSalesOrderLineHolePrefix(product.BarcodeConfig)
	}
}

func buildSalesOrderLineProductDisplayProjection(product models.Product) salesOrderLineProductDisplayProjection {
	code := firstNonEmptySalesOrderLineValue(
		strings.TrimSpace(product.SKU),
		strings.TrimSpace(product.ModelCode),
	)
	title := firstNonEmptySalesOrderLineValue(strings.TrimSpace(product.Name), code, "UNNAMED")
	subtitle := strings.Join([]string{
		firstNonEmptySalesOrderLineValue(strings.TrimSpace(product.TechSeries), "normal"),
		firstNonEmptySalesOrderLineValue(strings.TrimSpace(product.BrakeType), "UNKNOWN"),
		firstNonEmptySalesOrderLineValue(strings.TrimSpace(product.VersionLevel), "std"),
	}, "/")
	fullLabel := title
	if subtitle != "" {
		fullLabel = title + " (" + subtitle + ")"
	}

	return salesOrderLineProductDisplayProjection{
		Title:           title,
		Subtitle:        subtitle,
		Code:            code,
		FullLabel:       fullLabel,
		StrategyVersion: salesOrderProductDisplayStrategyVersion,
	}
}

func setSalesOrderLineDisplaySnapshot(line *models.SalesOrderLine, display salesOrderLineProductDisplayProjection) {
	line.ProductDisplayTitleSnapshot = display.Title
	line.ProductDisplaySubtitleSnapshot = display.Subtitle
	line.ProductDisplayCodeSnapshot = display.Code
	line.ProductDisplayFullLabelSnapshot = display.FullLabel
	line.ProductDisplayStrategyVersionSnapshot = display.StrategyVersion
}

func firstNonEmptySalesOrderLineValue(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func shouldReplaceSalesOrderLineGeneratedValue(value string) bool {
	trimmedValue := strings.TrimSpace(value)
	if trimmedValue == "" {
		return true
	}

	return isSalesOrderLineDisplayPlaceholderValue(trimmedValue)
}

func hasInvalidGeneratedSalesOrderLineSnapshot(line models.SalesOrderLine) bool {
	return isSalesOrderLineDisplayPlaceholderValue(line.ProductDisplayTitleSnapshot) ||
		isSalesOrderLineDisplayPlaceholderValue(line.ProductDisplayFullLabelSnapshot)
}

func isSalesOrderLineDisplayPlaceholderValue(value string) bool {
	normalized := strings.ToUpper(strings.TrimSpace(value))
	return normalized == "UNNAMED" || strings.HasPrefix(normalized, "UNNAMED (")
}

func resolveSalesOrderLineHolePrefix(raw json.RawMessage) string {
	trimmedRaw := strings.TrimSpace(string(raw))
	if trimmedRaw == "" || trimmedRaw == "null" {
		return ""
	}

	var config salesOrderProductBarcodeConfig
	if err := json.Unmarshal(raw, &config); err != nil {
		return ""
	}

	return strings.TrimSpace(config.Category)
}
