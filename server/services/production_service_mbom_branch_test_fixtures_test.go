package services

import (
	"testing"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
)

func seedProductionServiceMBOMBranchForTest(
	t *testing.T,
	manager productionServiceTestTransactionManager,
	productID string,
	productSKU string,
	productName string,
	bomID string,
	ownerType string,
	ownerCustomerID string,
	versionLevel string,
	status string,
	effectiveTo any,
) {
	t.Helper()
	require.NoError(t, manager.DB().Exec(
		"INSERT INTO products (id, sku, name, status) VALUES (?, ?, ?, ?)",
		productID,
		productSKU,
		productName,
		"ACTIVE",
	).Error)
	require.NoError(t, manager.DB().Exec(
		`INSERT INTO boms (
			id, product_id, bom_type, status, owner_type, owner_customer_id,
			version_level, effective_to
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		bomID,
		productID,
		models.BOMTypeMBOM,
		status,
		ownerType,
		ownerCustomerID,
		versionLevel,
		effectiveTo,
	).Error)
}
