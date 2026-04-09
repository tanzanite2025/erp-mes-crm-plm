package services

import (
	"math"
	"testing"
	"xdfc-server/models"
)

func TestSalesOrderRecalculateAuthorityCosts(t *testing.T) {
	tests := []struct {
		name    string
		lines   []models.SalesOrderLine
		wantQty float64
		wantAmt float64
	}{
		{
			name:    "Basic rounding",
			lines:   []models.SalesOrderLine{{Qty: 1.333, Price: 10}}, // 1.333 * 10 = 13.33
			wantQty: 1.333,
			wantAmt: 13.33,
		},
		{
			name:    "Precision boundary 0.5 up",
			lines:   []models.SalesOrderLine{{Qty: 1, Price: 0.125}}, // 1 * 0.125 = 0.125 -> 0.13
			wantQty: 1.0,
			wantAmt: 0.13,
		},
		{
			name: "Multiple lines accumulation",
			lines: []models.SalesOrderLine{
				{Qty: 10, Price: 1.234}, // 12.34
				{Qty: 5, Price: 2.111},  // 10.56
			},
			wantQty: 15.0,
			wantAmt: 22.90, // 12.34 + 10.56 = 22.90
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			order := &models.SalesOrder{Lines: tt.lines}
			recalculateSalesOrderAuthorityCosts(order)

			if order.Quantity != tt.wantQty {
				t.Errorf("got Qty %v, want %v", order.Quantity, tt.wantQty)
			}
			if order.Amount != tt.wantAmt {
				t.Errorf("got Amount %v, want %v", order.Amount, tt.wantAmt)
			}

			// Verify lines
			for i, line := range order.Lines {
				expectedLineAmt := math.Round(tt.lines[i].Qty*tt.lines[i].Price*100) / 100
				if line.Amount != expectedLineAmt {
					t.Errorf("line %d: got Amount %v, want %v", i, line.Amount, expectedLineAmt)
				}
			}
		})
	}
}

func TestPurchaseOrderRecalculateAuthorityCosts(t *testing.T) {
	order := &models.PurchaseOrder{
		Lines: []models.PurchaseOrderLine{
			{Qty: 100, Price: 1.234}, // 123.4
			{Qty: 2, Price: 3.335},   // 6.67
		},
	}
	recalculatePurchaseOrderAuthorityCosts(order)

	if order.Amount != 130.07 { // 123.4 + 6.67
		t.Errorf("got Amount %v, want 130.07", order.Amount)
	}
}
