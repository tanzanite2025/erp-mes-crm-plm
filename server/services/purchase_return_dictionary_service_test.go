package services

import (
	"testing"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func setupPurchaseReturnDictionaryServiceTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	testDB, err := gorm.Open(sqlite.Open("file:purchase_return_dictionary_service_test?mode=memory&cache=shared"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)
	require.NoError(t, testDB.AutoMigrate(&models.PurchaseReturnDictionary{}))
	return testDB
}

func TestListPurchaseReturnDictionariesSeedsDefaults(t *testing.T) {
	originalDB := db.DB
	testDB := setupPurchaseReturnDictionaryServiceTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	reasons, err := ListPurchaseReturnDictionaries(PurchaseReturnDictionaryTypeReason)
	require.NoError(t, err)
	require.NotEmpty(t, reasons)
	require.Equal(t, PurchaseReturnDictionaryTypeReason, reasons[0].DictType)

	categories, err := ListPurchaseReturnDictionaries(PurchaseReturnDictionaryTypeIssueCategory)
	require.NoError(t, err)
	require.NotEmpty(t, categories)
	require.Equal(t, PurchaseReturnDictionaryTypeIssueCategory, categories[0].DictType)
}

