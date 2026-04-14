package services

import (
	"testing"
	"xdfc-server/db"

	"github.com/stretchr/testify/require"
)

func TestSaveCustomerRejectsEmptyIdentityOnCreate(t *testing.T) {
	originalDB := db.DB
	testDB := setupPartnerTransactionTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
	})

	_, err := SaveCustomer(SaveCustomerRequest{
		Name: " ",
		Code: "",
	}, "user-1", "tester", "127.0.0.1")
	require.ErrorIs(t, err, ErrCustomerTransactionInvalidPayload)
	require.ErrorContains(t, err, "code and name must not be empty")
}

func TestSaveSupplierRejectsEmptyIdentityOnCreate(t *testing.T) {
	originalDB := db.DB
	testDB := setupPartnerTransactionTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
	})

	_, err := SaveSupplier(SaveSupplierRequest{
		Name: "",
		Code: " ",
	}, "user-1", "tester", "127.0.0.1")
	require.ErrorIs(t, err, ErrSupplierTransactionInvalidPayload)
	require.ErrorContains(t, err, "code and name must not be empty")
}
