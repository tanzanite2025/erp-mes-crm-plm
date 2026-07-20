package handlers

import (
	"errors"
	"testing"
)

func TestResolveLogisticsRecordTypeScope(t *testing.T) {
	tests := []struct {
		name            string
		requested       string
		canReadTrading  bool
		canReadPurchase bool
		want            string
		wantErr         error
	}{
		{name: "purchase defaults to receipts", canReadPurchase: true, want: "Receipt"},
		{name: "trading defaults to shipments", canReadTrading: true, want: "Shipment"},
		{name: "combined access may read all", canReadTrading: true, canReadPurchase: true, want: ""},
		{name: "purchase may request receipts", requested: "Receipt", canReadPurchase: true, want: "Receipt"},
		{name: "purchase cannot request shipments", requested: "Shipment", canReadPurchase: true, wantErr: errForbiddenLogisticsScope},
		{name: "trading cannot request receipts", requested: "Receipt", canReadTrading: true, wantErr: errForbiddenLogisticsScope},
		{name: "unsupported type is rejected", requested: "Other", canReadTrading: true, canReadPurchase: true, wantErr: errInvalidLogisticsRecordType},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got, err := resolveLogisticsRecordTypeScope(test.requested, test.canReadTrading, test.canReadPurchase)
			if !errors.Is(err, test.wantErr) {
				t.Fatalf("expected error %v, got %v", test.wantErr, err)
			}
			if got != test.want {
				t.Fatalf("expected scope %q, got %q", test.want, got)
			}
		})
	}
}

func TestCanReadDeliveryOrderBusinessType(t *testing.T) {
	tests := []struct {
		name            string
		bizType         string
		canReadTrading  bool
		canReadPurchase bool
		want            bool
	}{
		{name: "purchase may read purchase tracking", bizType: "Purchase", canReadPurchase: true, want: true},
		{name: "purchase cannot read sales tracking", bizType: "Sales", canReadPurchase: true},
		{name: "trading may read sales tracking", bizType: "Sales", canReadTrading: true, want: true},
		{name: "trading cannot read purchase tracking", bizType: "Purchase", canReadTrading: true},
		{name: "legacy empty type remains sales scoped", canReadTrading: true, want: true},
		{name: "unknown type is denied", bizType: "Other", canReadTrading: true, canReadPurchase: true},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got := canReadDeliveryOrderBusinessType(test.bizType, test.canReadTrading, test.canReadPurchase)
			if got != test.want {
				t.Fatalf("expected access %t, got %t", test.want, got)
			}
		})
	}
}
