package services

import (
	"testing"
	"xdfc-server/models"
)

func TestQuoteQueryServiceNormalizesQuoteSummaryTypeAliases(t *testing.T) {
	tests := []struct {
		name           string
		orderType      string
		classification string
		want           string
	}{
		{name: "legacy sam abbreviation", orderType: "SAM", want: "sample"},
		{name: "sales order sample classification", orderType: "CUSTOMER", classification: "SAMPLE", want: "sample"},
		{name: "sales order customer type", orderType: "CUSTOMER", classification: "GENERAL", want: "retail"},
		{name: "outsourced sales order", orderType: "OUTSOURCE", classification: "GENERAL", want: "wholesale"},
		{name: "unknown value falls back to retail", orderType: "unexpected", want: "retail"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			order := models.SalesOrder{
				ID:             "quote-1",
				OrderNo:        "Q-001",
				CustomerName:   "Acme",
				Type:           tt.orderType,
				Classification: tt.classification,
				Status:         "Pending",
				UpdatedBy:      "tester",
				Requirements:   "Product",
			}

			got := mapSalesOrderToQuoteSummary(order, "new")
			if got.Type != tt.want {
				t.Fatalf("got quote type %q, want %q", got.Type, tt.want)
			}
		})
	}
}

func TestQuoteQueryServiceNormalizesQuoteStatuses(t *testing.T) {
	tests := map[string]string{
		"Draft":      "draft",
		"InProgress": "pending",
		"Done":       "converted",
		"Canceled":   "voided",
	}

	for raw, want := range tests {
		if got := normalizeQuoteStatus(raw); got != want {
			t.Fatalf("normalizeQuoteStatus(%q) = %q, want %q", raw, got, want)
		}
	}
}

func TestQuoteQueryServiceNormalizesQuoteTypeFilters(t *testing.T) {
	tests := map[string]string{
		"":          "",
		"all":       "",
		"SAM":       "sample",
		"wholesale": "wholesale",
		"CUSTOMER":  "retail",
	}

	for raw, want := range tests {
		if got := normalizeQuoteTypeFilter(raw); got != want {
			t.Fatalf("normalizeQuoteTypeFilter(%q) = %q, want %q", raw, got, want)
		}
	}
}

func TestQuoteQueryServiceNormalizesQuoteStatusFilters(t *testing.T) {
	tests := map[string]string{
		"":         "",
		"all":      "",
		"pending":  "pending",
		"Done":     "converted",
		"Canceled": "voided",
	}

	for raw, want := range tests {
		if got := normalizeQuoteStatusFilter(raw); got != want {
			t.Fatalf("normalizeQuoteStatusFilter(%q) = %q, want %q", raw, got, want)
		}
	}
}
