package services

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
)

const (
	ProductBarcodeCaptureStatusWaiting   = "Waiting"
	ProductBarcodeCaptureStatusSubmitted = "Submitted"
	ProductBarcodeCaptureStatusExpired   = "Expired"
)

var (
	ErrProductBarcodeCaptureSessionNotFound = errors.New("product barcode capture session not found")
	ErrProductBarcodeCaptureSessionExpired  = errors.New("product barcode capture session expired")
	ErrProductBarcodeCaptureSessionToken    = errors.New("invalid product barcode capture session token")
)

type ProductBarcodeCaptureSessionResponse struct {
	SessionID       string     `json:"sessionId"`
	UploadToken     string     `json:"uploadToken,omitempty"`
	Status          string     `json:"status"`
	RawCode         string     `json:"rawCode"`
	BarcodeProtocol string     `json:"barcodeProtocol"`
	BarcodeSummary  string     `json:"barcodeSummary"`
	SubmittedAt     *time.Time `json:"submittedAt,omitempty"`
	ExpiresAt       time.Time  `json:"expiresAt"`
}

type SubmitProductBarcodeCaptureSessionRequest struct {
	Token   string `json:"token"`
	RawCode string `json:"rawCode"`
}

func CreateProductBarcodeCaptureSession() (ProductBarcodeCaptureSessionResponse, error) {
	session := models.ProductBarcodeCaptureSession{
		SessionID:   "product-barcode-" + uuid.NewString(),
		UploadToken: randomProductBarcodeCaptureToken(24),
		Status:      ProductBarcodeCaptureStatusWaiting,
		ExpiresAt:   time.Now().Add(30 * time.Minute),
	}
	if err := db.DB.Create(&session).Error; err != nil {
		return ProductBarcodeCaptureSessionResponse{}, err
	}
	return mapProductBarcodeCaptureSession(session, true), nil
}

func GetProductBarcodeCaptureSession(sessionID string) (ProductBarcodeCaptureSessionResponse, error) {
	session, err := findProductBarcodeCaptureSession(sessionID)
	if err != nil {
		return ProductBarcodeCaptureSessionResponse{}, err
	}
	if isProductBarcodeCaptureSessionExpired(session) {
		session.Status = ProductBarcodeCaptureStatusExpired
		_ = db.DB.Save(&session).Error
	}
	return mapProductBarcodeCaptureSession(session, false), nil
}

func SubmitProductBarcodeCaptureSession(sessionID string, input SubmitProductBarcodeCaptureSessionRequest) (ProductBarcodeCaptureSessionResponse, error) {
	session, err := findProductBarcodeCaptureSession(sessionID)
	if err != nil {
		return ProductBarcodeCaptureSessionResponse{}, err
	}
	if isProductBarcodeCaptureSessionExpired(session) {
		session.Status = ProductBarcodeCaptureStatusExpired
		_ = db.DB.Save(&session).Error
		return ProductBarcodeCaptureSessionResponse{}, ErrProductBarcodeCaptureSessionExpired
	}
	if strings.TrimSpace(input.Token) == "" || strings.TrimSpace(input.Token) != session.UploadToken {
		return ProductBarcodeCaptureSessionResponse{}, ErrProductBarcodeCaptureSessionToken
	}
	parsed, err := ParseLinearBarcode(strings.TrimSpace(input.RawCode))
	if err != nil {
		return ProductBarcodeCaptureSessionResponse{}, &ProductBarcodeBindingValidationError{Message: err.Error()}
	}
	now := time.Now()
	session.Status = ProductBarcodeCaptureStatusSubmitted
	session.RawCode = strings.TrimSpace(parsed.RawCode)
	session.BarcodeProtocol = strings.TrimSpace(parsed.Protocol)
	session.BarcodeSummary = strings.TrimSpace(parsed.Summary)
	session.SubmittedAt = &now
	if err := db.DB.Save(&session).Error; err != nil {
		return ProductBarcodeCaptureSessionResponse{}, err
	}
	return mapProductBarcodeCaptureSession(session, false), nil
}

func findProductBarcodeCaptureSession(sessionID string) (models.ProductBarcodeCaptureSession, error) {
	var session models.ProductBarcodeCaptureSession
	if err := db.DB.Where("session_id = ?", strings.TrimSpace(sessionID)).First(&session).Error; err != nil {
		return session, ErrProductBarcodeCaptureSessionNotFound
	}
	return session, nil
}

func isProductBarcodeCaptureSessionExpired(session models.ProductBarcodeCaptureSession) bool {
	return time.Now().After(session.ExpiresAt) && session.Status != ProductBarcodeCaptureStatusSubmitted
}

func mapProductBarcodeCaptureSession(session models.ProductBarcodeCaptureSession, includeToken bool) ProductBarcodeCaptureSessionResponse {
	response := ProductBarcodeCaptureSessionResponse{
		SessionID:       session.SessionID,
		Status:          session.Status,
		RawCode:         session.RawCode,
		BarcodeProtocol: session.BarcodeProtocol,
		BarcodeSummary:  session.BarcodeSummary,
		SubmittedAt:     session.SubmittedAt,
		ExpiresAt:       session.ExpiresAt,
	}
	if includeToken {
		response.UploadToken = session.UploadToken
	}
	return response
}

func randomProductBarcodeCaptureToken(byteLen int) string {
	buf := make([]byte, byteLen)
	if _, err := rand.Read(buf); err != nil {
		return strings.ReplaceAll(uuid.NewString(), "-", "") + strings.ReplaceAll(uuid.NewString(), "-", "")
	}
	return hex.EncodeToString(buf)
}
