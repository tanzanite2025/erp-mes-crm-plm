//go:build ignore

package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type duplicateMaterial struct {
	MaterialID   string
	MaterialCode string
	MaterialName string
	RuleCount    int64
}

type packagingRuleRecord struct {
	ID               string
	MaterialID       string
	PackUnit         string
	BaseUnit         string
	ConversionFactor float64
	Direction        string
	UpdatedAt        time.Time
}

func loadEnv() {
	_ = godotenv.Load(".env.local", "../.env.local", "../../.env.local")
}

func mustOpenDB() *gorm.DB {
	dsn := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if dsn == "" {
		log.Fatal("[CRITICAL] DATABASE_URL is required. Please export it or place it in .env.local before running this cleanup.")
	}

	database, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("[CRITICAL] Failed to connect to database: %v", err)
	}
	return database
}

func findDuplicateMaterials(database *gorm.DB, materialID string) ([]duplicateMaterial, error) {
	var duplicates []duplicateMaterial

	query := database.Table("packaging_rules AS pr").
		Select(`
			pr.material_id AS material_id,
			COALESCE(m.code, '') AS material_code,
			COALESCE(m.name, '') AS material_name,
			COUNT(*) AS rule_count
		`).
		Joins("LEFT JOIN materials AS m ON m.id = pr.material_id").
		Group("pr.material_id, m.code, m.name").
		Having("COUNT(*) > 1").
		Order("COUNT(*) DESC, pr.material_id ASC")

	if strings.TrimSpace(materialID) != "" {
		query = query.Where("pr.material_id = ?", strings.TrimSpace(materialID))
	}

	if err := query.Scan(&duplicates).Error; err != nil {
		return nil, err
	}
	return duplicates, nil
}

func loadRulesForMaterial(tx *gorm.DB, materialID string) ([]packagingRuleRecord, error) {
	var rules []packagingRuleRecord
	err := tx.Table("packaging_rules").
		Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("material_id = ?", materialID).
		Order("updated_at DESC NULLS LAST, id DESC").
		Scan(&rules).Error
	return rules, err
}

func ensureUniqueIndex(tx *gorm.DB) error {
	if err := tx.Exec("DROP INDEX IF EXISTS idx_packaging_rules_material_id").Error; err != nil {
		return err
	}
	return tx.Exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_packaging_rules_material_id ON packaging_rules (material_id)").Error
}

func formatRule(rule packagingRuleRecord) string {
	updatedAt := "<zero>"
	if !rule.UpdatedAt.IsZero() {
		updatedAt = rule.UpdatedAt.Format(time.RFC3339)
	}
	return fmt.Sprintf(
		"id=%s updatedAt=%s %s/%s factor=%.6f direction=%s",
		rule.ID,
		updatedAt,
		rule.PackUnit,
		rule.BaseUnit,
		rule.ConversionFactor,
		rule.Direction,
	)
}

func printPlan(duplicates []duplicateMaterial, ruleMap map[string][]packagingRuleRecord) {
	fmt.Printf("[SCAN] Found %d material(s) with duplicate packaging rules.\n", len(duplicates))
	for _, dup := range duplicates {
		label := dup.MaterialID
		if dup.MaterialCode != "" || dup.MaterialName != "" {
			label = fmt.Sprintf("%s [%s %s]", dup.MaterialID, dup.MaterialCode, dup.MaterialName)
		}
		fmt.Printf("\n[MATERIAL] %s duplicateCount=%d\n", label, dup.RuleCount)

		rules := ruleMap[dup.MaterialID]
		if len(rules) == 0 {
			fmt.Println("  [WARN] No rules loaded for this material.")
			continue
		}

		fmt.Printf("  [KEEP]   %s\n", formatRule(rules[0]))
		for _, rule := range rules[1:] {
			fmt.Printf("  [DELETE] %s\n", formatRule(rule))
		}
	}
}

func main() {
	apply := flag.Bool("apply", false, "Delete duplicate packaging rules instead of dry-run only")
	materialID := flag.String("material-id", "", "Only inspect and clean the specified material_id")
	flag.Parse()

	loadEnv()
	database := mustOpenDB()

	duplicates, err := findDuplicateMaterials(database, *materialID)
	if err != nil {
		log.Fatalf("[CRITICAL] Failed to scan duplicate packaging rules: %v", err)
	}

	ruleMap := make(map[string][]packagingRuleRecord, len(duplicates))
	for _, dup := range duplicates {
		rules, err := loadRulesForMaterial(database, dup.MaterialID)
		if err != nil {
			log.Fatalf("[CRITICAL] Failed to load rules for material %s: %v", dup.MaterialID, err)
		}
		ruleMap[dup.MaterialID] = rules
	}

	if len(duplicates) == 0 {
		fmt.Println("[SCAN] No duplicate packaging rules found.")
		if *apply {
			if err := ensureUniqueIndex(database); err != nil {
				log.Fatalf("[CRITICAL] Failed to ensure unique index: %v", err)
			}
			fmt.Println("[APPLY] Unique index ensured: idx_packaging_rules_material_id")
		}
		return
	}

	printPlan(duplicates, ruleMap)

	if !*apply {
		fmt.Println("\n[DRY-RUN] No rows were changed. Re-run with -apply to delete duplicates and create the unique index.")
		return
	}

	err = database.Transaction(func(tx *gorm.DB) error {
		for _, dup := range duplicates {
			rules, err := loadRulesForMaterial(tx, dup.MaterialID)
			if err != nil {
				return err
			}
			if len(rules) <= 1 {
				continue
			}

			deleteIDs := make([]string, 0, len(rules)-1)
			for _, rule := range rules[1:] {
				deleteIDs = append(deleteIDs, rule.ID)
			}

			if err := tx.Table("packaging_rules").Where("id IN ?", deleteIDs).Delete(&packagingRuleRecord{}).Error; err != nil {
				return err
			}

			fmt.Printf("[APPLY] material=%s kept=%s deleted=%d\n", dup.MaterialID, rules[0].ID, len(deleteIDs))
		}

		return ensureUniqueIndex(tx)
	})
	if err != nil {
		log.Fatalf("[CRITICAL] Cleanup failed: %v", err)
	}

	fmt.Println("[DONE] Duplicate packaging rules cleaned and unique index ensured.")
}
