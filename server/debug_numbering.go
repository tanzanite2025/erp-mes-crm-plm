package main

import (
	"fmt"
	"log"
	"os"
	"xdfc-server/db"
	"xdfc-server/models"
)

func DebugNumbering() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "host=127.0.0.1 user=xdfc_admin password=Wang622575_secure_db dbname=xdfc_official port=5432 sslmode=disable"
	}
	
	db.InitDB(dsn)
	
	fmt.Println("Attempting to query NumberingRule table...")
	var rules []models.NumberingRule
	if err := db.DB.Order("rule_key asc").Find(&rules).Error; err != nil {
		log.Fatalf("[CRITICAL] Database query failed: %v", err)
	}
	
	fmt.Printf("SUCCESS: Found %d rules in database.\n", len(rules))
	for _, r := range rules {
		fmt.Printf(" - Key: %s, CurrentSeq: %d\n", r.RuleKey, r.CurrentSeq)
	}
}
