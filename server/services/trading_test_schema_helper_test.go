package services

import (
	"testing"

	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

type tradingTestSchemaOptions struct {
	includeSales    bool
	includePurchase bool
	includeAuditLog bool
}

func applyTradingTestSchema(t *testing.T, testDB *gorm.DB, options tradingTestSchemaOptions) {
	t.Helper()

	statements := make([]string, 0, 5)
	if options.includeSales {
		statements = append(statements,
			`CREATE TABLE sales_orders (
				id TEXT PRIMARY KEY NOT NULL,
				order_no TEXT,
				order_name TEXT,
				customer_name TEXT,
				customer_id TEXT,
				type TEXT,
				currency TEXT,
				exchange_rate_snapshot REAL,
				payment_method TEXT,
				payment_method_name TEXT,
				payment_term TEXT,
				payment_term_name TEXT,
				classification TEXT,
				status TEXT,
				status_note TEXT,
				amount REAL,
				quantity REAL,
				order_date TEXT,
				delivery_date TEXT,
				purchase_order_no TEXT,
				barcode TEXT,
				requirements TEXT,
				evidences BLOB DEFAULT X'5B5D',
				created_at DATETIME,
				updated_at DATETIME,
				deleted_at DATETIME,
				updated_by TEXT,
				is_deleted BOOLEAN DEFAULT FALSE,
				version INTEGER DEFAULT 1
			)`,
			`CREATE TABLE sales_order_lines (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				sales_order_id TEXT,
				line_no INTEGER,
				product_id TEXT,
				product_model TEXT,
				product_code TEXT,
				specification TEXT,
				product_display_title_snapshot TEXT,
				product_display_subtitle_snapshot TEXT,
				product_display_code_snapshot TEXT,
				product_display_full_label_snapshot TEXT,
				product_display_strategy_version_snapshot TEXT,
				model_code_snapshot TEXT,
				hole_prefix_snapshot TEXT,
				appearance_id TEXT,
				appearance_name_snapshot TEXT,
				appearance_barcode_code_snapshot TEXT,
				appearance_description_snapshot TEXT,
				appearance_image_url_snapshot TEXT,
				description TEXT,
				qty REAL,
				uom TEXT,
				price REAL,
				amount REAL,
				delivered_qty REAL,
				customer_part_no TEXT,
				job_no TEXT,
				note TEXT,
				drilling_plan_id TEXT,
				labeling_plan_id TEXT,
				hole_count INTEGER,
				route TEXT,
				order_date TEXT,
				status TEXT,
				claimed_by TEXT,
				claimed_at TEXT,
				selected_packaging BLOB
			)`,
			`CREATE TABLE packaging_profiles (
				id TEXT PRIMARY KEY NOT NULL,
				created_at DATETIME,
				updated_at DATETIME,
				deleted_at DATETIME,
				code TEXT,
				name TEXT,
				packaging_type TEXT,
				length REAL,
				width REAL,
				height REAL,
				dimension_unit_code TEXT,
				net_weight REAL,
				gross_weight REAL,
				weight_unit_code TEXT,
				capacity REAL,
				capacity_unit_code TEXT,
				assembly_source TEXT,
				is_active BOOLEAN DEFAULT TRUE,
				notes TEXT
			)`,
			`CREATE TABLE packaging_profile_targets (
				id TEXT PRIMARY KEY NOT NULL,
				created_at DATETIME,
				updated_at DATETIME,
				deleted_at DATETIME,
				packaging_profile_id TEXT,
				entity_type TEXT,
				entity_id TEXT,
				entity_code TEXT,
				entity_name TEXT,
				spec TEXT,
				is_default BOOLEAN DEFAULT FALSE,
				sort_order INTEGER DEFAULT 0
			)`,
		)
	}

	if options.includePurchase {
		statements = append(statements,
			`CREATE TABLE purchase_orders (
				id TEXT PRIMARY KEY NOT NULL,
				order_no TEXT,
				supplier_id TEXT,
				supplier_name TEXT,
				order_date TEXT,
				expected_date TEXT,
				status TEXT,
				currency TEXT,
				amount REAL,
				exchange_rate REAL,
				purchaser TEXT,
				payment_method TEXT,
				payment_method_name TEXT,
				payment_term TEXT,
				payment_term_name TEXT,
				note TEXT,
				evidences BLOB DEFAULT X'5B5D',
				created_at DATETIME,
				updated_at DATETIME,
				deleted_at DATETIME,
				is_deleted BOOLEAN DEFAULT FALSE,
				version INTEGER DEFAULT 1
			)`,
			`CREATE TABLE purchase_order_lines (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				purchase_order_id TEXT,
				line_no INTEGER,
				material_id TEXT,
				material_code TEXT,
				material_name TEXT,
				specification TEXT,
				qty REAL,
				uom TEXT,
				price REAL,
				amount REAL,
				received_qty REAL,
				returned_qty REAL DEFAULT 0,
				status TEXT,
				version INTEGER DEFAULT 1
			)`,
		)
	}

	if options.includeAuditLog {
		statements = append(statements,
			`CREATE TABLE audit_logs (
				id TEXT PRIMARY KEY NOT NULL,
				module TEXT,
				target_id TEXT,
				action TEXT,
				diff TEXT,
				operator TEXT,
				ip TEXT,
				created_at DATETIME
			)`,
		)
	}

	for _, statement := range statements {
		require.NoError(t, testDB.Exec(statement).Error)
	}
}
