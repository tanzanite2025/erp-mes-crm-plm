package handlers

import (
	"fmt"
	"testing"
	"xdfc-server/db"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func setupHandlerSQLiteTestDB(t *testing.T, migrateModels ...any) *gorm.DB {
	t.Helper()

	prevDB := db.DB
	testDB, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite failed: %v", err)
	}

	if len(migrateModels) > 0 {
		if err := testDB.AutoMigrate(migrateModels...); err != nil {
			t.Fatalf("auto migrate test schema failed: %v", err)
		}
	}

	db.DB = testDB
	t.Cleanup(func() {
		db.DB = prevDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	return testDB
}
