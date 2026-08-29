package services

import (
	"bytes"
	"crypto/md5"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

const (
	defaultHikvisionEventResource = "/ISAPI/AccessControl/AcsEvent"
	maxHikvisionSyncPages         = 10
	defaultHikvisionPageSize      = 100
	defaultHikvisionLookbackHours = 24
)

var (
	ErrAttendanceAdapterUnsupported = errors.New("当前考勤设备暂无可执行的采集适配器")
	ErrAttendanceAdapterEndpoint    = errors.New("海康考勤设备地址配置无效")
	ErrAttendanceAdapterCredentials = errors.New("海康考勤设备账号或密码未配置")
)

type AttendanceSyncResult struct {
	DeviceID   string    `json:"deviceId"`
	DeviceCode string    `json:"deviceCode"`
	Status     string    `json:"status"`
	Fetched    int       `json:"fetched"`
	Accepted   int       `json:"accepted"`
	Duplicates int       `json:"duplicates"`
	Unmatched  int       `json:"unmatched"`
	StartedAt  time.Time `json:"startedAt"`
	FinishedAt time.Time `json:"finishedAt"`
	Message    string    `json:"message"`
	Adapter    string    `json:"adapter"`
}

type hikvisionAdapterConfig struct {
	EventResource  string            `json:"eventResource"`
	HealthResource string            `json:"healthResource"`
	PageSize       int               `json:"pageSize"`
	LookbackHours  int               `json:"lookbackHours"`
	RequestFormat  string            `json:"requestFormat"`
	DirectionField string            `json:"directionField"`
	DirectionMap   map[string]string `json:"directionMap"`
}

type hikvisionSearchRequest struct {
	AcsEventCond hikvisionEventCondition `json:"AcsEventCond"`
}

type hikvisionEventCondition struct {
	SearchID             string `json:"searchID"`
	SearchResultPosition int    `json:"searchResultPosition"`
	MaxResults           int    `json:"maxResults"`
	StartTime            string `json:"startTime"`
	EndTime              string `json:"endTime"`
}

type hikvisionSearchResponse struct {
	AcsEvent struct {
		NumOfMatches   int              `json:"numOfMatches"`
		TotalMatches   int              `json:"totalMatches"`
		ResponseStatus string           `json:"responseStatusStrg"`
		InfoList       []hikvisionEvent `json:"InfoList"`
	} `json:"AcsEvent"`
}

type hikvisionEvent struct {
	Major            int    `json:"major"`
	Minor            int    `json:"minor"`
	Time             string `json:"time"`
	EmployeeNoString string `json:"employeeNoString"`
	EmployeeNo       string `json:"employeeNo"`
	EventID          string `json:"eventId"`
	SerialNo         string `json:"serialNo"`
	CardNo           string `json:"cardNo"`
	Name             string `json:"name"`
	VerifyMode       string `json:"currentVerifyMode"`
	VerifyModeAlt    string `json:"verifyMode"`
	EventDescription string `json:"eventDescription"`
	Direction        string `json:"direction"`
	InOut            string `json:"inOut"`
}

type hikvisionXMLResponse struct {
	XMLName        xml.Name            `xml:"AcsEvent"`
	NumOfMatches   int                 `xml:"numOfMatches"`
	TotalMatches   int                 `xml:"totalMatches"`
	ResponseStatus string              `xml:"responseStatusStrg"`
	EventList      []hikvisionXMLEvent `xml:"InfoList>Event"`
	InfoList       []hikvisionXMLEvent `xml:"InfoList>Info"`
}

type hikvisionXMLEvent struct {
	Major            int    `xml:"major"`
	Minor            int    `xml:"minor"`
	Time             string `xml:"time"`
	EmployeeNoString string `xml:"employeeNoString"`
	EmployeeNo       string `xml:"employeeNo"`
	EventID          string `xml:"eventId"`
	SerialNo         string `xml:"serialNo"`
	CardNo           string `xml:"cardNo"`
	Name             string `xml:"name"`
	VerifyMode       string `xml:"currentVerifyMode"`
	VerifyModeAlt    string `xml:"verifyMode"`
	EventDescription string `xml:"eventDescription"`
	Direction        string `xml:"direction"`
	InOut            string `xml:"inOut"`
}

type digestChallenge struct {
	Realm     string
	Nonce     string
	QOP       string
	Opaque    string
	Algorithm string
}

type digestHTTPClient struct {
	client   *http.Client
	username string
	password string
}

func SyncAttendanceDevice(id string) (*AttendanceSyncResult, error) {
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

	startedAt := time.Now().UTC()
	result := &AttendanceSyncResult{
		DeviceID:   device.ID,
		DeviceCode: device.DeviceCode,
		Status:     "running",
		StartedAt:  startedAt,
		Adapter:    "hikvision-isapi",
	}

	if device.Protocol != "isapi" || !isHikvisionDevice(device) {
		return finishAttendanceSync(device, result, ErrAttendanceAdapterUnsupported)
	}

	events, err := fetchHikvisionAttendanceEvents(device, startedAt)
	result.Fetched = len(events)
	if err != nil {
		return finishAttendanceSync(device, result, err)
	}

	var latestEventAt *time.Time
	for _, input := range events {
		event, _, duplicate, persistErr := persistAttendanceEvent(device, input)
		if persistErr != nil {
			return finishAttendanceSync(device, result, persistErr)
		}
		if duplicate {
			result.Duplicates++
		} else {
			result.Accepted++
			if event.MatchStatus != "matched" {
				result.Unmatched++
			}
		}
		if latestEventAt == nil || event.OccurredAt.After(*latestEventAt) {
			eventTime := event.OccurredAt
			latestEventAt = &eventTime
		}
	}

	if latestEventAt == nil && device.LastEventAt != nil {
		latestEventAt = device.LastEventAt
	}
	result.Status = "success"
	result.Message = fmt.Sprintf(
		"ISAPI 同步完成：读取 %d 条，新增 %d 条，重复 %d 条，未匹配 %d 条。",
		result.Fetched,
		result.Accepted,
		result.Duplicates,
		result.Unmatched,
	)
	result.FinishedAt = time.Now().UTC()
	if err := updateAttendanceDeviceSyncState(device.ID, result, latestEventAt); err != nil {
		return nil, err
	}
	return result, nil
}

func SyncDueAttendanceDevices() (int, error) {
	if db.DB == nil {
		return 0, gorm.ErrInvalidDB
	}
	var devices []models.AttendanceDevice
	if err := db.DB.Where("status = ? AND collect_mode = ? AND protocol = ?", "active", "pull", "isapi").
		Order("created_at asc").
		Find(&devices).Error; err != nil {
		return 0, err
	}

	synced := 0
	now := time.Now().UTC()
	for _, device := range devices {
		if device.LastSyncAt != nil && now.Sub(*device.LastSyncAt) < time.Duration(device.PollIntervalSeconds)*time.Second {
			continue
		}
		if _, err := SyncAttendanceDevice(device.ID); err != nil {
			synced++
			continue
		}
		synced++
	}
	return synced, nil
}

func fetchHikvisionAttendanceEvents(device models.AttendanceDevice, endAt time.Time) ([]AttendanceEventInput, error) {
	config := parseHikvisionAdapterConfig(device.Config)
	resource := config.EventResource
	if resource == "" {
		resource = defaultHikvisionEventResource
	}
	pageSize := config.PageSize
	if pageSize <= 0 || pageSize > defaultHikvisionPageSize {
		pageSize = defaultHikvisionPageSize
	}
	startAt := endAt.Add(-time.Duration(defaultHikvisionLookbackHours) * time.Hour)
	if device.LastEventAt != nil {
		startAt = device.LastEventAt.Add(-time.Duration(maxAttendanceInt(device.DeduplicateWindowSec, 60)) * time.Second)
	}
	if startAt.After(endAt) {
		startAt = endAt.Add(-time.Hour)
	}

	client := &digestHTTPClient{
		client:   &http.Client{Timeout: 25 * time.Second},
		username: strings.TrimSpace(device.Username),
		password: strings.TrimSpace(device.SecretValue),
	}
	if client.username == "" || client.password == "" {
		return nil, ErrAttendanceAdapterCredentials
	}

	allEvents := make([]AttendanceEventInput, 0)
	for page := 0; page < maxHikvisionSyncPages; page++ {
		requestBody := hikvisionSearchRequest{
			AcsEventCond: hikvisionEventCondition{
				SearchID:             uuidSearchID(device.ID, endAt),
				SearchResultPosition: page * pageSize,
				MaxResults:           pageSize,
				StartTime:            startAt.Format(time.RFC3339),
				EndTime:              endAt.Format(time.RFC3339),
			},
		}
		body, contentType, err := buildHikvisionSearchBody(requestBody, config.RequestFormat)
		if err != nil {
			return nil, err
		}
		responseBody, responseContentType, err := client.doWithContentType(http.MethodPost, buildAttendanceEndpoint(device, resource), body, contentType)
		if err != nil {
			return nil, err
		}
		events, total, err := parseHikvisionEvents(responseBody, responseContentType, device, config)
		if err != nil {
			return nil, err
		}
		allEvents = append(allEvents, events...)
		if len(events) < pageSize || len(allEvents) >= total || total == 0 {
			break
		}
	}
	return allEvents, nil
}

func buildHikvisionSearchBody(request hikvisionSearchRequest, requestFormat string) ([]byte, string, error) {
	if strings.EqualFold(strings.TrimSpace(requestFormat), "json") {
		body, err := json.Marshal(request)
		return body, "application/json", err
	}
	type xmlCondition struct {
		XMLName              xml.Name `xml:"AcsEventCond"`
		SearchID             string   `xml:"searchID"`
		SearchResultPosition int      `xml:"searchResultPosition"`
		MaxResults           int      `xml:"maxResults"`
		StartTime            string   `xml:"startTime"`
		EndTime              string   `xml:"endTime"`
	}
	body, err := xml.Marshal(xmlCondition{
		SearchID:             request.AcsEventCond.SearchID,
		SearchResultPosition: request.AcsEventCond.SearchResultPosition,
		MaxResults:           request.AcsEventCond.MaxResults,
		StartTime:            request.AcsEventCond.StartTime,
		EndTime:              request.AcsEventCond.EndTime,
	})
	return body, "application/xml", err
}

func parseHikvisionAdapterConfig(raw json.RawMessage) hikvisionAdapterConfig {
	config := hikvisionAdapterConfig{}
	if len(raw) > 0 {
		_ = json.Unmarshal(raw, &config)
	}
	return config
}

func parseHikvisionEvents(body []byte, contentType string, device models.AttendanceDevice, config hikvisionAdapterConfig) ([]AttendanceEventInput, int, error) {
	body = bytes.TrimSpace(body)
	if len(body) == 0 {
		return nil, 0, errors.New("海康 ISAPI 返回空响应")
	}
	if strings.Contains(strings.ToLower(contentType), "json") || body[0] == '{' {
		var response hikvisionSearchResponse
		if err := json.Unmarshal(body, &response); err == nil {
			items := make([]AttendanceEventInput, 0, len(response.AcsEvent.InfoList))
			for _, event := range response.AcsEvent.InfoList {
				input, ok := normalizeHikvisionEvent(event, device, config)
				if ok {
					items = append(items, input)
				}
			}
			total := response.AcsEvent.TotalMatches
			if total == 0 {
				total = response.AcsEvent.NumOfMatches
			}
			return items, total, nil
		}
	}

	var response hikvisionXMLResponse
	if err := xml.Unmarshal(body, &response); err != nil {
		return nil, 0, fmt.Errorf("解析海康 ISAPI 响应失败: %w", err)
	}
	xmlEvents := append(response.EventList, response.InfoList...)
	items := make([]AttendanceEventInput, 0, len(xmlEvents))
	for _, event := range xmlEvents {
		input, ok := normalizeHikvisionXMLEvent(event, device, config)
		if ok {
			items = append(items, input)
		}
	}
	total := response.TotalMatches
	if total == 0 {
		total = response.NumOfMatches
	}
	return items, total, nil
}

func normalizeHikvisionEvent(event hikvisionEvent, device models.AttendanceDevice, config hikvisionAdapterConfig) (AttendanceEventInput, bool) {
	return normalizeHikvisionFields(
		event.Time,
		firstAttendanceNonEmpty(event.EmployeeNoString, event.EmployeeNo, event.CardNo),
		firstAttendanceNonEmpty(event.EventID, event.SerialNo),
		event.Major,
		event.Minor,
		firstAttendanceNonEmpty(event.VerifyMode, event.VerifyModeAlt),
		firstAttendanceNonEmpty(event.Direction, event.InOut),
		event.EventDescription,
		device,
		config,
	)
}

func normalizeHikvisionXMLEvent(event hikvisionXMLEvent, device models.AttendanceDevice, config hikvisionAdapterConfig) (AttendanceEventInput, bool) {
	return normalizeHikvisionFields(
		event.Time,
		firstAttendanceNonEmpty(event.EmployeeNoString, event.EmployeeNo, event.CardNo),
		firstAttendanceNonEmpty(event.EventID, event.SerialNo),
		event.Major,
		event.Minor,
		firstAttendanceNonEmpty(event.VerifyMode, event.VerifyModeAlt),
		firstAttendanceNonEmpty(event.Direction, event.InOut),
		event.EventDescription,
		device,
		config,
	)
}

func normalizeHikvisionFields(eventTime, employeeKey, externalID string, major, minor int, verificationMethod, rawDirection, description string, device models.AttendanceDevice, config hikvisionAdapterConfig) (AttendanceEventInput, bool) {
	employeeKey = strings.TrimSpace(employeeKey)
	occurredAt, err := parseAttendanceDeviceTime(eventTime, device.TimeZone)
	if err != nil || employeeKey == "" {
		return AttendanceEventInput{}, false
	}
	eventCode := fmt.Sprintf("%d/%d", major, minor)
	direction := resolveHikvisionDirection(rawDirection, eventCode, config)
	rawPayload := map[string]interface{}{
		"major":            major,
		"minor":            minor,
		"eventTime":        eventTime,
		"eventDescription": description,
		"employeeNo":       employeeKey,
		"externalEventId":  externalID,
		"direction":        rawDirection,
	}
	return AttendanceEventInput{
		DeviceID:           device.ID,
		DeviceEmployeeKey:  employeeKey,
		ExternalEventID:    externalID,
		OccurredAt:         occurredAt,
		Direction:          direction,
		EventType:          eventCode,
		VerificationMethod: verificationMethod,
		Source:             "hikvision-isapi",
		RawPayload:         rawPayload,
	}, true
}

func parseAttendanceDeviceTime(value, zone string) (time.Time, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return time.Time{}, errors.New("考勤事件时间为空")
	}
	if parsed, err := time.Parse(time.RFC3339, value); err == nil {
		return parsed.UTC(), nil
	}
	location, err := time.LoadLocation(strings.TrimSpace(zone))
	if err != nil {
		location = time.Local
	}
	for _, layout := range []string{"2006-01-02T15:04:05", "2006-01-02 15:04:05"} {
		if parsed, parseErr := time.ParseInLocation(layout, value, location); parseErr == nil {
			return parsed.UTC(), nil
		}
	}
	return time.Time{}, fmt.Errorf("无法解析考勤事件时间 %q", value)
}

func resolveHikvisionDirection(raw, eventCode string, config hikvisionAdapterConfig) string {
	if mapped := strings.TrimSpace(config.DirectionMap[eventCode]); mapped != "" {
		return normalizeAttendanceDirection(mapped)
	}
	if mapped := strings.TrimSpace(config.DirectionMap[strings.ToLower(strings.TrimSpace(raw))]); mapped != "" {
		return normalizeAttendanceDirection(mapped)
	}
	return normalizeAttendanceDirection(raw)
}

func buildAttendanceEndpoint(device models.AttendanceDevice, resource string) string {
	base := strings.TrimRight(strings.TrimSpace(device.Endpoint), "/")
	if base == "" {
		return ""
	}
	parsed, err := url.Parse(base)
	if err == nil && parsed.Port() == "" && device.Port > 0 {
		parsed.Host = net.JoinHostPort(parsed.Hostname(), strconv.Itoa(device.Port))
		base = strings.TrimRight(parsed.String(), "/")
	}
	if strings.HasPrefix(resource, "/") {
		return base + resource
	}
	return base + "/" + resource
}

func updateAttendanceDeviceSyncState(deviceID string, result *AttendanceSyncResult, latestEventAt *time.Time) error {
	updates := map[string]interface{}{
		"last_sync_at":       result.FinishedAt,
		"last_sync_status":   result.Status,
		"last_sync_message":  result.Message,
		"last_sync_fetched":  result.Fetched,
		"last_sync_accepted": result.Accepted,
	}
	if latestEventAt != nil {
		updates["last_event_at"] = latestEventAt
	}
	return db.DB.Model(&models.AttendanceDevice{}).Where("id = ?", deviceID).Updates(updates).Error
}

func finishAttendanceSync(device models.AttendanceDevice, result *AttendanceSyncResult, syncErr error) (*AttendanceSyncResult, error) {
	result.Status = "error"
	result.FinishedAt = time.Now().UTC()
	result.Message = syncErr.Error()
	if errors.Is(syncErr, ErrAttendanceAdapterCredentials) {
		result.Status = "needs_secret"
	}
	if errors.Is(syncErr, ErrAttendanceAdapterEndpoint) {
		result.Status = "needs_endpoint"
	}
	if err := updateAttendanceDeviceSyncState(device.ID, result, device.LastEventAt); err != nil {
		return nil, err
	}
	return result, syncErr
}

func isHikvisionDevice(device models.AttendanceDevice) bool {
	return device.Vendor == "hikvision" || device.Vendor == "ivms-4200" || device.Vendor == "generic"
}

func uuidSearchID(deviceID string, at time.Time) string {
	value := strings.ReplaceAll(deviceID+at.Format(time.RFC3339Nano), "-", "")
	if len(value) >= 32 {
		return value[:32]
	}
	return value
}

func firstAttendanceNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func maxAttendanceInt(value, fallback int) int {
	if value > fallback {
		return value
	}
	return fallback
}

func (c *digestHTTPClient) do(method, target string, body []byte) ([]byte, string, error) {
	return c.doWithContentType(method, target, body, "application/json")
}

func (c *digestHTTPClient) doWithContentType(method, target string, body []byte, contentType string) ([]byte, string, error) {
	if strings.TrimSpace(target) == "" {
		return nil, "", ErrAttendanceAdapterEndpoint
	}
	request, err := http.NewRequest(method, target, bytes.NewReader(body))
	if err != nil {
		return nil, "", ErrAttendanceAdapterEndpoint
	}
	request.Header.Set("Content-Type", contentType)
	request.Header.Set("Accept", "application/json, application/xml")
	response, err := c.client.Do(request)
	if err != nil {
		return nil, "", err
	}
	if response.StatusCode != http.StatusUnauthorized {
		return readDigestResponse(response)
	}

	challenge := parseDigestChallenge(response.Header.Get("WWW-Authenticate"))
	_ = response.Body.Close()
	if challenge.Nonce == "" || challenge.Realm == "" {
		return nil, "", fmt.Errorf("海康设备未返回有效摘要认证挑战")
	}

	nonceCount := "00000001"
	cnonce := randomHex(16)
	uri := request.URL.RequestURI()
	authorization := buildDigestAuthorization(method, uri, c.username, c.password, challenge, nonceCount, cnonce)
	retry, err := http.NewRequest(method, target, bytes.NewReader(body))
	if err != nil {
		return nil, "", err
	}
	retry.Header.Set("Content-Type", contentType)
	retry.Header.Set("Accept", "application/json, application/xml")
	retry.Header.Set("Authorization", authorization)
	response, err = c.client.Do(retry)
	if err != nil {
		return nil, "", err
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		defer response.Body.Close()
		responseBytes, _ := io.ReadAll(io.LimitReader(response.Body, 4096))
		return nil, "", fmt.Errorf("海康 ISAPI 返回 HTTP %d: %s", response.StatusCode, strings.TrimSpace(string(responseBytes)))
	}
	return readDigestResponse(response)
}

func readDigestResponse(response *http.Response) ([]byte, string, error) {
	defer response.Body.Close()
	body, err := io.ReadAll(io.LimitReader(response.Body, 4<<20))
	if err != nil {
		return nil, "", err
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return nil, "", fmt.Errorf("海康 ISAPI 返回 HTTP %d: %s", response.StatusCode, strings.TrimSpace(string(body)))
	}
	return body, response.Header.Get("Content-Type"), nil
}

func parseDigestChallenge(value string) digestChallenge {
	challenge := digestChallenge{}
	value = strings.TrimSpace(value)
	if index := strings.Index(strings.ToLower(value), "digest "); index >= 0 {
		value = value[index+len("digest "):]
	}
	for _, item := range strings.Split(value, ",") {
		parts := strings.SplitN(strings.TrimSpace(item), "=", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.ToLower(strings.TrimSpace(parts[0]))
		val := strings.Trim(strings.TrimSpace(parts[1]), `"`)
		switch key {
		case "realm":
			challenge.Realm = val
		case "nonce":
			challenge.Nonce = val
		case "qop":
			for _, qop := range strings.Split(val, ",") {
				if strings.EqualFold(strings.TrimSpace(qop), "auth") {
					challenge.QOP = "auth"
					break
				}
			}
		case "opaque":
			challenge.Opaque = val
		case "algorithm":
			challenge.Algorithm = val
		}
	}
	return challenge
}

func buildDigestAuthorization(method, uri, username, password string, challenge digestChallenge, nonceCount, cnonce string) string {
	ha1 := md5Hex(username + ":" + challenge.Realm + ":" + password)
	ha2 := md5Hex(method + ":" + uri)
	response := ""
	if challenge.QOP != "" {
		response = md5Hex(strings.Join([]string{
			ha1,
			challenge.Nonce,
			nonceCount,
			cnonce,
			challenge.QOP,
			ha2,
		}, ":"))
	} else {
		response = md5Hex(strings.Join([]string{ha1, challenge.Nonce, ha2}, ":"))
	}
	parts := []string{
		fmt.Sprintf(`username="%s"`, username),
		fmt.Sprintf(`realm="%s"`, challenge.Realm),
		fmt.Sprintf(`nonce="%s"`, challenge.Nonce),
		fmt.Sprintf(`uri="%s"`, uri),
		fmt.Sprintf(`response="%s"`, response),
	}
	if challenge.Algorithm != "" {
		parts = append(parts, fmt.Sprintf("algorithm=%s", challenge.Algorithm))
	}
	if challenge.QOP != "" {
		parts = append(parts, "qop="+challenge.QOP, "nc="+nonceCount, fmt.Sprintf(`cnonce="%s"`, cnonce))
	}
	if challenge.Opaque != "" {
		parts = append(parts, fmt.Sprintf(`opaque="%s"`, challenge.Opaque))
	}
	return "Digest " + strings.Join(parts, ", ")
}

func md5Hex(value string) string {
	sum := md5.Sum([]byte(value))
	return hex.EncodeToString(sum[:])
}

func randomHex(size int) string {
	buffer := make([]byte, size)
	if _, err := rand.Read(buffer); err != nil {
		return md5Hex(time.Now().String())
	}
	return hex.EncodeToString(buffer)
}
