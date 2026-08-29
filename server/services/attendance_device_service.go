package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var (
	ErrAttendanceDeviceRequiredCode      = errors.New("考勤设备编码不能为空")
	ErrAttendanceDeviceRequiredName      = errors.New("考勤设备名称不能为空")
	ErrAttendanceDeviceUnsupportedVendor = errors.New("暂不支持的考勤设备厂商")
	ErrAttendanceDeviceUnsupportedProto  = errors.New("暂不支持的考勤采集协议")
	ErrAttendanceDeviceInvalidEndpoint   = errors.New("考勤设备连接地址无效")
	ErrAttendanceDeviceNotFound          = errors.New("考勤设备不存在")
)

type AttendanceDeviceInput struct {
	ID                     string          `json:"id"`
	DeviceCode             string          `json:"deviceCode"`
	Name                   string          `json:"name"`
	Vendor                 string          `json:"vendor"`
	Model                  string          `json:"model"`
	Protocol               string          `json:"protocol"`
	Endpoint               string          `json:"endpoint"`
	Port                   int             `json:"port"`
	Username               string          `json:"username"`
	Secret                 string          `json:"secret"`
	Location               string          `json:"location"`
	OrgUnitID              string          `json:"orgUnitId"`
	Status                 string          `json:"status"`
	CollectMode            string          `json:"collectMode"`
	PollIntervalSeconds    int             `json:"pollIntervalSeconds"`
	TimeZone               string          `json:"timeZone"`
	EmployeeMatchField     string          `json:"employeeMatchField"`
	DeviceEmployeeKeyField string          `json:"deviceEmployeeKeyField"`
	EventTimeField         string          `json:"eventTimeField"`
	RawEventCodeField      string          `json:"rawEventCodeField"`
	ClockDirectionRule     string          `json:"clockDirectionRule"`
	DeduplicateWindowSec   int             `json:"deduplicateWindowSec"`
	Config                 json.RawMessage `json:"config"`
}

type AttendanceDeviceView struct {
	models.AttendanceDevice
	HasSecret       bool `json:"hasSecret"`
	HasIngressToken bool `json:"hasIngressToken"`
}

type AttendanceDeviceTemplate struct {
	Vendor                 string          `json:"vendor"`
	Label                  string          `json:"label"`
	DefaultModel           string          `json:"defaultModel"`
	Protocol               string          `json:"protocol"`
	CollectMode            string          `json:"collectMode"`
	Port                   int             `json:"port"`
	EmployeeMatchField     string          `json:"employeeMatchField"`
	DeviceEmployeeKeyField string          `json:"deviceEmployeeKeyField"`
	EventTimeField         string          `json:"eventTimeField"`
	RawEventCodeField      string          `json:"rawEventCodeField"`
	ClockDirectionRule     string          `json:"clockDirectionRule"`
	Config                 json.RawMessage `json:"config"`
	Notes                  []string        `json:"notes"`
}

type AttendanceDeviceTestResult struct {
	DeviceID          string    `json:"deviceId"`
	DeviceCode        string    `json:"deviceCode"`
	Status            string    `json:"status"`
	Reachable         bool      `json:"reachable"`
	LatencyMs         int64     `json:"latencyMs"`
	Protocol          string    `json:"protocol"`
	Endpoint          string    `json:"endpoint"`
	CheckedAt         time.Time `json:"checkedAt"`
	Message           string    `json:"message"`
	NextAdapterAction string    `json:"nextAdapterAction"`
}

var supportedAttendanceVendors = map[string]struct{}{
	"generic":         {},
	"hikvision":       {},
	"ivms-4200":       {},
	"dahua":           {},
	"zkteco":          {},
	"welink":          {},
	"feishu":          {},
	"ding-talk":       {},
	"custom-webhook":  {},
	"custom-database": {},
}

var supportedAttendanceProtocols = map[string]struct{}{
	"isapi":             {},
	"isup-ehome":        {},
	"hcnet-sdk":         {},
	"openapi":           {},
	"webhook":           {},
	"csv-import":        {},
	"database-view":     {},
	"middleware-push":   {},
	"manual":            {},
	"custom-http":       {},
	"custom-file-watch": {},
}

func DefaultAttendanceDeviceTemplates() []AttendanceDeviceTemplate {
	return []AttendanceDeviceTemplate{
		{
			Vendor:                 "hikvision",
			Label:                  "Hikvision ISUP/EHome / iVMS-4200",
			DefaultModel:           "DS-K1T / ISUP 5.0 access terminal",
			Protocol:               "isup-ehome",
			CollectMode:            "push",
			Port:                   7660,
			EmployeeMatchField:     "staffId",
			DeviceEmployeeKeyField: "employeeNo",
			EventTimeField:         "time",
			RawEventCodeField:      "eventType",
			ClockDirectionRule:     "auto",
			Config: json.RawMessage(`{
				"adapter": "hikvision-isup-ehome",
				"protocolVersion": "5.0",
				"registrationPort": 7660,
				"alarmTcpPort": 7332,
				"alarmUdpPort": 7334,
				"deviceIdField": "deviceCode",
				"secretField": "isupKey",
				"ingressEndpoint": "/api/v1/attendance-events/ingest",
				"ivms4200Role": "Configure ISUP/EHome platform access in iVMS-4200 or on the terminal. The terminal registers to the ERP-side ISUP gateway, which forwards attendance events to ERP.",
				"timeFormat": "device-local-rfc3339",
				"fieldMapping": {
					"employeeNo": "employeeNo",
					"time": "time",
					"eventType": "eventType"
				}
			}`),
			Notes: []string{
				"ISUP/EHome 使用设备主动注册方式，适合 ERP 无法直接访问现场设备的网络。",
				"设备侧填写 ERP/网关地址、注册端口 7660、设备编码和 ISUP Key。",
				"ERP 侧部署 ISUP/EHome 网关或海康平台出口，再把事件推送到统一考勤入站接口。",
			},
		},
		{
			Vendor:                 "zkteco",
			Label:                  "ZKTeco / Generic biometric terminal",
			DefaultModel:           "Standalone attendance terminal",
			Protocol:               "middleware-push",
			CollectMode:            "push",
			Port:                   4370,
			EmployeeMatchField:     "staffId",
			DeviceEmployeeKeyField: "pin",
			EventTimeField:         "punchTime",
			RawEventCodeField:      "verifyMode",
			ClockDirectionRule:     "auto",
			Config:                 json.RawMessage(`{"adapter":"zkteco-middleware","cursorField":"lastPunchTime"}`),
			Notes: []string{
				"可通过厂商 SDK 或本地中间件把打卡流水推入 ERP。",
				"设备 PIN 建议与员工工号保持一致，减少后续映射维护。",
			},
		},
		{
			Vendor:                 "custom-webhook",
			Label:                  "Custom webhook attendance gateway",
			DefaultModel:           "HTTP webhook gateway",
			Protocol:               "webhook",
			CollectMode:            "push",
			Port:                   443,
			EmployeeMatchField:     "staffId",
			DeviceEmployeeKeyField: "employeeCode",
			EventTimeField:         "eventTime",
			RawEventCodeField:      "eventCode",
			ClockDirectionRule:     "payload",
			Config:                 json.RawMessage(`{"adapter":"custom-webhook","signatureHeader":"X-Attendance-Signature"}`),
			Notes: []string{
				"适合后续接企业微信、飞书、钉钉或自建门禁平台。",
				"以统一 JSON 事件格式推送到 ERP，便于多品牌并存。",
			},
		},
	}
}

func NormalizeAttendanceDeviceInput(input AttendanceDeviceInput, existing *models.AttendanceDevice) (models.AttendanceDevice, error) {
	device := models.AttendanceDevice{}
	if existing != nil {
		device = *existing
	}

	device.DeviceCode = normalizeDeviceToken(input.DeviceCode)
	if device.DeviceCode == "" {
		return device, ErrAttendanceDeviceRequiredCode
	}

	device.Name = strings.TrimSpace(input.Name)
	if device.Name == "" {
		return device, ErrAttendanceDeviceRequiredName
	}

	device.Vendor = normalizeEnum(input.Vendor, "generic")
	if _, ok := supportedAttendanceVendors[device.Vendor]; !ok {
		return device, ErrAttendanceDeviceUnsupportedVendor
	}

	device.Protocol = normalizeEnum(input.Protocol, "manual")
	if _, ok := supportedAttendanceProtocols[device.Protocol]; !ok {
		return device, ErrAttendanceDeviceUnsupportedProto
	}

	device.Endpoint = strings.TrimSpace(input.Endpoint)
	if err := validateAttendanceEndpoint(device.Endpoint, device.Protocol); err != nil {
		return device, err
	}

	device.Model = strings.TrimSpace(input.Model)
	device.Port = normalizePort(input.Port, device.Protocol)
	device.Username = strings.TrimSpace(input.Username)
	if strings.TrimSpace(input.Secret) != "" {
		device.SecretValue = strings.TrimSpace(input.Secret)
	}
	device.Location = strings.TrimSpace(input.Location)
	device.OrgUnitID = strings.TrimSpace(input.OrgUnitID)
	device.Status = normalizeAttendanceStatus(input.Status)
	device.CollectMode = normalizeCollectMode(input.CollectMode)
	device.PollIntervalSeconds = normalizeMinInt(input.PollIntervalSeconds, 300, 30)
	device.TimeZone = strings.TrimSpace(input.TimeZone)
	if device.TimeZone == "" {
		device.TimeZone = "Asia/Shanghai"
	}
	device.EmployeeMatchField = normalizeEnum(input.EmployeeMatchField, "staffId")
	device.DeviceEmployeeKeyField = normalizeEnum(input.DeviceEmployeeKeyField, "employeeNo")
	device.EventTimeField = normalizeEnum(input.EventTimeField, "time")
	device.RawEventCodeField = normalizeEnum(input.RawEventCodeField, "eventType")
	device.ClockDirectionRule = normalizeEnum(input.ClockDirectionRule, "auto")
	device.DeduplicateWindowSec = normalizeMinInt(input.DeduplicateWindowSec, 60, 0)
	device.Config = normalizeJSONRaw(input.Config)
	if device.Version == 0 {
		device.Version = 1
	}

	return device, nil
}

func ListAttendanceDevices() ([]AttendanceDeviceView, error) {
	if db.DB == nil {
		return nil, gorm.ErrInvalidDB
	}

	var devices []models.AttendanceDevice
	if err := db.DB.Order("created_at desc").Find(&devices).Error; err != nil {
		return nil, err
	}

	result := make([]AttendanceDeviceView, 0, len(devices))
	for _, device := range devices {
		result = append(result, toAttendanceDeviceView(device))
	}
	return result, nil
}

func SaveAttendanceDevice(input AttendanceDeviceInput) (*AttendanceDeviceView, error) {
	if db.DB == nil {
		return nil, gorm.ErrInvalidDB
	}

	normalizedCode := normalizeDeviceToken(input.DeviceCode)
	var existing models.AttendanceDevice
	err := gorm.ErrRecordNotFound
	if strings.TrimSpace(input.ID) != "" {
		err = db.DB.Where("id = ?", strings.TrimSpace(input.ID)).Take(&existing).Error
	}
	if errors.Is(err, gorm.ErrRecordNotFound) && normalizedCode != "" {
		err = db.DB.Where("device_code = ?", normalizedCode).Take(&existing).Error
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	var existingPtr *models.AttendanceDevice
	if err == nil {
		existingPtr = &existing
	}

	device, err := NormalizeAttendanceDeviceInput(input, existingPtr)
	if err != nil {
		return nil, err
	}

	if existingPtr == nil {
		device.BaseModel = models.BaseModel{ID: uuid.NewString()}
		if createErr := createAttendanceDeviceWithEncryptedSecret(db.DB, device); createErr != nil {
			return nil, createErr
		}
		return ptr(toAttendanceDeviceView(device)), nil
	}

	device.Version = existing.Version + 1
	if saveErr := saveAttendanceDeviceWithEncryptedSecret(db.DB, device); saveErr != nil {
		return nil, saveErr
	}
	return ptr(toAttendanceDeviceView(device)), nil
}

func DeleteAttendanceDevice(id string) error {
	if db.DB == nil {
		return gorm.ErrInvalidDB
	}
	normalizedID := strings.TrimSpace(id)
	if normalizedID == "" {
		return ErrAttendanceDeviceNotFound
	}
	result := db.DB.Delete(&models.AttendanceDevice{}, "id = ?", normalizedID)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrAttendanceDeviceNotFound
	}
	return nil
}

func TestAttendanceDevice(id string) (*AttendanceDeviceTestResult, error) {
	if db.DB == nil {
		return nil, gorm.ErrInvalidDB
	}

	var device models.AttendanceDevice
	if err := db.DB.Where("id = ?", strings.TrimSpace(id)).Take(&device).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAttendanceDeviceNotFound
		}
		return nil, err
	}

	now := time.Now().UTC()
	status := "ready"
	message := "设备绑定配置可用于后端适配器执行采集。"
	reachable := false
	recordHealth := true
	var latencyMs int64
	if strings.TrimSpace(device.Endpoint) == "" && device.Protocol != "manual" && device.Protocol != "csv-import" {
		status = "needs_endpoint"
		message = "设备已登记，但还缺少连接地址；请补齐 endpoint 后再启用采集。"
	} else if device.Protocol == "isup-ehome" && strings.TrimSpace(device.Username) == "" {
		status = "needs_device_id"
		message = "ISUP/EHome 尚未配置设备注册 ID。"
	} else if strings.TrimSpace(device.SecretValue) == "" && requiresAttendanceSecret(device.Protocol) {
		status = "needs_secret"
		message = "设备连接信息已保存，但还缺少访问凭据。"
	} else if device.Protocol == "isapi" && isHikvisionDevice(device) {
		probeStartedAt := time.Now()
		if err := probeHikvisionDevice(device); err != nil {
			status = "offline"
			message = "海康设备连接失败：" + err.Error()
		} else {
			status = "online"
			reachable = true
			message = "海康设备已连通，ISAPI 接口可访问。"
		}
		latencyMs = time.Since(probeStartedAt).Milliseconds()
	} else if device.Protocol == "isup-ehome" && isHikvisionDevice(device) {
		status = "waiting_registration"
		message = "ISUP/EHome 配置预检通过，但尚未完成真实设备联调；请在设备侧填写网关地址、注册端口、设备注册 ID 和 ISUP Key，并验证注册、SessionKey、刷卡/刷脸、断线重连及重复事件。"
		// This precheck validates configuration only. It cannot prove that a
		// real terminal has registered, authenticated, negotiated SessionKey, or
		// emitted an ACS event; those require现场设备联调.
		recordHealth = false
	} else if device.Protocol != "manual" && device.Protocol != "csv-import" {
		status = "adapter_pending"
		message = "配置完整；当前协议已登记，但尚未实现专用连通性探测。"
	}

	if recordHealth {
		if err := recordAttendanceDeviceHealth(device.ID, now, status, message, latencyMs); err != nil {
			return nil, err
		}
	}

	return &AttendanceDeviceTestResult{
		DeviceID:          device.ID,
		DeviceCode:        device.DeviceCode,
		Status:            status,
		Reachable:         reachable,
		LatencyMs:         latencyMs,
		Protocol:          device.Protocol,
		Endpoint:          device.Endpoint,
		CheckedAt:         now,
		Message:           message,
		NextAdapterAction: nextAttendanceAdapterAction(device),
	}, nil
}

func probeHikvisionDevice(device models.AttendanceDevice) error {
	config := parseHikvisionAdapterConfig(device.Config)
	resource := strings.TrimSpace(config.HealthResource)
	if resource == "" {
		resource = "/ISAPI/System/deviceInfo"
	}

	client := &digestHTTPClient{
		client:   &http.Client{Timeout: 10 * time.Second},
		username: strings.TrimSpace(device.Username),
		password: strings.TrimSpace(device.SecretValue),
	}
	_, _, err := client.doWithContentType(
		http.MethodGet,
		buildAttendanceEndpoint(device, resource),
		nil,
		"application/xml",
	)
	return err
}

func recordAttendanceDeviceHealth(deviceID string, checkedAt time.Time, status, message string, latencyMs int64) error {
	return db.DB.Model(&models.AttendanceDevice{}).
		Where("id = ?", deviceID).
		Updates(map[string]interface{}{
			"last_health_check_at":   checkedAt,
			"last_health_status":     status,
			"last_health_message":    message,
			"last_health_latency_ms": latencyMs,
		}).Error
}

func normalizeDeviceToken(value string) string {
	upper := strings.ToUpper(strings.TrimSpace(value))
	builder := strings.Builder{}
	lastDash := false
	for _, r := range upper {
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

func normalizeEnum(value string, fallback string) string {
	normalized := strings.ToLower(strings.TrimSpace(value))
	if normalized == "" {
		return fallback
	}
	return normalized
}

func normalizePort(port int, protocol string) int {
	if port > 0 && port <= 65535 {
		return port
	}
	switch protocol {
	case "isapi", "custom-http":
		return 80
	case "isup-ehome":
		return 7660
	case "openapi", "webhook", "middleware-push":
		return 443
	case "hcnet-sdk":
		return 8000
	default:
		return 0
	}
}

func normalizeAttendanceStatus(value string) string {
	switch normalizeEnum(value, "active") {
	case "active", "paused", "offline", "maintenance":
		return normalizeEnum(value, "active")
	default:
		return "active"
	}
}

func normalizeCollectMode(value string) string {
	switch normalizeEnum(value, "pull") {
	case "pull", "push", "manual", "file":
		return normalizeEnum(value, "pull")
	default:
		return "pull"
	}
}

func normalizeMinInt(value int, fallback int, min int) int {
	if value >= min {
		return value
	}
	return fallback
}

func normalizeJSONRaw(raw json.RawMessage) json.RawMessage {
	if len(raw) == 0 || !json.Valid(raw) {
		return json.RawMessage(`{}`)
	}
	compact := make(map[string]any)
	if err := json.Unmarshal(raw, &compact); err != nil {
		return json.RawMessage(`{}`)
	}
	encoded, err := json.Marshal(compact)
	if err != nil {
		return json.RawMessage(`{}`)
	}
	return encoded
}

func validateAttendanceEndpoint(endpoint string, protocol string) error {
	trimmed := strings.TrimSpace(endpoint)
	if trimmed == "" {
		return nil
	}
	if strings.ContainsAny(trimmed, "\r\n\t") {
		return ErrAttendanceDeviceInvalidEndpoint
	}
	if protocol == "isapi" || protocol == "openapi" || protocol == "webhook" || protocol == "custom-http" || protocol == "middleware-push" {
		parsed, err := url.Parse(trimmed)
		if err != nil || parsed.Scheme == "" || parsed.Host == "" {
			return ErrAttendanceDeviceInvalidEndpoint
		}
	}
	return nil
}

func toAttendanceDeviceView(device models.AttendanceDevice) AttendanceDeviceView {
	hasSecret := strings.TrimSpace(device.SecretValue) != ""
	hasIngressToken := strings.TrimSpace(device.IngressTokenHash) != ""
	device.SecretValue = ""
	device.IngressTokenHash = ""
	return AttendanceDeviceView{
		AttendanceDevice: device,
		HasSecret:        hasSecret,
		HasIngressToken:  hasIngressToken,
	}
}

func ptr[T any](value T) *T {
	return &value
}

func requiresAttendanceSecret(protocol string) bool {
	switch protocol {
	case "isapi", "isup-ehome", "hcnet-sdk", "openapi", "webhook", "custom-http", "middleware-push":
		return true
	default:
		return false
	}
}

func nextAttendanceAdapterAction(device models.AttendanceDevice) string {
	switch device.Protocol {
	case "isapi":
		return fmt.Sprintf("调用 %s 的 ISAPI 事件查询接口，按 %s 游标拉取打卡事件。", strings.TrimRight(device.Endpoint, "/"), device.EventTimeField)
	case "isup-ehome":
		return fmt.Sprintf("设备通过 ISUP/EHome 主动注册到 %s:%d；ERP 侧 ISUP 网关接收注册和事件后，推送到统一考勤入站接口。", strings.TrimRight(device.Endpoint, "/"), device.Port)
	case "hcnet-sdk":
		return "由后端采集服务加载 HCNetSDK 适配器，使用设备 IP、端口和凭据拉取考勤事件。"
	case "openapi":
		return "通过平台 OpenAPI 拉取考勤流水，再按设备工号字段映射到员工档案。"
	case "webhook", "middleware-push":
		return "等待网关或中间件推送统一考勤事件 JSON 到 ERP 入站接口。"
	case "csv-import", "database-view":
		return "按配置读取文件或数据库视图，并执行员工匹配、去重和方向判定。"
	default:
		return "该设备暂作为人工/占位配置保存，后续可补充专用适配器。"
	}
}

func AttendanceDeviceTemplateVendors() []string {
	templates := DefaultAttendanceDeviceTemplates()
	vendors := make([]string, 0, len(templates))
	for _, template := range templates {
		vendors = append(vendors, template.Vendor)
	}
	sort.Strings(vendors)
	return vendors
}
