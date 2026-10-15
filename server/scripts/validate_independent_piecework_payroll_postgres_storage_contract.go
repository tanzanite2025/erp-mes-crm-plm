//go:build ignore

package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"os"
	"strings"
)

type independentPieceworkPayrollStorageValidationReport struct {
	Schema                  string   `json:"schema"`
	MissingTables           []string `json:"missingTables"`
	MissingColumns          []string `json:"missingColumns"`
	MissingConstraints      []string `json:"missingConstraints"`
	ObsoleteColumns         []string `json:"obsoleteColumns"`
	NullableRequiredColumns []string `json:"nullableRequiredColumns"`
	Ready                   bool     `json:"ready"`
}

func main() {
	schema := flag.String("schema", "public", "Payroll schema to inspect without executing migrations")
	failIncomplete := flag.Bool("fail-on-incomplete", false, "Exit nonzero when storage requirements are missing")
	flag.Parse()
	_ = godotenv.Load(".env.dev", "../.env.dev")
	dsn := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if dsn == "" {
		fmt.Fprintln(os.Stderr, "DATABASE_URL is required")
		os.Exit(1)
	}
	database, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		fmt.Fprintln(os.Stderr, "cannot connect to PostgreSQL")
		os.Exit(1)
	}
	connection, err := database.DB()
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	defer connection.Close()
	report, err := inspectIndependentPieceworkPayrollStorageContract(database, *schema)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	encoded, _ := json.MarshalIndent(report, "", "  ")
	fmt.Println(string(encoded))
	if *failIncomplete && !report.Ready {
		os.Exit(2)
	}
}

func inspectIndependentPieceworkPayrollStorageContract(database *gorm.DB, schema string) (independentPieceworkPayrollStorageValidationReport, error) {
	report := independentPieceworkPayrollStorageValidationReport{Schema: schema, MissingTables: []string{}, MissingColumns: []string{}, MissingConstraints: []string{}, ObsoleteColumns: []string{}, NullableRequiredColumns: []string{}}
	for _, table := range []struct {
		name                 string
		columns, constraints []string
	}{
		{"piecework_pay_items", []string{"id", "code", "name", "unit", "status", "version"}, nil},
		{"piecework_rates", []string{"pay_item_id", "pay_item_code", "pay_item_name", "unit", "unit_price", "currency", "effective_from", "effective_to", "status", "version"}, []string{"chk_piecework_rates_payroll_contract", "ex_piecework_rates_payroll_item_interval", "fk_piecework_rates_independent_payroll_item"}},
	} {
		var count int64
		if err := database.Raw("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = ? AND table_name = ?", schema, table.name).Scan(&count).Error; err != nil {
			return report, err
		}
		if count == 0 {
			report.MissingTables = append(report.MissingTables, table.name)
			continue
		}
		for _, column := range table.columns {
			if err := database.Raw("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = ?", schema, table.name, column).Scan(&count).Error; err != nil {
				return report, err
			}
			if count == 0 {
				report.MissingColumns = append(report.MissingColumns, table.name+"."+column)
			}
			if column != "effective_to" {
				if err := database.Raw("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=? AND table_name=? AND column_name=? AND is_nullable='YES'", schema, table.name, column).Scan(&count).Error; err != nil {
					return report, err
				}
				if count > 0 {
					report.NullableRequiredColumns = append(report.NullableRequiredColumns, table.name+"."+column)
				}
			}
		}
		for _, constraint := range table.constraints {
			if err := database.Raw(`SELECT COUNT(*) FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname=? AND t.relname=? AND c.conname=?`, schema, table.name, constraint).Scan(&count).Error; err != nil {
				return report, err
			}
			if count == 0 {
				report.MissingConstraints = append(report.MissingConstraints, constraint)
			}
		}
		if table.name != "piecework_pay_items" {
			var blocked []string
			if err := database.Raw(`SELECT column_name FROM information_schema.columns WHERE table_schema=? AND table_name=? AND column_name IN ('product_id','product_name','process_step_id','process_code','process_name','route_step_id','route_id','source_execution_id','piece_price','effective_at') ORDER BY column_name`, schema, table.name).Scan(&blocked).Error; err != nil {
				return report, err
			}
			for _, column := range blocked {
				report.ObsoleteColumns = append(report.ObsoleteColumns, table.name+"."+column)
			}
		}
	}
	report.Ready = len(report.MissingTables)+len(report.MissingColumns)+len(report.MissingConstraints)+len(report.ObsoleteColumns)+len(report.NullableRequiredColumns) == 0
	return report, nil
}
