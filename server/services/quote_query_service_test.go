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

			got := mapSalesOrderToQuoteSummary(order, "new", "")
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

func TestQuoteQueryServiceDerivesDetailOrderNameForLegacyBlankOrderName(t *testing.T) {
	order := models.SalesOrder{
		ID:             "quote-1",
		OrderNo:        "Q-001",
		OrderName:      "   ",
		CustomerName:   "Acme",
		Type:           "retail",
		Classification: "quote",
		Status:         "Draft",
	}

	detail := mapSalesOrderToQuoteDetail(order, models.Customer{}, "new", "")
	if detail.OrderName != "Q-001" {
		t.Fatalf("OrderName = %q, want %q", detail.OrderName, "Q-001")
	}
}

func TestQuoteQueryServiceUsesResolvedOwnerName(t *testing.T) {
	order := models.SalesOrder{
		ID:        "quote-1",
		OrderNo:   "Q-001",
		UpdatedBy: "96945266-ca9e-494b-9521-4dda39ae688f",
		Status:    "Draft",
	}

	detail := mapSalesOrderToQuoteDetail(order, models.Customer{}, "new", "alice")
	if detail.OwnerName != "alice" {
		t.Fatalf("OwnerName = %q, want %q", detail.OwnerName, "alice")
	}
}

func TestQuoteOwnerDisplayNamePrefersEmployeeName(t *testing.T) {
	got := quoteOwnerDisplayNameForUser(models.User{
		ID:         "user-1",
		Username:   "alice",
		FirstName:  "Alice",
		LastName:   "User",
		EmployeeID: "emp-1",
	}, map[string]string{"emp-1": "张三"})

	if got != "张三" {
		t.Fatalf("display name = %q, want %q", got, "张三")
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
