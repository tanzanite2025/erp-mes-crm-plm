package services

import "testing"

func TestMapBusinessEventSourceRequestAllowsQualityEntity(t *testing.T) {
	_, err := MapBusinessEventSourceRequestToModel(BusinessEventSourceRequest{
		ID:      "quality-standard",
		Code:    "QUALITY_STANDARD",
		Name:    "品质标准",
		Module:  "Quality",
		Entity:  "QUALITY",
		Enabled: true,
		Config:  BusinessEventSourceWriteConfigDTO{},
	})
	if err != nil {
		t.Fatalf("expected QUALITY entity to be accepted, got error: %v", err)
	}
}
