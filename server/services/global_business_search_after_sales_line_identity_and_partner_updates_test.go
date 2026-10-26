package services

import (
	"context"
	"os"
	"testing"
	"xdfc-server/authz"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestGlobalBusinessSearchProjectsAfterSalesLineIdentitiesLabelsAndCurrentCustomerNames(t *testing.T) {
	database := createIsolatedGlobalBusinessSearchDatabase(t)
	customerID := uuid.NewString()
	require.NoError(t, database.Exec(`INSERT INTO customers (id, code, name) VALUES (?, 'CUST-LIVE', '客户现名')`, customerID).Error)
	for _, scenario := range []struct{ category, table, codeColumn, lineTable, parentKey, labelTable, labelColumn string }{
		{"sales-return", "sales_returns", "return_no", "sales_return_lines", "sales_return_id", "sales_return_line_barcodes", "raw_code"},
		{"sales-exchange", "sales_exchanges", "exchange_no", "sales_exchange_lines", "sales_exchange_id", "sales_exchange_label_codes", "raw_label_code"},
	} {
		t.Run(scenario.category, func(t *testing.T) {
			recordID := uuid.NewString()
			require.NoError(t, database.Exec("INSERT INTO "+scenario.table+" (id, "+scenario.codeColumn+", customer_id, customer_name) VALUES (?, 'AFTER-SALES-77', ?, '历史客户名')", recordID, customerID).Error)
			require.NoError(t, database.Exec("INSERT INTO "+scenario.lineTable+" ("+scenario.parentKey+", product_code, product_model, specification, product_display_title_snapshot) VALUES (?, 'SKU-AFTER-77', '型号-77', '规格-77', '显示名称-77')", recordID).Error)
			require.NoError(t, database.Exec("INSERT INTO "+scenario.labelTable+" ("+scenario.parentKey+", "+scenario.labelColumn+") VALUES (?, 'LABEL-AFTER-77')", recordID).Error)
			if scenario.category == "sales-exchange" {
				require.NoError(t, database.Exec(`UPDATE sales_exchange_lines SET replacement_product_code = 'REPLACEMENT-77', replacement_product_model = '补发型号-77' WHERE sales_exchange_id = ?`, recordID).Error)
			}
			for _, source := range globalBusinessSearchSources {
				if source.category != scenario.category {
					continue
				}
				documents, err := loadGlobalBusinessSearchSourceDocuments(context.Background(), database, source, "", []string{recordID}, 1)
				require.NoError(t, err)
				require.Len(t, documents, 1)
				for _, keyword := range []string{"sku-after-77 客户现名", "CUST-LIVE 历史客户名", "型号-77 规格-77 显示名称-77", "LABEL-AFTER-77"} {
					require.True(t, globalBusinessSearchDocumentContainsKeywords(documents[0], keyword), keyword)
				}
				if scenario.category == "sales-exchange" {
					require.True(t, globalBusinessSearchDocumentContainsKeywords(documents[0], "replacement-77 补发型号-77"))
				}
			}
		})
	}
	// The optional integration traverses Go projection -> actual Rust -> live SQL hydration.
	if os.Getenv("GLOBAL_SEARCH_TEST_RUST_URL") != "" {
		result := requestGlobalBusinessSearchResults(t, "SKU-AFTER-77 客户现名", []string{authz.MenuTrading}, uuid.NewString(), "30", "")
		require.Len(t, result.Data, 2)
	}
}
