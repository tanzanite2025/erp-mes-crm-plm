//go:build ignore

package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"strings"
	"xdfc-server/productidentity"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func loadEnv() {
	_ = godotenv.Load(".env.dev", "../.env.dev", "../../server/.env.dev")
}

func mustOpenDB() *gorm.DB {
	dsn := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if dsn == "" {
		log.Fatal("[CRITICAL] DATABASE_URL is required. Please export it or place it in server/.env.dev before running this backfill.")
	}

	database, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("[CRITICAL] Failed to connect to database: %v", err)
	}
	return database
}

func main() {
	apply := flag.Bool("apply", false, "Apply derived SKU backfill for products whose SKU is blank")
	flag.Parse()

	loadEnv()
	database := mustOpenDB()

	plans, err := productidentity.PlanBlankProductSKUBackfill(database)
	if err != nil {
		log.Fatalf("[CRITICAL] Failed to build blank product SKU backfill plan: %v", err)
	}

	if len(plans) == 0 {
		fmt.Println("[SCAN] No blank product SKUs found.")
		return
	}

	fmt.Printf("[SCAN] Found %d blank product SKU row(s).\n", len(plans))
	for _, plan := range plans {
		fmt.Printf(
			"[PLAN] id=%s name=%s type=%s model=%s version=%s => sku=%s\n",
			plan.ID,
			plan.Name,
			plan.TypeCode,
			plan.ModelCode,
			plan.VersionLevel,
			plan.DerivedSKU,
		)
	}

	if !*apply {
		fmt.Println("[DRY-RUN] No rows were changed. Re-run with -apply to persist the derived SKUs.")
		return
	}

	appliedPlans, err := productidentity.ApplyBlankProductSKUBackfill(database)
	if err != nil {
		log.Fatalf("[CRITICAL] Failed to apply blank product SKU backfill: %v", err)
	}

	fmt.Printf("[DONE] Applied SKU backfill for %d row(s).\n", len(appliedPlans))
}
