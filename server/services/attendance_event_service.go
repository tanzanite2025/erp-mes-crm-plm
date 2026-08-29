package services

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var (
	ErrAttendanceEventInvalid        = errors.New("考勤事件数据无效")
	ErrAttendanceIngressUnauthorized = errors.New("考勤设备入站令牌无效")
	ErrAttendanceMappingNotFound     = errors.New("未找到匹配的系统员工")
)

type AttendanceEventInput struct {
	DeviceID           string                 `json:"deviceId"`
	DeviceCode         string                 `json:"deviceCode"`
	DeviceEmployeeKey  string                 `json:"deviceEmployeeKey"`
	ExternalEventID    string                 `json:"externalEventId"`
	OccurredAt         time.Time              `json:"occurredAt"`
	Direction          string                 `json:"direction"`
	EventType          string                 `json:"eventType"`
	VerificationMethod string                 `json:"verificationMethod"`
	Source             string                 `json:"source"`
	RawPayload         map[string]interface{} `json:"rawPayload"`
}

type AttendanceEventView struct {
	models.AttendanceEvent
	DeviceCode   string `json:"deviceCode"`
	DeviceName   string `json:"deviceName"`
	EmployeeName string `json:"employeeName"`
	StaffID      string `json:"staffId"`
}

type AttendanceEventIngestResult struct {
	Accepted   int                   `json:"accepted"`
	Duplicates int                   `json:"duplicates"`
	Unmatched  int                   `json:"unmatched"`
	Events     []AttendanceEventView `json:"events"`
}

type AttendanceEventListResult struct {
	Items []AttendanceEventView `json:"items"`
	Total int64                 `json:"total"`
}

type AttendanceDeviceStatusInput struct {
	DeviceID   string `json:"deviceId"`
	DeviceCode string `json:"deviceCode"`
	Status     string `json:"status"`
	Message    string `json:"message"`
}

type AttendanceDeviceStatusResult struct {
	DeviceID   string    `json:"deviceId"`
	DeviceCode string    `json:"deviceCode"`
	Status     string    `json:"status"`
	ReportedAt time.Time `json:"reportedAt"`
	Message    string    `json:"message"`
}

type AttendanceDeviceMappingInput struct {
	ID                string `json:"id"`
	DeviceID          string `json:"deviceId"`
	DeviceEmployeeKey string `json:"deviceEmployeeKey"`
	EmployeeID        string `json:"employeeId"`
	MatchField        string `json:"matchField"`
	Source            string `json:"source"`
	Status            string `json:"status"`
	Notes             string `json:"notes"`
}

type AttendanceDeviceMappingView struct {
	models.AttendanceDeviceEmployeeMapping
	DeviceCode   string `json:"deviceCode"`
	DeviceName   string `json:"deviceName"`
	EmployeeName string `json:"employeeName"`
	StaffID      string `json:"staffId"`
}

func IngestAttendanceEvents(deviceID, deviceCode, ingressToken string, inputs []AttendanceEventInput) (*AttendanceEventIngestResult, error) {
	if db.DB == nil {
		return nil, gorm.ErrInvalidDB
	}
	if strings.TrimSpace(deviceID) == "" && len(inputs) > 0 {
		deviceID = strings.TrimSpace(inputs[0].DeviceID)
	}
	if strings.TrimSpace(deviceCode) == "" && len(inputs) > 0 {
		deviceCode = strings.TrimSpace(inputs[0].DeviceCode)
	}

	device, err := findAttendanceDevice(deviceID, deviceCode)
	if err != nil {
		return nil, err
	}
	if !verifyAttendanceIngressToken(device, ingressToken) {
		return nil, ErrAttendanceIngressUnauthorized
	}
	if len(inputs) == 0 || len(inputs) > 1000 {
		return nil, ErrAttendanceEventInvalid
	}

	result := &AttendanceEventIngestResult{Events: make([]AttendanceEventView, 0, len(inputs))}
	for _, input := range inputs {
		event, view, duplicate, err := persistAttendanceEvent(device, input)
		if err != nil {
			return nil, err
		}
		if duplicate {
			result.Duplicates++
			continue
		}
		result.Accepted++
		if event.MatchStatus != "matched" {
			result.Unmatched++
		}
		result.Events = append(result.Events, view)
	}
	if err := markAttendanceDeviceIngested(device.ID, result, inputs); err != nil {
		return nil, err
	}
	return result, nil
}

func ReportAttendanceDeviceStatus(ingressToken string, input AttendanceDeviceStatusInput) (*AttendanceDeviceStatusResult, error) {
	if db.DB == nil {
		return nil, gorm.ErrInvalidDB
	}
	device, err := findAttendanceDevice(input.DeviceID, input.DeviceCode)
	if err != nil {
		return nil, err
	}
	if !verifyAttendanceIngressToken(device, ingressToken) {
		return nil, ErrAttendanceIngressUnauthorized
	}

	status := normalizeAttendanceGatewayStatus(input.Status)
	if status == "" {
		return nil, ErrAttendanceEventInvalid
	}
	message := strings.TrimSpace(input.Message)
	if message == "" {
		message = defaultAttendanceGatewayStatusMessage(status)
	}
	reportedAt := time.Now().UTC()
	if err := recordAttendanceDeviceHealth(device.ID, reportedAt, status, message, 0); err != nil {
		return nil, err
	}

	return &AttendanceDeviceStatusResult{
		DeviceID:   device.ID,
		DeviceCode: device.DeviceCode,
		Status:     status,
		ReportedAt: reportedAt,
		Message:    message,
	}, nil
}

func markAttendanceDeviceIngested(deviceID string, result *AttendanceEventIngestResult, inputs []AttendanceEventInput) error {
	now := time.Now().UTC()
	updates := map[string]interface{}{
		"last_sync_at":         now,
		"last_sync_status":     "success",
		"last_sync_message":    fmt.Sprintf("入站接收 %d 条，新增 %d 条，重复 %d 条，未匹配 %d 条。", len(inputs), result.Accepted, result.Duplicates, result.Unmatched),
		"last_sync_fetched":    len(inputs),
		"last_sync_accepted":   result.Accepted,
		"last_health_check_at": now,
		"last_health_status":   "online",
		"last_health_message":  "已收到考勤设备或 ISUP 网关推送的事件。",
	}
	var latest *time.Time
	for _, input := range inputs {
		if input.OccurredAt.IsZero() {
			continue
		}
		eventTime := input.OccurredAt.UTC()
		if latest == nil || eventTime.After(*latest) {
			latest = &eventTime
		}
	}
	if latest != nil {
		updates["last_event_at"] = latest
	}
	return db.DB.Model(&models.AttendanceDevice{}).Where("id = ?", deviceID).Updates(updates).Error
}

func normalizeAttendanceGatewayStatus(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "registered", "register", "online", "heartbeat", "connected":
		return "online"
	case "offline", "disconnected", "unregistered":
		return "offline"
	case "error", "fault":
		return "error"
	default:
		return ""
	}
}

func defaultAttendanceGatewayStatusMessage(status string) string {
	switch status {
	case "online":
		return "ISUP/EHome 设备已注册或心跳正常。"
	case "offline":
		return "ISUP/EHome 设备已离线或注销。"
	default:
		return "ISUP/EHome 网关上报设备异常。"
	}
}

func ListAttendanceEvents(deviceID, matchStatus string, limit int) (AttendanceEventListResult, error) {
	if db.DB == nil {
		return AttendanceEventListResult{}, gorm.ErrInvalidDB
	}
	if limit <= 0 || limit > 500 {
		limit = 100
	}

	query := db.DB.Model(&models.AttendanceEvent{})
	if strings.TrimSpace(deviceID) != "" {
		query = query.Where("attendance_events.device_id = ?", strings.TrimSpace(deviceID))
	}
	if strings.TrimSpace(matchStatus) != "" {
		query = query.Where("attendance_events.match_status = ?", strings.ToLower(strings.TrimSpace(matchStatus)))
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return AttendanceEventListResult{}, err
	}

	var events []models.AttendanceEvent
	if err := query.Order("attendance_events.occurred_at desc").Limit(limit).Find(&events).Error; err != nil {
		return AttendanceEventListResult{}, err
	}

	items, err := attendanceEventViews(events)
	if err != nil {
		return AttendanceEventListResult{}, err
	}
	return AttendanceEventListResult{Items: items, Total: total}, nil
}

func ListAttendanceDeviceMappings(deviceID string) ([]AttendanceDeviceMappingView, error) {
	if db.DB == nil {
		return nil, gorm.ErrInvalidDB
	}

	query := db.DB.Model(&models.AttendanceDeviceEmployeeMapping{})
	if strings.TrimSpace(deviceID) != "" {
		query = query.Where("device_id = ?", strings.TrimSpace(deviceID))
	}

	var mappings []models.AttendanceDeviceEmployeeMapping
	if err := query.Order("created_at desc").Find(&mappings).Error; err != nil {
		return nil, err
	}
	return attendanceMappingViews(mappings)
}

func SaveAttendanceDeviceMapping(input AttendanceDeviceMappingInput) (*AttendanceDeviceMappingView, error) {
	if db.DB == nil {
		return nil, gorm.ErrInvalidDB
	}
	deviceID := strings.TrimSpace(input.DeviceID)
	employeeID := strings.TrimSpace(input.EmployeeID)
	deviceKey := strings.TrimSpace(input.DeviceEmployeeKey)
	if deviceID == "" || employeeID == "" || deviceKey == "" {
		return nil, ErrAttendanceEventInvalid
	}

	var device models.AttendanceDevice
	if err := db.DB.Where("id = ?", deviceID).Take(&device).Error; err != nil {
		return nil, err
	}
	var employee models.Employee
	if err := db.DB.Where("id = ?", employeeID).Take(&employee).Error; err != nil {
		return nil, err
	}

	var mapping models.AttendanceDeviceEmployeeMapping
	if strings.TrimSpace(input.ID) != "" {
		db.DB.Where("id = ?", strings.TrimSpace(input.ID)).Take(&mapping)
	}
	if mapping.ID == "" {
		err := db.DB.Where("device_id = ? AND device_employee_key = ?", deviceID, deviceKey).Take(&mapping).Error
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
	}

	mapping.DeviceID = deviceID
	mapping.EmployeeID = employeeID
	mapping.DeviceEmployeeKey = deviceKey
	mapping.MatchField = defaultAttendanceMappingField(input.MatchField, device.EmployeeMatchField)
	mapping.Source = defaultAttendanceString(input.Source, "manual")
	mapping.Status = defaultAttendanceString(input.Status, "active")
	mapping.Notes = strings.TrimSpace(input.Notes)
	if mapping.ID == "" {
		mapping.ID = uuid.NewString()
		if err := db.DB.Create(&mapping).Error; err != nil {
			return nil, err
		}
	} else if err := db.DB.Save(&mapping).Error; err != nil {
		return nil, err
	}

	views, err := attendanceMappingViews([]models.AttendanceDeviceEmployeeMapping{mapping})
	if err != nil {
		return nil, err
	}
	return &views[0], nil
}

func DeleteAttendanceDeviceMapping(id string) error {
	if db.DB == nil {
		return gorm.ErrInvalidDB
	}
	result := db.DB.Delete(&models.AttendanceDeviceEmployeeMapping{}, "id = ?", strings.TrimSpace(id))
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func SetAttendanceIngressToken(deviceID, token string) error {
	if db.DB == nil {
		return gorm.ErrInvalidDB
	}
	token = strings.TrimSpace(token)
	if len(token) < 16 {
		return ErrAttendanceEventInvalid
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(token), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	result := db.DB.Model(&models.AttendanceDevice{}).
		Where("id = ?", strings.TrimSpace(deviceID)).
		Update("ingress_token_hash", string(hash))
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func persistAttendanceEvent(device models.AttendanceDevice, input AttendanceEventInput) (models.AttendanceEvent, AttendanceEventView, bool, error) {
	deviceKey := strings.TrimSpace(input.DeviceEmployeeKey)
	if deviceKey == "" || input.OccurredAt.IsZero() {
		return models.AttendanceEvent{}, AttendanceEventView{}, false, ErrAttendanceEventInvalid
	}

	occurredAt := input.OccurredAt.UTC()
	source := defaultAttendanceString(input.Source, device.Protocol)
	eventType := normalizeAttendanceEventType(input.EventType)
	direction := normalizeAttendanceDirection(input.Direction)
	externalID := strings.TrimSpace(input.ExternalEventID)
	fingerprint := attendanceEventFingerprint(device.ID, deviceKey, externalID, occurredAt, direction, eventType)

	var existing models.AttendanceEvent
	if err := db.DB.Where("fingerprint = ?", fingerprint).Take(&existing).Error; err == nil {
		return existing, AttendanceEventView{}, true, nil
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return models.AttendanceEvent{}, AttendanceEventView{}, false, err
	}
	if existing, duplicate, err := findAttendanceEventWindowDuplicate(device, deviceKey, occurredAt, direction, eventType); err != nil {
		return models.AttendanceEvent{}, AttendanceEventView{}, false, err
	} else if duplicate {
		return existing, AttendanceEventView{}, true, nil
	}

	employeeID, matchStatus, matchMessage, err := resolveAttendanceEmployee(device, deviceKey)
	if err != nil {
		return models.AttendanceEvent{}, AttendanceEventView{}, false, err
	}
	rawPayload, _ := json.Marshal(input.RawPayload)
	event := models.AttendanceEvent{
		BaseModel:          models.BaseModel{ID: uuid.NewString()},
		DeviceID:           device.ID,
		EmployeeID:         employeeID,
		DeviceEmployeeKey:  deviceKey,
		ExternalEventID:    externalID,
		OccurredAt:         occurredAt,
		Direction:          direction,
		EventType:          eventType,
		VerificationMethod: strings.TrimSpace(input.VerificationMethod),
		Source:             source,
		Fingerprint:        fingerprint,
		MatchStatus:        matchStatus,
		MatchMessage:       matchMessage,
		RawPayload:         rawPayload,
	}
	if err := db.DB.Create(&event).Error; err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "duplicate") {
			return event, AttendanceEventView{}, true, nil
		}
		return models.AttendanceEvent{}, AttendanceEventView{}, false, err
	}

	view, err := attendanceEventViews([]models.AttendanceEvent{event})
	return event, view[0], false, err
}

func findAttendanceEventWindowDuplicate(device models.AttendanceDevice, deviceKey string, occurredAt time.Time, direction, eventType string) (models.AttendanceEvent, bool, error) {
	if device.DeduplicateWindowSec <= 0 {
		return models.AttendanceEvent{}, false, nil
	}
	window := time.Duration(device.DeduplicateWindowSec) * time.Second
	var existing models.AttendanceEvent
	err := db.DB.Where(
		"device_id = ? AND device_employee_key = ? AND direction = ? AND event_type = ? AND occurred_at >= ? AND occurred_at <= ?",
		device.ID,
		deviceKey,
		direction,
		eventType,
		occurredAt.Add(-window),
		occurredAt.Add(window),
	).Take(&existing).Error
	if err == nil {
		return existing, true, nil
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.AttendanceEvent{}, false, nil
	}
	return models.AttendanceEvent{}, false, err
}

func resolveAttendanceEmployee(device models.AttendanceDevice, deviceKey string) (string, string, string, error) {
	var mapping models.AttendanceDeviceEmployeeMapping
	err := db.DB.Where(
		"device_id = ? AND device_employee_key = ? AND status = ?",
		device.ID,
		deviceKey,
		"active",
	).Take(&mapping).Error
	if err == nil {
		now := time.Now().UTC()
		db.DB.Model(&mapping).Update("last_seen_at", &now)
		return mapping.EmployeeID, "matched", "通过设备员工映射匹配", nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return "", "", "", err
	}

	var employee models.Employee
	column := attendanceEmployeeMatchColumn(device.EmployeeMatchField)
	if column == "" {
		return "", "unmatched", "未配置有效员工匹配字段", nil
	}
	err = db.DB.Where(column+" = ?", deviceKey).Take(&employee).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return "", "unmatched", "设备员工编号未匹配到系统员工", nil
	}
	if err != nil {
		return "", "", "", err
	}
	return employee.ID, "matched", "通过员工主数据字段匹配", nil
}

func attendanceEventViews(events []models.AttendanceEvent) ([]AttendanceEventView, error) {
	if len(events) == 0 {
		return []AttendanceEventView{}, nil
	}
	deviceIDs := make([]string, 0, len(events))
	employeeIDs := make([]string, 0, len(events))
	for _, event := range events {
		deviceIDs = append(deviceIDs, event.DeviceID)
		if event.EmployeeID != "" {
			employeeIDs = append(employeeIDs, event.EmployeeID)
		}
	}

	var devices []models.AttendanceDevice
	if err := db.DB.Where("id IN ?", deviceIDs).Find(&devices).Error; err != nil {
		return nil, err
	}
	deviceByID := make(map[string]models.AttendanceDevice, len(devices))
	for _, device := range devices {
		deviceByID[device.ID] = device
	}
	var employees []models.Employee
	if len(employeeIDs) > 0 {
		if err := db.DB.Where("id IN ?", employeeIDs).Find(&employees).Error; err != nil {
			return nil, err
		}
	}
	employeeByID := make(map[string]models.Employee, len(employees))
	for _, employee := range employees {
		employeeByID[employee.ID] = employee
	}

	items := make([]AttendanceEventView, 0, len(events))
	for _, event := range events {
		device := deviceByID[event.DeviceID]
		employee := employeeByID[event.EmployeeID]
		items = append(items, AttendanceEventView{
			AttendanceEvent: event,
			DeviceCode:      device.DeviceCode,
			DeviceName:      device.Name,
			EmployeeName:    employee.Name,
			StaffID:         employee.StaffID,
		})
	}
	return items, nil
}

func attendanceMappingViews(mappings []models.AttendanceDeviceEmployeeMapping) ([]AttendanceDeviceMappingView, error) {
	if len(mappings) == 0 {
		return []AttendanceDeviceMappingView{}, nil
	}
	deviceIDs := make([]string, 0, len(mappings))
	employeeIDs := make([]string, 0, len(mappings))
	for _, mapping := range mappings {
		deviceIDs = append(deviceIDs, mapping.DeviceID)
		employeeIDs = append(employeeIDs, mapping.EmployeeID)
	}
	var devices []models.AttendanceDevice
	if err := db.DB.Where("id IN ?", deviceIDs).Find(&devices).Error; err != nil {
		return nil, err
	}
	var employees []models.Employee
	if err := db.DB.Where("id IN ?", employeeIDs).Find(&employees).Error; err != nil {
		return nil, err
	}
	deviceByID := make(map[string]models.AttendanceDevice, len(devices))
	for _, device := range devices {
		deviceByID[device.ID] = device
	}
	employeeByID := make(map[string]models.Employee, len(employees))
	for _, employee := range employees {
		employeeByID[employee.ID] = employee
	}
	items := make([]AttendanceDeviceMappingView, 0, len(mappings))
	for _, mapping := range mappings {
		device := deviceByID[mapping.DeviceID]
		employee := employeeByID[mapping.EmployeeID]
		items = append(items, AttendanceDeviceMappingView{
			AttendanceDeviceEmployeeMapping: mapping,
			DeviceCode:                      device.DeviceCode,
			DeviceName:                      device.Name,
			EmployeeName:                    employee.Name,
			StaffID:                         employee.StaffID,
		})
	}
	return items, nil
}

func findAttendanceDevice(deviceID, deviceCode string) (models.AttendanceDevice, error) {
	var device models.AttendanceDevice
	query := db.DB
	if strings.TrimSpace(deviceID) != "" {
		query = query.Where("id = ?", strings.TrimSpace(deviceID))
	} else if strings.TrimSpace(deviceCode) != "" {
		query = query.Where("device_code = ?", strings.TrimSpace(deviceCode))
	} else {
		return device, gorm.ErrRecordNotFound
	}
	if err := query.Take(&device).Error; err != nil {
		return device, err
	}
	return device, nil
}

func verifyAttendanceIngressToken(device models.AttendanceDevice, token string) bool {
	if strings.TrimSpace(token) == "" || strings.TrimSpace(device.IngressTokenHash) == "" {
		return false
	}
	return bcrypt.CompareHashAndPassword([]byte(device.IngressTokenHash), []byte(strings.TrimSpace(token))) == nil
}

func attendanceEventFingerprint(deviceID, deviceKey, externalID string, occurredAt time.Time, direction, eventType string) string {
	seed := strings.Join([]string{
		deviceID,
		strings.TrimSpace(deviceKey),
		strings.TrimSpace(externalID),
		occurredAt.UTC().Format(time.RFC3339Nano),
		normalizeAttendanceDirection(direction),
		normalizeAttendanceEventType(eventType),
	}, "|")
	sum := sha256.Sum256([]byte(seed))
	return hex.EncodeToString(sum[:])
}

func normalizeAttendanceDirection(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "in", "checkin", "check-in", "clock-in", "on":
		return "in"
	case "out", "checkout", "check-out", "clock-out", "off":
		return "out"
	default:
		return "unknown"
	}
}

func normalizeAttendanceEventType(value string) string {
	normalized := strings.ToLower(strings.TrimSpace(value))
	if normalized == "" {
		return "attendance"
	}
	return normalized
}

func attendanceEmployeeMatchColumn(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "staffid", "staff_id":
		return "staff_id"
	case "idcard", "id_card":
		return "id_card"
	case "phone":
		return "phone"
	case "employeeid", "employee_id", "id":
		return "id"
	default:
		return ""
	}
}

func defaultAttendanceString(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return strings.TrimSpace(value)
}

func defaultAttendanceMappingField(value, fallback string) string {
	if strings.TrimSpace(value) != "" {
		return strings.TrimSpace(value)
	}
	if strings.TrimSpace(fallback) != "" {
		return strings.TrimSpace(fallback)
	}
	return "staffId"
}

func FormatAttendanceEventFingerprintForTest(deviceID, deviceKey, externalID string, occurredAt time.Time, direction, eventType string) string {
	return fmt.Sprintf("%s", attendanceEventFingerprint(deviceID, deviceKey, externalID, occurredAt, direction, eventType))
}
