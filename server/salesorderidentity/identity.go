package salesorderidentity

import (
	"fmt"
	"strings"
	"xdfc-server/numbering"

	"gorm.io/gorm"
)

const defaultSalesOrderEntityCode = "ZP6A"

var salesOrderClassificationAlias = map[string]string{
	"GENERAL": "GS",
	"TOLL":    "TL",
	"RD":      "RD",
	"PROJECT": "PJ",
	"SAMPLE":  "SP",
}

func NormalizeSalesOrderClassificationAlias(classification string) string {
	normalizedClassification := strings.ToUpper(strings.TrimSpace(classification))
	if normalizedClassification == "" {
		return "GS"
	}
	if alias, ok := salesOrderClassificationAlias[normalizedClassification]; ok {
		return alias
	}
	if len(normalizedClassification) >= 2 {
		return normalizedClassification[:2]
	}
	return "GS"
}

func SalesOrderContractRuleKey(classification string) string {
	return fmt.Sprintf("CONTRACT_%s_%s", defaultSalesOrderEntityCode, NormalizeSalesOrderClassificationAlias(classification))
}

func GenerateSalesOrderBarcodeTx(tx *gorm.DB, classification string) (string, error) {
	return numbering.GenerateNextNumberTx(tx, SalesOrderContractRuleKey(classification))
}

func ResolveSalesOrderIdentity(orderNo string, barcode string, fallbackID string) (string, string) {
	normalizedBarcode := strings.TrimSpace(barcode)
	normalizedOrderNo := strings.TrimSpace(orderNo)
	if normalizedOrderNo == "" {
		normalizedOrderNo = normalizedBarcode
	}
	if normalizedOrderNo == "" {
		normalizedOrderNo = strings.TrimSpace(fallbackID)
	}
	return normalizedOrderNo, normalizedBarcode
}
