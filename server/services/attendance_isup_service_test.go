package services

import "testing"

func TestDefaultAttendanceTemplateUsesISUPEHome(t *testing.T) {
	templates := DefaultAttendanceDeviceTemplates()
	if len(templates) == 0 {
		t.Fatal("attendance device templates are empty")
	}

	hikvision := templates[0]
	if hikvision.Vendor != "hikvision" {
		t.Fatalf("unexpected first template vendor: %s", hikvision.Vendor)
	}
	if hikvision.Protocol != "isup-ehome" {
		t.Fatalf("unexpected Hikvision protocol: %s", hikvision.Protocol)
	}
	if hikvision.CollectMode != "push" || hikvision.Port != 7660 {
		t.Fatalf("unexpected ISUP defaults: mode=%s port=%d", hikvision.CollectMode, hikvision.Port)
	}
}

func TestNormalizeISUPEHomePort(t *testing.T) {
	if port := normalizePort(0, "isup-ehome"); port != 7660 {
		t.Fatalf("unexpected ISUP default port: %d", port)
	}
	if port := normalizePort(9000, "isup-ehome"); port != 9000 {
		t.Fatalf("configured ISUP port was not preserved: %d", port)
	}
}

func TestNormalizeAttendanceGatewayStatus(t *testing.T) {
	tests := map[string]string{
		"registered":   "online",
		"heartbeat":    "online",
		"disconnected": "offline",
		"fault":        "error",
		"unknown":      "",
	}
	for input, expected := range tests {
		if actual := normalizeAttendanceGatewayStatus(input); actual != expected {
			t.Fatalf("status %q: expected %q, got %q", input, expected, actual)
		}
	}
}
