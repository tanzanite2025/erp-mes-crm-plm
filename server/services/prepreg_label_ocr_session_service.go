package services

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
)

const (
	PrepregLabelOcrStatusWaiting   = "Waiting"
	PrepregLabelOcrStatusSubmitted = "Submitted"
	PrepregLabelOcrStatusExpired   = "Expired"
)

var (
	ErrPrepregLabelOcrSessionNotFound = errors.New("prepreg label ocr session not found")
	ErrPrepregLabelOcrSessionExpired  = errors.New("prepreg label ocr session expired")
	ErrPrepregLabelOcrSessionToken    = errors.New("invalid prepreg label ocr session token")
)

var allowedOcrFieldKeys = map[string]struct{}{
	"code":                 {},
	"name":                 {},
	"supplierProductCode":  {},
	"resinContentBatchRaw": {},
	"widthMm":              {},
	"nominalAreaM2":        {},
	"inspector":            {},
	"boxNo":                {},
	"productionDate":       {},
}

type PrepregLabelOcrSessionResponse struct {
	SessionID   string          `json:"sessionId"`
	UploadToken string          `json:"uploadToken,omitempty"`
	Status      string          `json:"status"`
	RawText     string          `json:"rawText"`
	Fields      json.RawMessage `json:"fields"`
	ImageName   string          `json:"imageName"`
	ImageSize   int64           `json:"imageSize"`
	SubmittedAt *time.Time      `json:"submittedAt,omitempty"`
	ExpiresAt   time.Time       `json:"expiresAt"`
}

type SubmitPrepregLabelOcrSessionRequest struct {
	Token     string          `json:"token"`
	RawText   string          `json:"rawText"`
	Fields    json.RawMessage `json:"fields"`
	ImageName string          `json:"imageName"`
	ImageSize int64           `json:"imageSize"`
}

func CreatePrepregLabelOcrSession() (PrepregLabelOcrSessionResponse, error) {
	session := models.PrepregLabelOcrSession{
		SessionID:   "prepreg-ocr-" + uuid.NewString(),
		UploadToken: randomToken(24),
		Status:      PrepregLabelOcrStatusWaiting,
		Fields:      json.RawMessage(`{}`),
		ExpiresAt:   time.Now().Add(30 * time.Minute),
	}
	if err := db.DB.Create(&session).Error; err != nil {
		return PrepregLabelOcrSessionResponse{}, err
	}
	return mapPrepregLabelOcrSession(session, true), nil
}

func GetPrepregLabelOcrSession(sessionID string) (PrepregLabelOcrSessionResponse, error) {
	session, err := findPrepregLabelOcrSession(sessionID)
	if err != nil {
		return PrepregLabelOcrSessionResponse{}, err
	}
	if isPrepregLabelOcrSessionExpired(session) {
		session.Status = PrepregLabelOcrStatusExpired
		_ = db.DB.Save(&session).Error
	}
	return mapPrepregLabelOcrSession(session, false), nil
}

func SubmitPrepregLabelOcrSession(sessionID string, input SubmitPrepregLabelOcrSessionRequest) (PrepregLabelOcrSessionResponse, error) {
	session, err := findPrepregLabelOcrSession(sessionID)
	if err != nil {
		return PrepregLabelOcrSessionResponse{}, err
	}
	if isPrepregLabelOcrSessionExpired(session) {
		session.Status = PrepregLabelOcrStatusExpired
		_ = db.DB.Save(&session).Error
		return PrepregLabelOcrSessionResponse{}, ErrPrepregLabelOcrSessionExpired
	}
	if strings.TrimSpace(input.Token) == "" || strings.TrimSpace(input.Token) != session.UploadToken {
		return PrepregLabelOcrSessionResponse{}, ErrPrepregLabelOcrSessionToken
	}

	now := time.Now()
	fields := normalizeOcrFields(input.Fields)
	session.Status = PrepregLabelOcrStatusSubmitted
	session.RawText = trimRunes(strings.TrimSpace(input.RawText), 8000)
	session.Fields = fields
	session.ImageName = trimRunes(strings.TrimSpace(input.ImageName), 255)
	if input.ImageSize < 0 {
		session.ImageSize = 0
	} else {
		session.ImageSize = input.ImageSize
	}
	session.SubmittedAt = &now

	if err := db.DB.Save(&session).Error; err != nil {
		return PrepregLabelOcrSessionResponse{}, err
	}
	return mapPrepregLabelOcrSession(session, false), nil
}

func findPrepregLabelOcrSession(sessionID string) (models.PrepregLabelOcrSession, error) {
	var session models.PrepregLabelOcrSession
	if err := db.DB.Where("session_id = ?", strings.TrimSpace(sessionID)).First(&session).Error; err != nil {
		return session, ErrPrepregLabelOcrSessionNotFound
	}
	return session, nil
}

func isPrepregLabelOcrSessionExpired(session models.PrepregLabelOcrSession) bool {
	return time.Now().After(session.ExpiresAt) && session.Status != PrepregLabelOcrStatusSubmitted
}

func mapPrepregLabelOcrSession(session models.PrepregLabelOcrSession, includeToken bool) PrepregLabelOcrSessionResponse {
	fields := normalizeOcrFields(session.Fields)
	response := PrepregLabelOcrSessionResponse{
		SessionID:   session.SessionID,
		Status:      session.Status,
		RawText:     session.RawText,
		Fields:      fields,
		ImageName:   session.ImageName,
		ImageSize:   session.ImageSize,
		SubmittedAt: session.SubmittedAt,
		ExpiresAt:   session.ExpiresAt,
	}
	if includeToken {
		response.UploadToken = session.UploadToken
	}
	return response
}

func normalizeOcrFields(raw json.RawMessage) json.RawMessage {
	trimmed := strings.TrimSpace(string(raw))
	if trimmed == "" || !json.Valid([]byte(trimmed)) {
		return json.RawMessage(`{}`)
	}

	decoded := make(map[string]any)
	if err := json.Unmarshal([]byte(trimmed), &decoded); err != nil {
		return json.RawMessage(`{}`)
	}

	cleaned := make(map[string]string, len(decoded))
	for key, value := range decoded {
		if _, allowed := allowedOcrFieldKeys[key]; !allowed {
			continue
		}
		text, ok := value.(string)
		if !ok {
			continue
		}
		nextValue := trimRunes(strings.TrimSpace(text), 200)
		if nextValue == "" {
			continue
		}
		cleaned[key] = nextValue
	}

	normalized, err := json.Marshal(cleaned)
	if err != nil {
		return json.RawMessage(`{}`)
	}
	return json.RawMessage(normalized)
}

func trimRunes(value string, max int) string {
	if max <= 0 {
		return ""
	}
	runes := []rune(value)
	if len(runes) <= max {
		return value
	}
	return string(runes[:max])
}

func randomToken(byteLen int) string {
	buf := make([]byte, byteLen)
	if _, err := rand.Read(buf); err != nil {
		return strings.ReplaceAll(uuid.NewString(), "-", "") + strings.ReplaceAll(uuid.NewString(), "-", "")
	}
	return hex.EncodeToString(buf)
}
