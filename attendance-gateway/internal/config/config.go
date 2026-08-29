package config

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strings"
)

type Config struct {
	ConfigFile          string         `json:"-"`
	ListenAddr          string         `json:"listenAddr"`
	ERPBaseURL          string         `json:"erpBaseUrl"`
	ERPEventsPath       string         `json:"erpEventsPath"`
	ERPStatusPath       string         `json:"erpStatusPath"`
	ERPTimeoutSeconds   int            `json:"erpTimeoutSeconds"`
	BridgeToken         string         `json:"bridgeToken"`
	QueueDir            string         `json:"queueDir"`
	DeadLetterDir       string         `json:"deadLetterDir"`
	MaxQueueItems       int            `json:"maxQueueItems"`
	RetryIntervalSecond int            `json:"retryIntervalSeconds"`
	MaxRetryAttempts    int            `json:"maxRetryAttempts"`
	SDKBridgeCommand    string         `json:"sdkBridgeCommand"`
	SDKBridgeArgs       []string       `json:"sdkBridgeArgs"`
	SDKBridgeWorkDir    string         `json:"sdkBridgeWorkDir"`
	SDKBridgeAPI        string         `json:"sdkBridgeApi"`
	SDKBridgePublicAddr string         `json:"sdkBridgePublicAddress"`
	SDKBridgeAlarmProto string         `json:"sdkBridgeAlarmProtocol"`
	SDKBridgeTimezone   string         `json:"sdkBridgeTimezoneOffset"`
	SDKBridgeRuntimeDir string         `json:"sdkBridgeRuntimeDir"`
	SDKBridgeLogDir     string         `json:"sdkBridgeLogDir"`
	Devices             []DeviceConfig `json:"devices"`
}

type DeviceConfig struct {
	DeviceCode       string `json:"deviceCode"`
	RegistrationID   string `json:"registrationId"`
	RegistrationPort int    `json:"registrationPort"`
	AlarmTCPPort     int    `json:"alarmTcpPort"`
	AlarmUDPPort     int    `json:"alarmUdpPort"`
	// ISUPKey authenticates the device to the native Hikvision Bridge. It is
	// intentionally kept in the Gateway deployment config and is not exposed
	// by the Bridge device-list endpoint or synchronized from the ERP page.
	ISUPKey string `json:"isupKey"`
	// ERPIngressToken authenticates Gateway -> ERP requests. It is distinct
	// from ISUPKey and must be updated in this file when the ERP-side token is
	// rotated in the device management page.
	ERPIngressToken string `json:"erpIngressToken"`
	Enabled         bool   `json:"enabled"`
}

type BridgeDevice struct {
	DeviceCode       string `json:"deviceCode"`
	RegistrationID   string `json:"registrationId"`
	RegistrationPort int    `json:"registrationPort"`
	AlarmTCPPort     int    `json:"alarmTcpPort"`
	AlarmUDPPort     int    `json:"alarmUdpPort"`
	Enabled          bool   `json:"enabled"`
}

func Load(path string) (Config, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return Config{}, fmt.Errorf("读取配置文件 %s: %w", path, err)
	}

	var cfg Config
	if err := json.Unmarshal(raw, &cfg); err != nil {
		return Config{}, fmt.Errorf("解析 JSON 配置失败: %w", err)
	}
	cfg.ExpandEnv()
	if err := cfg.NormalizeAndValidate(); err != nil {
		return Config{}, err
	}
	return cfg, nil
}

func (c *Config) ExpandEnv() {
	c.ListenAddr = os.ExpandEnv(c.ListenAddr)
	c.ERPBaseURL = os.ExpandEnv(c.ERPBaseURL)
	c.ERPEventsPath = os.ExpandEnv(c.ERPEventsPath)
	c.ERPStatusPath = os.ExpandEnv(c.ERPStatusPath)
	c.BridgeToken = os.ExpandEnv(c.BridgeToken)
	c.QueueDir = os.ExpandEnv(c.QueueDir)
	c.DeadLetterDir = os.ExpandEnv(c.DeadLetterDir)
	c.SDKBridgeCommand = os.ExpandEnv(c.SDKBridgeCommand)
	c.SDKBridgeWorkDir = os.ExpandEnv(c.SDKBridgeWorkDir)
	c.SDKBridgeAPI = os.ExpandEnv(c.SDKBridgeAPI)
	c.SDKBridgePublicAddr = os.ExpandEnv(c.SDKBridgePublicAddr)
	c.SDKBridgeAlarmProto = os.ExpandEnv(c.SDKBridgeAlarmProto)
	c.SDKBridgeTimezone = os.ExpandEnv(c.SDKBridgeTimezone)
	c.SDKBridgeRuntimeDir = os.ExpandEnv(c.SDKBridgeRuntimeDir)
	c.SDKBridgeLogDir = os.ExpandEnv(c.SDKBridgeLogDir)
	for index := range c.SDKBridgeArgs {
		c.SDKBridgeArgs[index] = os.ExpandEnv(c.SDKBridgeArgs[index])
	}
	for index := range c.Devices {
		device := &c.Devices[index]
		device.DeviceCode = os.ExpandEnv(device.DeviceCode)
		device.RegistrationID = os.ExpandEnv(device.RegistrationID)
		device.ISUPKey = os.ExpandEnv(device.ISUPKey)
		device.ERPIngressToken = os.ExpandEnv(device.ERPIngressToken)
	}
}

func (c *Config) NormalizeAndValidate() error {
	c.ListenAddr = strings.TrimSpace(c.ListenAddr)
	if c.ListenAddr == "" {
		c.ListenAddr = "0.0.0.0:9090"
	}

	c.ERPBaseURL = strings.TrimRight(strings.TrimSpace(c.ERPBaseURL), "/")
	parsed, err := url.Parse(c.ERPBaseURL)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return errors.New("erpBaseUrl 必须是包含协议和主机的 URL，例如 http://app:8080")
	}

	c.ERPEventsPath = normalizePath(c.ERPEventsPath, "/api/v1/attendance-events/ingest")
	c.ERPStatusPath = normalizePath(c.ERPStatusPath, "/api/v1/attendance-events/device-status")
	if c.ERPTimeoutSeconds <= 0 {
		c.ERPTimeoutSeconds = 15
	}
	if len(strings.TrimSpace(c.BridgeToken)) < 16 {
		return errors.New("bridgeToken 至少需要 16 个字符")
	}
	if strings.TrimSpace(c.QueueDir) == "" {
		c.QueueDir = "/var/lib/xdfc-isup-gateway/queue"
	}
	if strings.TrimSpace(c.DeadLetterDir) == "" {
		c.DeadLetterDir = filepath.Join(filepath.Dir(c.QueueDir), "dead-letter")
	}
	if c.MaxQueueItems <= 0 {
		c.MaxQueueItems = 100000
	}
	if c.RetryIntervalSecond <= 0 {
		c.RetryIntervalSecond = 10
	}
	if c.MaxRetryAttempts <= 0 {
		c.MaxRetryAttempts = 100
	}
	if c.SDKBridgeCommand != "" {
		c.SDKBridgeCommand = strings.TrimSpace(c.SDKBridgeCommand)
		c.SDKBridgeWorkDir = strings.TrimSpace(c.SDKBridgeWorkDir)
		if strings.TrimSpace(c.SDKBridgeAPI) == "" {
			c.SDKBridgeAPI = "http://127.0.0.1:9090"
		}
		c.SDKBridgePublicAddr = strings.TrimSpace(c.SDKBridgePublicAddr)
		if c.SDKBridgePublicAddr == "" && strings.TrimSpace(os.Getenv("ISUP_GATEWAY_PUBLIC_ADDRESS")) == "" {
			return errors.New("sdkBridgePublicAddress 不能为空，必须填写设备可访问的网关 IP 或域名")
		}
		if c.SDKBridgePublicAddr == "" {
			c.SDKBridgePublicAddr = strings.TrimSpace(os.Getenv("ISUP_GATEWAY_PUBLIC_ADDRESS"))
		}
		if c.SDKBridgeAlarmProto == "" {
			c.SDKBridgeAlarmProto = "tcp"
		}
		c.SDKBridgeAlarmProto = strings.ToLower(strings.TrimSpace(c.SDKBridgeAlarmProto))
		if c.SDKBridgeAlarmProto != "tcp" && c.SDKBridgeAlarmProto != "udp" {
			return errors.New("sdkBridgeAlarmProtocol 只能是 tcp 或 udp")
		}
		c.SDKBridgeTimezone = strings.TrimSpace(c.SDKBridgeTimezone)
		if c.SDKBridgeTimezone == "" {
			c.SDKBridgeTimezone = "+08:00"
		}
		if !validTimezoneOffset(c.SDKBridgeTimezone) {
			return errors.New("sdkBridgeTimezoneOffset 必须是形如 +08:00 或 -05:00 的时区偏移")
		}
		c.SDKBridgeRuntimeDir = strings.TrimSpace(c.SDKBridgeRuntimeDir)
		c.SDKBridgeLogDir = strings.TrimSpace(c.SDKBridgeLogDir)
	}

	if len(c.Devices) == 0 {
		return errors.New("至少配置一台考勤设备")
	}

	seen := make(map[string]struct{}, len(c.Devices))
	for index := range c.Devices {
		device := &c.Devices[index]
		device.DeviceCode = normalizeDeviceCode(device.DeviceCode)
		device.RegistrationID = strings.TrimSpace(device.RegistrationID)
		device.ISUPKey = strings.TrimSpace(device.ISUPKey)
		device.ERPIngressToken = strings.TrimSpace(device.ERPIngressToken)
		if device.DeviceCode == "" {
			return fmt.Errorf("devices[%d].deviceCode 不能为空", index)
		}
		if device.RegistrationID == "" {
			device.RegistrationID = device.DeviceCode
		}
		if device.RegistrationPort <= 0 {
			device.RegistrationPort = 7660
		}
		if device.AlarmTCPPort <= 0 {
			device.AlarmTCPPort = 7332
		}
		if device.AlarmUDPPort <= 0 {
			device.AlarmUDPPort = 7334
		}
		if device.RegistrationPort > 65535 || device.AlarmTCPPort > 65535 || device.AlarmUDPPort > 65535 {
			return fmt.Errorf("设备 %s 的端口必须在 1 到 65535 之间", device.DeviceCode)
		}
		if device.ISUPKey == "" {
			return fmt.Errorf("设备 %s 未配置 isupKey", device.DeviceCode)
		}
		if len(device.ERPIngressToken) < 16 {
			return fmt.Errorf("设备 %s 的 erpIngressToken 至少需要 16 个字符", device.DeviceCode)
		}
		if _, exists := seen[device.DeviceCode]; exists {
			return fmt.Errorf("设备编码重复: %s", device.DeviceCode)
		}
		seen[device.DeviceCode] = struct{}{}
	}
	if c.SDKBridgeCommand != "" {
		if err := validateSharedSDKPorts(c.Devices); err != nil {
			return err
		}
	}
	return nil
}

func validateSharedSDKPorts(devices []DeviceConfig) error {
	var shared *DeviceConfig
	for index := range devices {
		device := &devices[index]
		if !device.Enabled {
			continue
		}
		if shared == nil {
			shared = device
			continue
		}
		if device.RegistrationPort != shared.RegistrationPort ||
			device.AlarmTCPPort != shared.AlarmTCPPort ||
			device.AlarmUDPPort != shared.AlarmUDPPort {
			return fmt.Errorf(
				"sdkBridgeCommand 使用官方 SDK 原生监听器时，启用设备必须共享注册/TCP报警/UDP报警端口；设备 %s 与 %s 配置不一致",
				shared.DeviceCode,
				device.DeviceCode,
			)
		}
	}
	return nil
}

func validTimezoneOffset(value string) bool {
	if len(value) != 6 || (value[0] != '+' && value[0] != '-') || value[3] != ':' {
		return false
	}
	for index, char := range value {
		if index == 0 || index == 3 {
			continue
		}
		if char < '0' || char > '9' {
			return false
		}
	}
	hours := int(value[1]-'0')*10 + int(value[2]-'0')
	minutes := int(value[4]-'0')*10 + int(value[5]-'0')
	return hours <= 14 && minutes < 60
}

func (c Config) FindDevice(deviceCode string) (DeviceConfig, bool) {
	normalized := normalizeDeviceCode(deviceCode)
	for _, device := range c.Devices {
		if device.DeviceCode == normalized {
			return device, true
		}
	}
	return DeviceConfig{}, false
}

func (c Config) BridgeDevices() []BridgeDevice {
	devices := make([]BridgeDevice, 0, len(c.Devices))
	for _, device := range c.Devices {
		devices = append(devices, BridgeDevice{
			DeviceCode:       device.DeviceCode,
			RegistrationID:   device.RegistrationID,
			RegistrationPort: device.RegistrationPort,
			AlarmTCPPort:     device.AlarmTCPPort,
			AlarmUDPPort:     device.AlarmUDPPort,
			Enabled:          device.Enabled,
		})
	}
	return devices
}

func normalizePath(value, fallback string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return fallback
	}
	if !strings.HasPrefix(value, "/") {
		return "/" + value
	}
	return value
}

func normalizeDeviceCode(value string) string {
	value = strings.ToUpper(strings.TrimSpace(value))
	var builder strings.Builder
	lastDash := false
	for _, r := range value {
		switch {
		case r >= 'A' && r <= 'Z', r >= '0' && r <= '9':
			builder.WriteRune(r)
			lastDash = false
		case r == '-' || r == '_' || r == ' ' || r == '.':
			if builder.Len() == 0 || lastDash {
				continue
			}
			builder.WriteRune('-')
			lastDash = true
		}
	}
	return strings.Trim(builder.String(), "-")
}
