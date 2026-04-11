package handlers

import "testing"

func TestIsValidMaterialCachePayloadForOptions(t *testing.T) {
	t.Run("accepts current options payload", func(t *testing.T) {
		payload := []byte(`{"items":[{"id":"mat-1","code":"M-001","name":"Carbon Cloth"}],"version":"7"}`)
		if !isValidMaterialCachePayload(payload, true) {
			t.Fatalf("expected options payload to be accepted")
		}
	})

	t.Run("rejects stale root array payload", func(t *testing.T) {
		payload := []byte(`[{"id":"mat-1","code":"M-001","name":"Carbon Cloth"}]`)
		if isValidMaterialCachePayload(payload, true) {
			t.Fatalf("expected root array payload to be rejected")
		}
	})

	t.Run("rejects non-array items field", func(t *testing.T) {
		payload := []byte(`{"items":{"id":"mat-1"},"version":"7"}`)
		if isValidMaterialCachePayload(payload, true) {
			t.Fatalf("expected non-array items payload to be rejected")
		}
	})
}

func TestIsValidMaterialCachePayloadForPagedList(t *testing.T) {
	t.Run("accepts current page payload", func(t *testing.T) {
		payload := []byte(`{"items":[{"id":"mat-1","code":"M-001","name":"Carbon Cloth"}],"total":1,"page":1,"pageSize":20,"version":"7"}`)
		if !isValidMaterialCachePayload(payload, false) {
			t.Fatalf("expected paged payload to be accepted")
		}
	})

	t.Run("rejects missing pagination metadata", func(t *testing.T) {
		payload := []byte(`{"items":[{"id":"mat-1","code":"M-001","name":"Carbon Cloth"}],"version":"7"}`)
		if isValidMaterialCachePayload(payload, false) {
			t.Fatalf("expected paged payload without pagination metadata to be rejected")
		}
	})
}
