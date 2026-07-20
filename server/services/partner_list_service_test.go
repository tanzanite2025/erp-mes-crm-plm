package services

import (
	"testing"
	"time"
	appdb "xdfc-server/db"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func TestListCustomersPaginatesAndFiltersTheServerDataset(t *testing.T) {
	testDB, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	sqlDB, err := testDB.DB()
	if err != nil {
		t.Fatalf("open sqlite connection: %v", err)
	}
	sqlDB.SetMaxOpenConns(1)

	if err := testDB.Exec(`CREATE TABLE customers (
		id text PRIMARY KEY,
		name text NOT NULL,
		code text NOT NULL,
		contact_person text,
		contact_phone text,
		we_chat text,
		whats_app text,
		facebook text,
		instagram text,
		telegram text,
		email text,
		address text,
		status text,
		credit_limit real,
		balance real,
		created_at datetime,
		updated_at datetime,
		deleted_at datetime,
		version integer
	)`).Error; err != nil {
		t.Fatalf("create customer schema: %v", err)
	}

	now := time.Now().UTC()
	customers := []struct {
		id        string
		name      string
		code      string
		contact   string
		deletedAt *time.Time
	}{
		{id: "customer-alpha", name: "Alpha Industries", code: "C001", contact: "Alice"},
		{id: "customer-beta", name: "Beta Trading", code: "C002", contact: "Bob", deletedAt: &now},
		{id: "customer-gamma", name: "Gamma Works", code: "C003", contact: "Grace"},
	}
	for _, customer := range customers {
		if err := testDB.Exec(
			"INSERT INTO customers (id, name, code, contact_person, status, created_at, updated_at, deleted_at, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
			customer.id,
			customer.name,
			customer.code,
			customer.contact,
			"Active",
			now,
			now,
			customer.deletedAt,
			1,
		).Error; err != nil {
			t.Fatalf("seed customer %s: %v", customer.id, err)
		}
	}

	previousDB := appdb.DB
	appdb.DB = testDB
	t.Cleanup(func() { appdb.DB = previousDB })

	secondPage, err := ListCustomers(CustomerListQuery{Page: 2, PageSize: 1})
	if err != nil {
		t.Fatalf("list second page: %v", err)
	}
	if secondPage.Total != 2 || len(secondPage.Items) != 1 || secondPage.Items[0].Name != "Gamma Works" {
		t.Fatalf("unexpected second page: %+v", secondPage)
	}

	searchResult, err := ListCustomers(CustomerListQuery{Page: 1, PageSize: 20, Search: "grace"})
	if err != nil {
		t.Fatalf("search customers: %v", err)
	}
	if searchResult.Total != 1 || len(searchResult.Items) != 1 || searchResult.Items[0].ID != "customer-gamma" {
		t.Fatalf("unexpected search result: %+v", searchResult)
	}

	deletedResult, err := ListCustomers(CustomerListQuery{
		Page:           1,
		PageSize:       20,
		Search:         "beta",
		IncludeDeleted: true,
	})
	if err != nil {
		t.Fatalf("list deleted customers: %v", err)
	}
	if deletedResult.Total != 1 || len(deletedResult.Items) != 1 || !deletedResult.Items[0].IsDeleted {
		t.Fatalf("unexpected deleted result: %+v", deletedResult)
	}
}
