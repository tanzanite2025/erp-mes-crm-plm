package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupFinanceMasterServiceTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	testDB, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, testDB.AutoMigrate(&models.Currency{}))
	require.NoError(t, testDB.AutoMigrate(&models.PaymentTerm{}))
	require.NoError(t, testDB.AutoMigrate(&models.PaymentMethod{}))
	return testDB
}

func TestListCurrenciesSeedsFallbackCNYWhenEmpty(t *testing.T) {
	originalDB := db.DB
	testDB := setupFinanceMasterServiceTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	currencies, err := ListCurrencies()
	require.NoError(t, err)
	require.Len(t, currencies, 1)

	cny := currencies[0]
	require.Equal(t, "CNY", cny.Code)
	require.Equal(t, "\u4eba\u6c11\u5e01", cny.Name)
	require.Equal(t, "\u00a5", cny.Symbol)
	require.True(t, cny.IsBase)
	require.Equal(t, "Active", cny.Status)
	require.InDelta(t, 1.0, cny.Rate, 0.000001)
	require.Equal(t, 2, cny.Precision)
}

func TestListCurrenciesAddsFallbackCNYWhenMissing(t *testing.T) {
	originalDB := db.DB
	testDB := setupFinanceMasterServiceTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	require.NoError(t, testDB.Create(&models.Currency{
		Code:      "USD",
		Name:      "US Dollar",
		Symbol:    "$",
		Rate:      7.2,
		Precision: 2,
		IsBase:    true,
		Status:    "Active",
	}).Error)

	currencies, err := ListCurrencies()
	require.NoError(t, err)
	require.Len(t, currencies, 2)

	require.Equal(t, "USD", currencies[0].Code)
	require.True(t, currencies[0].IsBase)

	var cny models.Currency
	require.NoError(t, testDB.Where("code = ?", "CNY").First(&cny).Error)
	require.False(t, cny.IsBase)
	require.Equal(t, "Active", cny.Status)
	require.InDelta(t, 1.0, cny.Rate, 0.000001)
}

func TestListCurrenciesPromotesExistingCNYWhenBaseMissing(t *testing.T) {
	originalDB := db.DB
	testDB := setupFinanceMasterServiceTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	require.NoError(t, testDB.Create(&models.Currency{
		Code:      "CNY",
		Name:      "\u4eba\u6c11\u5e01",
		Symbol:    "\u00a5",
		Rate:      7.5,
		Precision: 2,
		IsBase:    false,
		Status:    "Inactive",
	}).Error)

	currencies, err := ListCurrencies()
	require.NoError(t, err)
	require.Len(t, currencies, 1)
	require.Equal(t, "CNY", currencies[0].Code)
	require.True(t, currencies[0].IsBase)
	require.Equal(t, "Active", currencies[0].Status)
	require.InDelta(t, 1.0, currencies[0].Rate, 0.000001)
}

func TestSyncExchangeRatesStoresRateAgainstBaseCurrency(t *testing.T) {
	originalDB := db.DB
	originalAPIBaseURL := exchangeRateAPIBaseURL
	testDB := setupFinanceMasterServiceTestDB(t)
	db.DB = testDB

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, "/test-key/latest/CNY", r.URL.Path)
		_, _ = w.Write([]byte(`{
			"result":"success",
			"base_code":"CNY",
			"conversion_rates":{
				"CNY":1,
				"USD":0.13812154696132598,
				"EUR":0.12738853503184713
			}
		}`))
	}))

	exchangeRateAPIBaseURL = server.URL

	t.Cleanup(func() {
		exchangeRateAPIBaseURL = originalAPIBaseURL
		server.Close()
		db.DB = originalDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	require.NoError(t, testDB.Create(&models.Currency{
		Code:      "CNY",
		Name:      "人民币",
		Symbol:    "¥",
		Rate:      1,
		Precision: 2,
		IsBase:    true,
		Status:    "Active",
	}).Error)
	require.NoError(t, testDB.Create(&models.Currency{
		Code:      "USD",
		Name:      "US Dollar",
		Symbol:    "$",
		Rate:      0,
		Precision: 4,
		IsBase:    false,
		Status:    "Active",
	}).Error)
	require.NoError(t, testDB.Create(&models.Currency{
		Code:      "EUR",
		Name:      "Euro",
		Symbol:    "EUR",
		Rate:      0,
		Precision: 4,
		IsBase:    false,
		Status:    "Active",
	}).Error)

	count, err := syncExchangeRates("test-key")
	require.NoError(t, err)
	require.Equal(t, 2, count)

	var usd models.Currency
	require.NoError(t, testDB.Where("code = ?", "USD").First(&usd).Error)
	require.InDelta(t, 7.24, usd.Rate, 0.0001)

	var eur models.Currency
	require.NoError(t, testDB.Where("code = ?", "EUR").First(&eur).Error)
	require.InDelta(t, 7.85, eur.Rate, 0.0001)
}

func TestSyncExchangeRatesTreatsNon200AsUpstreamError(t *testing.T) {
	originalDB := db.DB
	originalAPIBaseURL := exchangeRateAPIBaseURL
	testDB := setupFinanceMasterServiceTestDB(t)
	db.DB = testDB

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, "/test-key/latest/CNY", r.URL.Path)
		w.WriteHeader(http.StatusTooManyRequests)
		_, _ = w.Write([]byte(`quota exceeded`))
	}))

	exchangeRateAPIBaseURL = server.URL

	t.Cleanup(func() {
		exchangeRateAPIBaseURL = originalAPIBaseURL
		server.Close()
		db.DB = originalDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	require.NoError(t, testDB.Create(&models.Currency{
		Code:      "CNY",
		Name:      "Chinese Yuan",
		Symbol:    "¥",
		Rate:      1,
		Precision: 2,
		IsBase:    true,
		Status:    "Active",
	}).Error)

	_, err := syncExchangeRates("test-key")
	require.Error(t, err)
	require.True(t, errors.Is(err, ErrExchangeRateAPIStatus))
	require.Contains(t, err.Error(), "http 429")
}

func TestListPaymentTermsSeedsDefaultsWithValidInstallmentJSON(t *testing.T) {
	originalDB := db.DB
	testDB := setupFinanceMasterServiceTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	terms, err := ListPaymentTerms()
	require.NoError(t, err)
	require.NotEmpty(t, terms)

	var cod models.PaymentTerm
	require.NoError(t, testDB.Where("code = ?", "COD").First(&cod).Error)
	require.Equal(t, "[]", cod.Installment)
}

func TestNormalizePaymentTermInstallmentDefaultsBlankAndPreservesJSON(t *testing.T) {
	require.Equal(t, "[]", normalizePaymentTermInstallment(""))
	require.Equal(t, "[]", normalizePaymentTermInstallment("   "))
	normalized := normalizePaymentTermInstallment(` [{"percentage":30,"delayDays":0}] `)
	var installments []map[string]int
	require.NoError(t, json.Unmarshal([]byte(normalized), &installments))
	require.Len(t, installments, 1)
	require.Equal(t, 30, installments[0]["percentage"])
	require.Equal(t, 0, installments[0]["delayDays"])
	require.Equal(t, `"legacy note"`, normalizePaymentTermInstallment("legacy note"))
}

func TestEnsureFinanceDictionaryCompatibilityCreatesPaymentMethodsAndBackfillsTerms(t *testing.T) {
	originalDB := db.DB
	testDB := setupFinanceMasterServiceTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	require.NoError(t, testDB.Create(&models.PaymentTerm{
		Code:        " custom30 ",
		Name:        " Custom 30 ",
		Description: "  legacy note  ",
		Installment: "",
		Status:      "",
		Version:     0,
	}).Error)

	require.NoError(t, EnsureFinanceDictionaryCompatibility())

	require.True(t, testDB.Migrator().HasTable(&models.PaymentMethod{}))

	var custom models.PaymentTerm
	require.NoError(t, testDB.Where("code = ?", "CUSTOM30").First(&custom).Error)
	require.Equal(t, "Custom 30", custom.Name)
	require.Equal(t, "legacy note", custom.Description)
	require.Equal(t, "[]", custom.Installment)
	require.Equal(t, "Active", custom.Status)
	require.Equal(t, 1, custom.Version)

	var cod models.PaymentTerm
	require.NoError(t, testDB.Where("code = ?", "COD").First(&cod).Error)
	require.True(t, cod.IsSystem)

	var cash models.PaymentMethod
	require.NoError(t, testDB.Where("code = ?", "CASH").First(&cash).Error)
	require.True(t, cash.IsSystem)
	require.Equal(t, "Active", cash.Status)
	require.Equal(t, 1, cash.Version)
}
