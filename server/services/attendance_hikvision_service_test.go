package services

import (
	"crypto/md5"
	"encoding/hex"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"xdfc-server/models"
)

func TestParseHikvisionXMLInfoAndEventNodes(t *testing.T) {
	device := models.AttendanceDevice{
		BaseModel: models.BaseModel{
			ID: "device-1",
		},
		TimeZone: "Asia/Shanghai",
	}
	payload := `<AcsEvent><totalMatches>2</totalMatches><InfoList><Event><major>5</major><minor>1</minor><time>2026-08-13T09:10:11+08:00</time><employeeNoString>1001</employeeNoString><eventId>evt-1</eventId><currentVerifyMode>face</currentVerifyMode></Event><Info><major>5</major><minor>2</minor><time>2026-08-13T18:20:21+08:00</time><employeeNo>1002</employeeNo><serialNo>evt-2</serialNo><direction>out</direction></Info></InfoList></AcsEvent>`

	events, total, err := parseHikvisionEvents([]byte(payload), "application/xml", device, hikvisionAdapterConfig{})
	if err != nil {
		t.Fatalf("parse xml: %v", err)
	}
	if total != 2 || len(events) != 2 {
		t.Fatalf("unexpected parse result total=%d len=%d", total, len(events))
	}
	if events[0].DeviceEmployeeKey != "1001" || events[0].VerificationMethod != "face" {
		t.Fatalf("unexpected first event: %#v", events[0])
	}
	if events[1].Direction != "out" || events[1].ExternalEventID != "evt-2" {
		t.Fatalf("unexpected second event: %#v", events[1])
	}
}

func TestBuildDigestAuthorization(t *testing.T) {
	challenge := digestChallenge{
		Realm: "Hikvision",
		Nonce: "abcdef",
		QOP:   "auth",
	}
	value := buildDigestAuthorization(
		http.MethodPost,
		"/ISAPI/AccessControl/AcsEvent",
		"admin",
		"password",
		challenge,
		"00000001",
		"cnonce",
	)
	if !strings.HasPrefix(value, "Digest ") ||
		!strings.Contains(value, `username="admin"`) ||
		!strings.Contains(value, `realm="Hikvision"`) ||
		!strings.Contains(value, `qop=auth`) {
		t.Fatalf("unexpected digest authorization: %s", value)
	}
}

func TestDigestHTTPClientRetriesAfterChallenge(t *testing.T) {
	const username = "admin"
	const password = "password"
	const realm = "Hikvision"
	const nonce = "nonce-1"
	const qop = "auth"
	const uri = "/ISAPI/AccessControl/AcsEvent"
	const body = `{"ok":true}`

	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		authorization := request.Header.Get("Authorization")
		if authorization == "" {
			writer.Header().Set("WWW-Authenticate", `Digest realm="Hikvision", nonce="nonce-1", qop="auth"`)
			writer.WriteHeader(http.StatusUnauthorized)
			return
		}
		parts := parseTestDigestAuthorization(authorization)
		ha1 := md5Hex(username + ":" + realm + ":" + password)
		ha2 := md5Hex(http.MethodPost + ":" + uri)
		expected := md5Hex(strings.Join([]string{
			ha1,
			nonce,
			parts["nc"],
			parts["cnonce"],
			qop,
			ha2,
		}, ":"))
		if parts["response"] != expected {
			writer.WriteHeader(http.StatusUnauthorized)
			return
		}
		writer.Header().Set("Content-Type", "application/json")
		writer.WriteHeader(http.StatusOK)
		_, _ = writer.Write([]byte(body))
	}))
	defer server.Close()

	client := &digestHTTPClient{
		client:   server.Client(),
		username: username,
		password: password,
	}
	response, _, err := client.do(http.MethodPost, server.URL+uri, []byte(body))
	if err != nil {
		t.Fatalf("digest request: %v", err)
	}
	if string(response) != body {
		t.Fatalf("unexpected response: %s", response)
	}
}

func TestProbeHikvisionDeviceUsesDigestHealthEndpoint(t *testing.T) {
	const username = "admin"
	const password = "password"
	const realm = "Hikvision"
	const nonce = "health-nonce"
	const uri = "/ISAPI/System/deviceInfo"

	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		if request.URL.Path != uri {
			t.Fatalf("unexpected probe path: %s", request.URL.Path)
		}
		authorization := request.Header.Get("Authorization")
		if authorization == "" {
			writer.Header().Set("WWW-Authenticate", `Digest realm="Hikvision", nonce="health-nonce", qop="auth"`)
			writer.WriteHeader(http.StatusUnauthorized)
			return
		}
		parts := parseTestDigestAuthorization(authorization)
		ha1 := md5Hex(username + ":" + realm + ":" + password)
		ha2 := md5Hex(http.MethodGet + ":" + uri)
		expected := md5Hex(strings.Join([]string{
			ha1,
			nonce,
			parts["nc"],
			parts["cnonce"],
			"auth",
			ha2,
		}, ":"))
		if parts["response"] != expected {
			writer.WriteHeader(http.StatusUnauthorized)
			return
		}
		writer.Header().Set("Content-Type", "application/xml")
		writer.WriteHeader(http.StatusOK)
		_, _ = writer.Write([]byte(`<DeviceInfo><deviceName>attendance-terminal</deviceName></DeviceInfo>`))
	}))
	defer server.Close()

	device := models.AttendanceDevice{
		Endpoint:    server.URL,
		Port:        0,
		Username:    username,
		SecretValue: password,
		Protocol:    "isapi",
		Vendor:      "hikvision",
	}
	if err := probeHikvisionDevice(device); err != nil {
		t.Fatalf("health probe failed: %v", err)
	}
}

func parseTestDigestAuthorization(value string) map[string]string {
	result := make(map[string]string)
	value = strings.TrimSpace(strings.TrimPrefix(value, "Digest "))
	for _, part := range strings.Split(value, ",") {
		pieces := strings.SplitN(strings.TrimSpace(part), "=", 2)
		if len(pieces) != 2 {
			continue
		}
		result[pieces[0]] = strings.Trim(strings.TrimSpace(pieces[1]), `"`)
	}
	return result
}

func TestMD5HexStable(t *testing.T) {
	sum := md5.Sum([]byte("attendance"))
	if md5Hex("attendance") != hex.EncodeToString(sum[:]) {
		t.Fatal("md5 helper changed unexpectedly")
	}
}
