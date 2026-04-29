package services

import (
	"fmt"
	"strings"
	"testing"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func setupProductInventoryMaterialMappingTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	testDB, err := gorm.Open(
		sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())),
		&gorm.Config{Logger: logger.Default.LogMode(logger.Silent)},
	)
	require.NoError(t, err)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE products (
			id TEXT PRIMARY KEY,
			sku TEXT NOT NULL UNIQUE,
			name TEXT NOT NULL,
			model_code TEXT,
			status TEXT,
			version INTEGER,
			deleted_at DATETIME
		);
	`).Error)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE materials (
			id TEXT PRIMARY KEY,
			code TEXT NOT NULL UNIQUE,
			name TEXT NOT NULL,
			status TEXT,
			deleted_at DATETIME
		);
	`).Error)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE product_inventory_material_mappings (
			id TEXT PRIMARY KEY,
			product_id TEXT NOT NULL UNIQUE,
			material_id TEXT NOT NULL,
			active BOOLEAN,
			mapping_source TEXT,
			remarks TEXT,
			deleted_at DATETIME
		);
	`).Error)

	t.Cleanup(func() {
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	return testDB
}

func createProductInventoryMaterialMappingTestMaterial(t *testing.T, tx *gorm.DB, id string, code string, name string) models.Material {
	t.Helper()

	material := models.Material{
		BaseModel: models.BaseModel{ID: id},
		Code:      code,
		Name:      name,
		Status:    "Active",
	}
	require.NoError(t, tx.Exec(
		"INSERT INTO materials (id, code, name, status) VALUES (?, ?, ?, ?)",
		material.ID,
		material.Code,
		material.Name,
		material.Status,
	).Error)
	return material
}

func createProductInventoryMaterialMappingTestProduct(t *testing.T, tx *gorm.DB, id string, sku string, name string, modelCode string) models.Product {
	t.Helper()

	product := models.Product{
		BaseModel: models.BaseModel{ID: id},
		SKU:       sku,
		Name:      name,
		ModelCode: modelCode,
		Status:    "Active",
		Version:   1,
	}
	require.NoError(t, tx.Exec(
		"INSERT INTO products (id, sku, name, model_code, status, version) VALUES (?, ?, ?, ?, ?, ?)",
		product.ID,
		product.SKU,
		product.Name,
		product.ModelCode,
		product.Status,
		product.Version,
	).Error)
	return product
}

func TestResolveInventoryMaterialUsesExplicitMappingBeforeCompatibilityFallback(t *testing.T) {
	testDB := setupProductInventoryMaterialMappingTestDB(t)
	createProductInventoryMaterialMappingTestMaterial(t, testDB, "product-explicit", "DIRECT-MATERIAL", "Direct Material")
	mappedMaterial := createProductInventoryMaterialMappingTestMaterial(t, testDB, "material-explicit-target", "MAPPED-MATERIAL", "Mapped Material")
	product := createProductInventoryMaterialMappingTestProduct(t, testDB, "product-explicit", "SKU-EXPLICIT", "Explicit Product", "MODEL-EXPLICIT")
	require.NoError(t, testDB.Exec(
		"INSERT INTO product_inventory_material_mappings (id, product_id, material_id, active, mapping_source) VALUES (?, ?, ?, ?, ?)",
		"mapping-explicit",
		product.ID,
		mappedMaterial.ID,
		true,
		"TEST",
	).Error)

	resolution, err := ResolveInventoryMaterialForProductSnapshotTx(testDB, ProductInventoryMaterialResolutionSnapshot{
		ProductID: product.ID,
	})

	require.NoError(t, err)
	require.Equal(t, mappedMaterial.ID, resolution.Material.ID)
	require.Equal(t, ProductInventoryMaterialResolutionExplicitMapping, resolution.Strategy)
}

func TestResolveInventoryMaterialFallsBackToProductSKUCode(t *testing.T) {
	testDB := setupProductInventoryMaterialMappingTestDB(t)
	material := createProductInventoryMaterialMappingTestMaterial(t, testDB, "material-sku", "SKU-MATERIAL", "SKU Material")
	product := createProductInventoryMaterialMappingTestProduct(t, testDB, "product-sku", "SKU-MATERIAL", "SKU Product", "MODEL-SKU")

	resolution, err := ResolveInventoryMaterialForProductSnapshotTx(testDB, ProductInventoryMaterialResolutionSnapshot{
		ProductID: product.ID,
	})

	require.NoError(t, err)
	require.Equal(t, material.ID, resolution.Material.ID)
	require.Equal(t, ProductInventoryMaterialResolutionProductSKU, resolution.Strategy)
}

func TestResolveInventoryMaterialFallsBackToSalesLineProductCode(t *testing.T) {
	testDB := setupProductInventoryMaterialMappingTestDB(t)
	material := createProductInventoryMaterialMappingTestMaterial(t, testDB, "material-line-code", "LINE-CODE", "Line Code Material")

	resolution, err := ResolveInventoryMaterialForProductSnapshotTx(testDB, ProductInventoryMaterialResolutionSnapshot{
		ProductCode: "LINE-CODE",
	})

	require.NoError(t, err)
	require.Equal(t, material.ID, resolution.Material.ID)
	require.Equal(t, ProductInventoryMaterialResolutionSalesLineProductCode, resolution.Strategy)
}

func TestResolveInventoryMaterialPrefersSalesLineCodeBeforeProductNameFallback(t *testing.T) {
	testDB := setupProductInventoryMaterialMappingTestDB(t)
	createProductInventoryMaterialMappingTestMaterial(t, testDB, "material-product-name", "PRODUCT-NAME-CODE", "Shared Product Name")
	lineCodeMaterial := createProductInventoryMaterialMappingTestMaterial(t, testDB, "material-line-code-priority", "LINE-CODE-PRIORITY", "Line Code Priority Material")
	product := createProductInventoryMaterialMappingTestProduct(t, testDB, "product-name-fallback", "SKU-NOT-MATERIAL", "Shared Product Name", "MODEL-NOT-MATERIAL")

	resolution, err := ResolveInventoryMaterialForProductSnapshotTx(testDB, ProductInventoryMaterialResolutionSnapshot{
		ProductID:   product.ID,
		ProductCode: "LINE-CODE-PRIORITY",
	})

	require.NoError(t, err)
	require.Equal(t, lineCodeMaterial.ID, resolution.Material.ID)
	require.Equal(t, ProductInventoryMaterialResolutionSalesLineProductCode, resolution.Strategy)
}

func TestResolveInventoryMaterialRejectsAmbiguousMaterialNameFallback(t *testing.T) {
	testDB := setupProductInventoryMaterialMappingTestDB(t)
	createProductInventoryMaterialMappingTestMaterial(t, testDB, "material-name-one", "NAME-ONE", "Ambiguous Material")
	createProductInventoryMaterialMappingTestMaterial(t, testDB, "material-name-two", "NAME-TWO", "Ambiguous Material")

	_, err := ResolveInventoryMaterialForProductSnapshotTx(testDB, ProductInventoryMaterialResolutionSnapshot{
		ProductModel: "Ambiguous Material",
	})

	require.Error(t, err)
	require.True(t, strings.Contains(err.Error(), "ambiguous"))
}

func TestResolveInventoryMaterialReturnsClearErrorWhenNoRuleMatches(t *testing.T) {
	testDB := setupProductInventoryMaterialMappingTestDB(t)

	_, err := ResolveInventoryMaterialForProductSnapshotTx(testDB, ProductInventoryMaterialResolutionSnapshot{
		ProductID:    "missing-product",
		ProductCode:  "missing-code",
		ProductModel: "missing-model",
	})

	require.Error(t, err)
	require.True(t, strings.Contains(err.Error(), "product inventory material mapping not found"))
}
