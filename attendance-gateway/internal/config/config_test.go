package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestLoadExpandsEnvironmentVariablesAfterJSONDecode(t *testing.T) {
	t.Setenv("ATT_TEST_BRIDGE_TOKEN", `bridge-"token"\with-slash`)
	t.Setenv("ATT_TEST_PUBLIC_ADDRESS", "192.0.2.20")
	t.Setenv("ATT_TEST_ISUP_KEY", `isup-"key"\with-slash`)
	t.Setenv("ATT_TEST_ERP_TOKEN", "erp-ingress-token-with-enough-length")

	raw, err := json.Marshal(map[string]interface{}{
		"erpBaseUrl":             "http://erp:8080",
		"bridgeToken":            "${ATT_TEST_BRIDGE_TOKEN}",
		"sdkBridgeCommand":       "bridge",
		"sdkBridgePublicAddress": "${ATT_TEST_PUBLIC_ADDRESS}",
		"sdkBridgeArgs":          []string{"${ATT_TEST_PUBLIC_ADDRESS}"},
		"sdkBridgeRuntimeDir":    "${ATT_TEST_PUBLIC_ADDRESS}/runtime",
		"sdkBridgeLogDir":        "${ATT_TEST_PUBLIC_ADDRESS}/logs",
		"devices": []map[string]interface{}{{
			"deviceCode":      "ATT-TEST-01",
			"isupKey":         "${ATT_TEST_ISUP_KEY}",
			"erpIngressToken": "${ATT_TEST_ERP_TOKEN}",
			"enabled":         true,
		}},
	})
	if err != nil {
		t.Fatalf("marshal config: %v", err)
	}

	path := filepath.Join(t.TempDir(), "config.json")
	if err := os.WriteFile(path, raw, 0600); err != nil {
		t.Fatalf("write config: %v", err)
	}

	cfg, err := Load(path)
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if cfg.BridgeToken != `bridge-"token"\with-slash` {
		t.Fatalf("bridge token was not expanded exactly: %q", cfg.BridgeToken)
	}
	if cfg.SDKBridgeArgs[0] != "192.0.2.20" {
		t.Fatalf("bridge argument was not expanded: %q", cfg.SDKBridgeArgs[0])
	}
	if cfg.SDKBridgeRuntimeDir != "192.0.2.20/runtime" ||
		cfg.SDKBridgeLogDir != "192.0.2.20/logs" {
		t.Fatalf(
			"bridge paths were not expanded: runtime=%q logs=%q",
			cfg.SDKBridgeRuntimeDir,
			cfg.SDKBridgeLogDir,
		)
	}
	if cfg.Devices[0].ISUPKey != `isup-"key"\with-slash` {
		t.Fatalf("ISUP key was not expanded exactly: %q", cfg.Devices[0].ISUPKey)
	}
}

func TestNormalizeAndValidateAppliesISUPDefaults(t *testing.T) {
	cfg := Config{
		ERPBaseURL:  "http://erp:8080",
		BridgeToken: "bridge-token-with-enough-length",
		Devices: []DeviceConfig{{
			DeviceCode:      " att_hik_01 ",
			ISUPKey:         "isup-key",
			ERPIngressToken: "erp-ingress-token-with-enough-length",
			Enabled:         true,
		}},
	}

	if err := cfg.NormalizeAndValidate(); err != nil {
		t.Fatalf("unexpected validation error: %v", err)
	}
	device := cfg.Devices[0]
	if device.DeviceCode != "ATT-HIK-01" {
		t.Fatalf("unexpected normalized device code: %s", device.DeviceCode)
	}
	if device.RegistrationID != "ATT-HIK-01" {
		t.Fatalf("unexpected registration id: %s", device.RegistrationID)
	}
	if device.RegistrationPort != 7660 || device.AlarmTCPPort != 7332 || device.AlarmUDPPort != 7334 {
		t.Fatalf(
			"unexpected default ports: registration=%d tcp=%d udp=%d",
			device.RegistrationPort,
			device.AlarmTCPPort,
			device.AlarmUDPPort,
		)
	}
}

func TestNormalizeAndValidateRejectsDuplicateDeviceCode(t *testing.T) {
	cfg := Config{
		ERPBaseURL:  "http://erp:8080",
		BridgeToken: "bridge-token-with-enough-length",
		Devices: []DeviceConfig{
			{DeviceCode: "ATT-01", ISUPKey: "key-1", ERPIngressToken: "token-1-with-enough-length"},
			{DeviceCode: "att_01", ISUPKey: "key-2", ERPIngressToken: "token-2-with-enough-length"},
		},
	}

	if err := cfg.NormalizeAndValidate(); err == nil {
		t.Fatal("expected duplicate device code validation error")
	}
}

func TestNormalizeAndValidateRejectsDifferentNativeBridgePorts(t *testing.T) {
	cfg := Config{
		ERPBaseURL:          "http://erp:8080",
		BridgeToken:         "bridge-token-with-enough-length",
		SDKBridgeCommand:    "native-bridge",
		SDKBridgePublicAddr: "192.168.1.20",
		Devices: []DeviceConfig{
			{DeviceCode: "ATT-01", RegistrationPort: 7660, AlarmTCPPort: 7332, AlarmUDPPort: 7334, ISUPKey: "key-1", ERPIngressToken: "token-1-with-enough-length", Enabled: true},
			{DeviceCode: "ATT-02", RegistrationPort: 7661, AlarmTCPPort: 7332, AlarmUDPPort: 7334, ISUPKey: "key-2", ERPIngressToken: "token-2-with-enough-length", Enabled: true},
		},
	}

	if err := cfg.NormalizeAndValidate(); err == nil {
		t.Fatal("expected shared native SDK port validation error")
	}
}

func TestNormalizeAndValidateAcceptsDisabledDeviceWithDifferentNativeBridgePorts(t *testing.T) {
	cfg := Config{
		ERPBaseURL:          "http://erp:8080",
		BridgeToken:         "bridge-token-with-enough-length",
		SDKBridgeCommand:    "native-bridge",
		SDKBridgePublicAddr: "192.168.1.20",
		Devices: []DeviceConfig{
			{DeviceCode: "ATT-01", RegistrationPort: 7660, AlarmTCPPort: 7332, AlarmUDPPort: 7334, ISUPKey: "key-1", ERPIngressToken: "token-1-with-enough-length", Enabled: true},
			{DeviceCode: "ATT-02", RegistrationPort: 7661, AlarmTCPPort: 7333, AlarmUDPPort: 7335, ISUPKey: "key-2", ERPIngressToken: "token-2-with-enough-length", Enabled: false},
		},
	}

	if err := cfg.NormalizeAndValidate(); err != nil {
		t.Fatalf("unexpected validation error: %v", err)
	}
}
