package services

import (
	"encoding/json"
	"fmt"
	"testing"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func setupPartnerTransactionTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	testDB, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)

	require.NoError(t, testDB.Exec(`
		CREATE TABLE customers (
			id TEXT PRIMARY KEY NOT NULL,
			name TEXT,
			code TEXT,
			contact_person TEXT,
			contact_phone TEXT,
			email TEXT,
			address TEXT,
			status TEXT,
			credit_limit REAL,
			balance REAL,
			created_at DATETIME,
			updated_at DATETIME,
			is_deleted BOOLEAN DEFAULT FALSE,
			version INTEGER DEFAULT 1
		)
	`).Error)

	require.NoError(t, testDB.Exec(`
		CREATE TABLE suppliers (
			id TEXT PRIMARY KEY NOT NULL,
			name TEXT,
			code TEXT,
			category TEXT,
			main_products TEXT,
			contact_person TEXT,
			contact_phone TEXT,
			email TEXT,
			address TEXT,
			status TEXT,
			rating REAL,
			created_at DATETIME,
			updated_at DATETIME,
			is_deleted BOOLEAN DEFAULT FALSE,
			version INTEGER DEFAULT 1
		)
	`).Error)

	require.NoError(t, testDB.Exec(`
		CREATE TABLE audit_logs (
			id TEXT PRIMARY KEY NOT NULL,
			module TEXT,
			target_id TEXT,
			action TEXT,
			diff TEXT,
			operator TEXT,
			ip TEXT,
			created_at DATETIME
		)
	`).Error)

	return testDB
}

func seedPartnerTransactionBaseData(t *testing.T, testDB *gorm.DB) {
	t.Helper()

	require.NoError(t, testDB.Create(&models.Customer{
		ID:            "cust-1",
		Name:          "Acme",
		Code:          "CUST-001",
		ContactPerson: "Alice",
		ContactPhone:  "10086",
		Email:         "alice@acme.test",
		Address:       "Shanghai",
		Status:        "Active",
		CreditLimit:   5000,
		Balance:       200,
		Version:       2,
		IsDeleted:     false,
	}).Error)

	require.NoError(t, testDB.Create(&models.Supplier{
		ID:            "sup-1",
		Name:          "Forge",
		Code:          "SUP-001",
		Category:      "Raw",
		MainProducts:  `["Tube"]`,
		ContactPerson: "Bob",
		ContactPhone:  "20086",
		Email:         "bob@forge.test",
		Address:       "Suzhou",
		Status:        "Active",
		Rating:        90,
		Version:       3,
		IsDeleted:     false,
	}).Error)

	require.NoError(t, testDB.Create(&models.Supplier{
		ID:            "sup-2",
		Name:          "Alloy",
		Code:          "SUP-002",
		Category:      "Raw",
		MainProducts:  `["Rod"]`,
		ContactPerson: "Carol",
		ContactPhone:  "30086",
		Email:         "carol@alloy.test",
		Address:       "Wuxi",
		Status:        "OnReview",
		Rating:        75,
		Version:       1,
		IsDeleted:     false,
	}).Error)
}

func TestExecuteCustomerTransactionSaveRoutesStatusOnlyDelta(t *testing.T) {
	originalDB := db.DB
	testDB := setupPartnerTransactionTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
	})
	seedPartnerTransactionBaseData(t, testDB)

	payload, err := json.Marshal(CustomerSavePayload{
		Delta: map[string]json.RawMessage{
			"status": json.RawMessage(`{"o":"Active","n":"Inactive"}`),
		},
		FinalData: CustomerSaveSnapshot{
			Name:          "Acme",
			Code:          "CUST-001",
			ContactPerson: "Alice",
			ContactPhone:  "10086",
			Email:         "alice@acme.test",
			Address:       "Shanghai",
			Status:        "Inactive",
			CreditLimit:   5000,
			Balance:       200,
		},
		Operator: "tester",
	})
	require.NoError(t, err)

	result, err := ExecuteCustomerTransaction(ExecuteCustomerTransactionInput{
		CustomerID:      "cust-1",
		Intent:          CustomerTransactionIntentSave,
		ActorID:         "user-1",
		Operator:        "tester",
		ExpectedVersion: 2,
		Payload:         payload,
		IP:              "127.0.0.1",
	})

	require.NoError(t, err)
	require.Equal(t, "Inactive", result.Status)
	require.Equal(t, 3, result.Version)

	var logs []models.AuditLog
	require.NoError(t, testDB.Order("created_at asc").Find(&logs).Error)
	require.Len(t, logs, 1)
	require.Equal(t, "customer", logs[0].Module)
	require.Equal(t, CustomerTransactionIntentStatusChange, logs[0].Action)
}

func TestExecuteCustomerTransactionSaveFallsBackToUnifiedSaveForMixedDelta(t *testing.T) {
	originalDB := db.DB
	testDB := setupPartnerTransactionTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
	})
	seedPartnerTransactionBaseData(t, testDB)

	payload, err := json.Marshal(CustomerSavePayload{
		Delta: map[string]json.RawMessage{
			"contactPerson": json.RawMessage(`{"o":"Alice","n":"Dora"}`),
			"status":        json.RawMessage(`{"o":"Active","n":"Pending"}`),
		},
		FinalData: CustomerSaveSnapshot{
			Name:          "Acme Updated",
			Code:          "CUST-001",
			ContactPerson: "Dora",
			ContactPhone:  "10010",
			Email:         "dora@acme.test",
			Address:       "Hangzhou",
			Status:        "Pending",
			CreditLimit:   8000,
			Balance:       350,
		},
		Operator: "tester",
	})
	require.NoError(t, err)

	result, err := ExecuteCustomerTransaction(ExecuteCustomerTransactionInput{
		CustomerID:      "cust-1",
		Intent:          CustomerTransactionIntentSave,
		ActorID:         "user-1",
		Operator:        "tester",
		ExpectedVersion: 2,
		Payload:         payload,
		IP:              "127.0.0.1",
	})

	require.NoError(t, err)
	require.Equal(t, "Acme Updated", result.Name)
	require.Equal(t, "Dora", result.ContactPerson)
	require.Equal(t, "Pending", result.Status)
	require.Equal(t, 8000.0, result.CreditLimit)
	require.Equal(t, 350.0, result.Balance)
	require.Equal(t, 3, result.Version)

	var logs []models.AuditLog
	require.NoError(t, testDB.Order("created_at asc").Find(&logs).Error)
	require.Len(t, logs, 1)
	require.Equal(t, "customer", logs[0].Module)
	require.Equal(t, CustomerTransactionIntentSave, logs[0].Action)
}

func TestExecuteSupplierTransactionSaveRoutesIdentityOnlyDelta(t *testing.T) {
	originalDB := db.DB
	testDB := setupPartnerTransactionTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
	})
	seedPartnerTransactionBaseData(t, testDB)

	payload, err := json.Marshal(SupplierSavePayload{
		Delta: map[string]json.RawMessage{
			"code": json.RawMessage(`{"o":"SUP-001","n":"SUP-009"}`),
			"name": json.RawMessage(`{"o":"Forge","n":"Forge Prime"}`),
		},
		FinalData: SupplierSaveSnapshot{
			Name:          "Forge Prime",
			Code:          "SUP-009",
			Category:      "Raw",
			MainProducts:  []string{"Tube"},
			ContactPerson: "Bob",
			ContactPhone:  "20086",
			Email:         "bob@forge.test",
			Address:       "Suzhou",
			Status:        "Active",
			Rating:        90,
		},
		Operator: "tester",
	})
	require.NoError(t, err)

	result, err := ExecuteSupplierTransaction(ExecuteSupplierTransactionInput{
		SupplierID:      "sup-1",
		Intent:          SupplierTransactionIntentSave,
		ActorID:         "user-1",
		Operator:        "tester",
		ExpectedVersion: 3,
		Payload:         payload,
		IP:              "127.0.0.1",
	})

	require.NoError(t, err)
	require.Equal(t, "SUP-009", result.Code)
	require.Equal(t, "Forge Prime", result.Name)
	require.Equal(t, 4, result.Version)

	var logs []models.AuditLog
	require.NoError(t, testDB.Order("created_at asc").Find(&logs).Error)
	require.Len(t, logs, 1)
	require.Equal(t, "supplier", logs[0].Module)
	require.Equal(t, SupplierTransactionIntentIdentityChange, logs[0].Action)
}

func TestExecuteSupplierTransactionSaveFallsBackToUnifiedSaveForMixedDelta(t *testing.T) {
	originalDB := db.DB
	testDB := setupPartnerTransactionTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
	})
	seedPartnerTransactionBaseData(t, testDB)

	payload, err := json.Marshal(SupplierSavePayload{
		Delta: map[string]json.RawMessage{
			"category":     json.RawMessage(`{"o":"Raw","n":"Outsource"}`),
			"mainProducts": json.RawMessage(`{"o":["Tube"],"n":["Tube","Plate"]}`),
			"status":       json.RawMessage(`{"o":"Active","n":"OnReview"}`),
		},
		FinalData: SupplierSaveSnapshot{
			Name:          "Forge",
			Code:          "SUP-001",
			Category:      "Outsource",
			MainProducts:  []string{"Tube", "Plate"},
			ContactPerson: "Eve",
			ContactPhone:  "20000",
			Email:         "eve@forge.test",
			Address:       "Ningbo",
			Status:        "OnReview",
			Rating:        88,
		},
		Operator: "tester",
	})
	require.NoError(t, err)

	result, err := ExecuteSupplierTransaction(ExecuteSupplierTransactionInput{
		SupplierID:      "sup-1",
		Intent:          SupplierTransactionIntentSave,
		ActorID:         "user-1",
		Operator:        "tester",
		ExpectedVersion: 3,
		Payload:         payload,
		IP:              "127.0.0.1",
	})

	require.NoError(t, err)
	require.Equal(t, "Outsource", result.Category)
	require.Equal(t, `["Tube","Plate"]`, result.MainProducts)
	require.Equal(t, "OnReview", result.Status)
	require.Equal(t, 88.0, result.Rating)
	require.Equal(t, 4, result.Version)

	var logs []models.AuditLog
	require.NoError(t, testDB.Order("created_at asc").Find(&logs).Error)
	require.Len(t, logs, 1)
	require.Equal(t, "supplier", logs[0].Module)
	require.Equal(t, SupplierTransactionIntentSave, logs[0].Action)
}
