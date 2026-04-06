//go:build ignore

package main

import (
	"fmt"
	"os"
	"xdfc-server/db"
	"xdfc-server/models"
)

func main() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "host=127.0.0.1 user=xdfc_admin password=Wang622575_secure_db dbname=xdfc_official port=5432 sslmode=disable"
	}

	db.InitDB(dsn)

	fmt.Println("--- Database Diagnostics ---")

	// 1. Check Tables
	tables := []string{"molds", "furnaces", "mold_loans"}
	for _, table := range tables {
		var exists bool
		err := db.DB.Raw("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = ?)", table).Scan(&exists).Error
		if err != nil {
			fmt.Printf("[ERROR] Failed to check table %s: %v\n", table, err)
			continue
		}
		fmt.Printf("Table %s exists: %v\n", table, exists)
	}

	// 2. Try to fetch one from each
	var mold models.Mold
	if err := db.DB.First(&mold).Error; err != nil {
		fmt.Printf("[FAILED] Fetch Mold: %v\n", err)
	} else {
		fmt.Printf("[SUCCESS] Fetch Mold: %s\n", mold.SN)
	}

	var furnace models.Furnace
	if err := db.DB.First(&furnace).Error; err != nil {
		fmt.Printf("[FAILED] Fetch Furnace: %v\n", err)
	} else {
		fmt.Printf("[SUCCESS] Fetch Furnace: %s\n", furnace.SN)
	}

	var loan models.MoldLoan
	if err := db.DB.First(&loan).Error; err != nil {
		fmt.Printf("[FAILED] Fetch MoldLoan: %v\n", err)
	} else {
		fmt.Printf("[SUCCESS] Fetch MoldLoan: %s\n", loan.ID)
	}

	fmt.Println("--- Diagnostics Finished ---")
}
