package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

const (
	PackagingAssemblyStatusBound         = "BOUND"
	PackagingAssemblySourceMobileCapture = "MOBILE_CAPTURE"
	PackagingAssemblyMaxItemCount        = 200

	PackagingAssemblyCaptureStatusWaiting   = "Waiting"
	PackagingAssemblyCaptureStatusSubmitted = "Submitted"
	PackagingAssemblyCaptureStatusExpired   = "Expired"
)

var (
	ErrPackagingAssemblyCaptureSessionNotFound = errors.New("packaging assembly capture session not found")
	ErrPackagingAssemblyCaptureSessionExpired  = errors.New("packaging assembly capture session expired")
	ErrPackagingAssemblyCaptureSessionToken    = errors.New("invalid packaging assembly capture session token")
)

type PackagingAssemblyItemResponse struct {
	ID                      string `json:"id"`
	ProductBarcode          string `json:"productBarcode"`
	ProductBarcodeBindingID string `json:"productBarcodeBindingId"`
	BarcodeProtocol         string `json:"barcodeProtocol"`
	BarcodeSummary          string `json:"barcodeSummary"`
	SortOrder               int    `json:"sortOrder"`
}

type PackagingAssemblyResponse struct {
	ID          string                          `json:"id"`
	PackageCode string                          `json:"packageCode"`
	Status      string                          `json:"status"`
	ItemCount   int                             `json:"itemCount"`
	Source      string                          `json:"source"`
	SessionID   string                          `json:"sessionId"`
	AssembledBy string                          `json:"assembledBy"`
	AssembledAt *time.Time                      `json:"assembledAt,omitempty"`
	CreatedAt   time.Time                       `json:"createdAt"`
	Items       []PackagingAssemblyItemResponse `json:"items"`
}

type PackagingAssemblyListResponse struct {
	Items []PackagingAssemblyResponse `json:"items"`
	Total int64                       `json:"total"`
}

type PackagingAssemblyCaptureSessionResponse struct {
	SessionID   string                     `json:"sessionId"`
	UploadToken string                     `json:"uploadToken,omitempty"`
	Status      string                     `json:"status"`
	PackageCode string                     `json:"packageCode"`
	AssemblyID  string                     `json:"assemblyId"`
	Assembly    *PackagingAssemblyResponse `json:"assembly,omitempty"`
	SubmittedAt *time.Time                 `json:"submittedAt,omitempty"`
	ExpiresAt   time.Time                  `json:"expiresAt"`
}

type SubmitPackagingAssemblyCaptureSessionRequest struct {
	Token           string   `json:"token"`
	ProductBarcodes []string `json:"productBarcodes"`
}

type PackagingAssemblyListQuery struct {
	Limit       int
	PackageCode string
}

func packagingAssemblyAuditDiff(before map[string]any, payload map[string]any) json.RawMessage {
	diff, _ := json.Marshal(map[string]any{
		"before":  before,
		"payload": payload,
	})
	return diff
}

func packagingAssemblyAuditIdentityFromContext(ctx context.Context, fallbackOperator string) (string, string) {
	return inventoryAuditIdentityFromContext(ctx, fallbackOperator)
}

func writePackagingAssemblyAuditEntryWithContext(ctx context.Context, tx *gorm.DB, targetID string, action string, before map[string]any, payload map[string]any, fallbackOperator string) error {
	operator, ip := packagingAssemblyAuditIdentityFromContext(ctx, fallbackOperator)
	return defaultServiceRuntime().auditLogger.Write(tx, AuditEntry{
		Module:   "PackagingAssembly",
		TargetID: strings.TrimSpace(targetID),
		Action:   strings.TrimSpace(action),
		Diff:     packagingAssemblyAuditDiff(before, payload),
		Operator: strings.TrimSpace(operator),
		IP:       strings.TrimSpace(ip),
	})
}

func packagingAssemblySessionAuditPayload(session models.PackagingAssemblyCaptureSession) map[string]any {
	return map[string]any{
		"sessionId":   strings.TrimSpace(session.SessionID),
		"packageCode": strings.TrimSpace(session.PackageCode),
		"status":      strings.TrimSpace(session.Status),
		"expiresAt":   session.ExpiresAt,
	}
}

func packagingAssemblyRecordAuditPayload(assembly models.PackagingAssembly, productBarcodes []string) map[string]any {
	return map[string]any{
		"packageCode":     strings.TrimSpace(assembly.PackageCode),
		"status":          strings.TrimSpace(assembly.Status),
		"itemCount":       assembly.ItemCount,
		"source":          strings.TrimSpace(assembly.Source),
		"sessionId":       strings.TrimSpace(assembly.SessionID),
		"assembledBy":     strings.TrimSpace(assembly.AssembledBy),
		"assembledAt":     assembly.AssembledAt,
		"productBarcodes": productBarcodes,
	}
}

func CreatePackagingAssemblyCaptureSession(ctx context.Context) (PackagingAssemblyCaptureSessionResponse, error) {
	if db.DB == nil {
		return PackagingAssemblyCaptureSessionResponse{}, errors.New("database not initialized")
	}

	session := models.PackagingAssemblyCaptureSession{
		BaseModel:   models.BaseModel{ID: uuid.NewString()},
		SessionID:   "packaging-assembly-" + uuid.NewString(),
		UploadToken: randomPackagingAssemblyCaptureToken(24),
		Status:      PackagingAssemblyCaptureStatusWaiting,
		PackageCode: nextPackagingAssemblyPackageCode(),
		ExpiresAt:   time.Now().Add(45 * time.Minute),
	}
	if err := db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&session).Error; err != nil {
			return err
		}
		return writePackagingAssemblyAuditEntryWithContext(ctx, tx, session.ID, "CAPTURE_SESSION_CREATE", nil, packagingAssemblySessionAuditPayload(session), "")
	}); err != nil {
		return PackagingAssemblyCaptureSessionResponse{}, err
	}
	return mapPackagingAssemblyCaptureSession(session, true, nil), nil
}

func GetPackagingAssemblyCaptureSession(sessionID string) (PackagingAssemblyCaptureSessionResponse, error) {
	session, err := findPackagingAssemblyCaptureSession(sessionID)
	if err != nil {
		return PackagingAssemblyCaptureSessionResponse{}, err
	}
	if isPackagingAssemblyCaptureSessionExpired(session) {
		session.Status = PackagingAssemblyCaptureStatusExpired
		_ = db.DB.Save(&session).Error
	}

	var assembly *PackagingAssemblyResponse
	if assemblyID := optionalUUIDString(session.AssemblyID); assemblyID != "" {
		if item, err := loadPackagingAssemblyByID(assemblyID); err == nil {
			mapped := mapPackagingAssembly(item)
			assembly = &mapped
		}
	}
	return mapPackagingAssemblyCaptureSession(session, false, assembly), nil
}

func SubmitPackagingAssemblyCaptureSession(ctx context.Context, sessionID string, input SubmitPackagingAssemblyCaptureSessionRequest, operator string) (PackagingAssemblyCaptureSessionResponse, error) {
	if db.DB == nil {
		return PackagingAssemblyCaptureSessionResponse{}, errors.New("database not initialized")
	}

	session, err := findPackagingAssemblyCaptureSession(sessionID)
	if err != nil {
		return PackagingAssemblyCaptureSessionResponse{}, err
	}
	if isPackagingAssemblyCaptureSessionExpired(session) {
		session.Status = PackagingAssemblyCaptureStatusExpired
		_ = db.DB.Save(&session).Error
		return PackagingAssemblyCaptureSessionResponse{}, ErrPackagingAssemblyCaptureSessionExpired
	}
	if strings.TrimSpace(input.Token) == "" || strings.TrimSpace(input.Token) != session.UploadToken {
		return PackagingAssemblyCaptureSessionResponse{}, ErrPackagingAssemblyCaptureSessionToken
	}
	if assemblyID := optionalUUIDString(session.AssemblyID); session.Status == PackagingAssemblyCaptureStatusSubmitted && assemblyID != "" {
		assembly, loadErr := loadPackagingAssemblyByID(assemblyID)
		if loadErr != nil {
			return PackagingAssemblyCaptureSessionResponse{}, loadErr
		}
		mapped := mapPackagingAssembly(assembly)
		return mapPackagingAssemblyCaptureSession(session, false, &mapped), nil
	}

	productBarcodes, err := normalizePackagingAssemblyProductBarcodes(input.ProductBarcodes)
	if err != nil {
		return PackagingAssemblyCaptureSessionResponse{}, &ProductBarcodeBindingValidationError{Message: err.Error()}
	}

	resolvedOperator := strings.TrimSpace(operator)
	if resolvedOperator == "" {
		resolvedOperator = "mobile-capture"
	}

	var assembly models.PackagingAssembly
	now := time.Now().UTC()
	err = db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if existing, exists, loadErr := findPackagingAssemblyByPackageCodeTx(tx, session.PackageCode); loadErr != nil {
			return loadErr
		} else if exists {
			assembly = existing
			session.Status = PackagingAssemblyCaptureStatusSubmitted
			session.AssemblyID = stringPtr(existing.ID)
			if session.SubmittedAt == nil {
				session.SubmittedAt = &now
			}
			if err := tx.Save(&session).Error; err != nil {
				return err
			}
			return nil
		}

		items := make([]models.PackagingAssemblyItem, 0, len(productBarcodes))
		for index, productBarcode := range productBarcodes {
			parsed, parseErr := ParseLinearBarcode(productBarcode)
			if parseErr != nil {
				return &ProductBarcodeBindingValidationError{Message: parseErr.Error()}
			}

			binding, exists, queryErr := findProductBarcodeBindingByProductBarcodeTx(tx, parsed.RawCode)
			if queryErr != nil {
				return queryErr
			}
			if !exists {
				return &ProductBarcodeBindingValidationError{Message: fmt.Sprintf("productBarcode %s has not been bound in system", parsed.RawCode)}
			}

			var existing models.PackagingAssemblyItem
			if err := tx.Where("product_barcode = ?", parsed.RawCode).First(&existing).Error; err == nil {
				return &ProductBarcodeBindingValidationError{Message: fmt.Sprintf("productBarcode %s is already packaged", parsed.RawCode)}
			} else if !errors.Is(err, gorm.ErrRecordNotFound) {
				return err
			}

			items = append(items, models.PackagingAssemblyItem{
				BaseModel:               models.BaseModel{ID: uuid.NewString()},
				ProductBarcode:          parsed.RawCode,
				ProductBarcodeBindingID: strings.TrimSpace(binding.ID),
				BarcodeProtocol:         strings.TrimSpace(parsed.Protocol),
				BarcodeSummary:          strings.TrimSpace(parsed.Summary),
				SortOrder:               index + 1,
			})
		}

		assembly = models.PackagingAssembly{
			BaseModel:   models.BaseModel{ID: uuid.NewString()},
			PackageCode: strings.TrimSpace(session.PackageCode),
			Status:      PackagingAssemblyStatusBound,
			ItemCount:   len(items),
			Source:      PackagingAssemblySourceMobileCapture,
			SessionID:   strings.TrimSpace(session.SessionID),
			AssembledBy: resolvedOperator,
			AssembledAt: &now,
		}
		if err := tx.Create(&assembly).Error; err != nil {
			return err
		}
		for index := range items {
			items[index].AssemblyID = assembly.ID
		}
		if err := tx.Create(&items).Error; err != nil {
			return err
		}

		snapshot, _ := json.Marshal(productBarcodes)
		session.Status = PackagingAssemblyCaptureStatusSubmitted
		session.ProductBarcodeSnapshot = string(snapshot)
		session.AssemblyID = stringPtr(assembly.ID)
		session.SubmittedAt = &now
		if err := tx.Save(&session).Error; err != nil {
			return err
		}
		assembly.Items = items
		if err := writePackagingAssemblyAuditEntryWithContext(ctx, tx, assembly.ID, "SUBMIT", nil, packagingAssemblyRecordAuditPayload(assembly, productBarcodes), resolvedOperator); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		if item, loadErr := loadPackagingAssemblyByPackageCode(session.PackageCode); loadErr == nil {
			mapped := mapPackagingAssembly(item)
			return mapPackagingAssemblyCaptureSession(session, false, &mapped), nil
		}
		if packagedBarcode, exists := findFirstPackagedProductBarcode(productBarcodes); exists {
			return PackagingAssemblyCaptureSessionResponse{}, &ProductBarcodeBindingValidationError{Message: fmt.Sprintf("productBarcode %s is already packaged", packagedBarcode)}
		}
		return PackagingAssemblyCaptureSessionResponse{}, err
	}

	mapped := mapPackagingAssembly(assembly)
	return mapPackagingAssemblyCaptureSession(session, false, &mapped), nil
}

func ListPackagingAssemblies(query PackagingAssemblyListQuery) (PackagingAssemblyListResponse, error) {
	if db.DB == nil {
		return PackagingAssemblyListResponse{}, errors.New("database not initialized")
	}

	limit := query.Limit
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	base := db.DB.Model(&models.PackagingAssembly{})
	if strings.TrimSpace(query.PackageCode) != "" {
		base = base.Where("package_code = ?", strings.ToUpper(strings.TrimSpace(query.PackageCode)))
	}

	var total int64
	if err := base.Count(&total).Error; err != nil {
		return PackagingAssemblyListResponse{}, err
	}

	var items []models.PackagingAssembly
	if err := base.
		Preload("Items", func(tx *gorm.DB) *gorm.DB { return tx.Order("sort_order ASC") }).
		Order("created_at DESC").
		Limit(limit).
		Find(&items).Error; err != nil {
		return PackagingAssemblyListResponse{}, err
	}

	responseItems := make([]PackagingAssemblyResponse, 0, len(items))
	for _, item := range items {
		responseItems = append(responseItems, mapPackagingAssembly(item))
	}
	return PackagingAssemblyListResponse{Items: responseItems, Total: total}, nil
}

func findPackagingAssemblyCaptureSession(sessionID string) (models.PackagingAssemblyCaptureSession, error) {
	var session models.PackagingAssemblyCaptureSession
	if err := db.DB.Where("session_id = ?", strings.TrimSpace(sessionID)).First(&session).Error; err != nil {
		return session, ErrPackagingAssemblyCaptureSessionNotFound
	}
	return session, nil
}

func loadPackagingAssemblyByID(id string) (models.PackagingAssembly, error) {
	var assembly models.PackagingAssembly
	err := db.DB.
		Preload("Items", func(tx *gorm.DB) *gorm.DB { return tx.Order("sort_order ASC") }).
		Where("id = ?", strings.TrimSpace(id)).
		First(&assembly).Error
	return assembly, err
}

func loadPackagingAssemblyByPackageCode(packageCode string) (models.PackagingAssembly, error) {
	var assembly models.PackagingAssembly
	err := db.DB.
		Preload("Items", func(tx *gorm.DB) *gorm.DB { return tx.Order("sort_order ASC") }).
		Where("package_code = ?", strings.TrimSpace(packageCode)).
		First(&assembly).Error
	return assembly, err
}

func findPackagingAssemblyByPackageCodeTx(tx *gorm.DB, packageCode string) (models.PackagingAssembly, bool, error) {
	var assembly models.PackagingAssembly
	err := tx.
		Preload("Items", func(query *gorm.DB) *gorm.DB { return query.Order("sort_order ASC") }).
		Where("package_code = ?", strings.TrimSpace(packageCode)).
		First(&assembly).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.PackagingAssembly{}, false, nil
	}
	if err != nil {
		return models.PackagingAssembly{}, false, err
	}
	return assembly, true, nil
}

func isPackagingAssemblyCaptureSessionExpired(session models.PackagingAssemblyCaptureSession) bool {
	return time.Now().After(session.ExpiresAt) && session.Status != PackagingAssemblyCaptureStatusSubmitted
}

func normalizePackagingAssemblyProductBarcodes(input []string) ([]string, error) {
	seen := make(map[string]struct{}, len(input))
	result := make([]string, 0, len(input))
	for _, raw := range input {
		code := strings.ToUpper(strings.TrimSpace(raw))
		if code == "" {
			continue
		}
		if _, exists := seen[code]; exists {
			continue
		}
		seen[code] = struct{}{}
		result = append(result, code)
	}
	if len(result) == 0 {
		return nil, errors.New("productBarcodes is required")
	}
	if len(result) > PackagingAssemblyMaxItemCount {
		return nil, fmt.Errorf("productBarcodes cannot exceed %d items", PackagingAssemblyMaxItemCount)
	}
	return result, nil
}

func findFirstPackagedProductBarcode(productBarcodes []string) (string, bool) {
	if len(productBarcodes) == 0 || db.DB == nil {
		return "", false
	}
	var item models.PackagingAssemblyItem
	if err := db.DB.
		Where("product_barcode IN ?", productBarcodes).
		Order("created_at DESC").
		First(&item).Error; err != nil {
		return "", false
	}
	return strings.TrimSpace(item.ProductBarcode), true
}

func mapPackagingAssembly(item models.PackagingAssembly) PackagingAssemblyResponse {
	items := make([]PackagingAssemblyItemResponse, 0, len(item.Items))
	for _, line := range item.Items {
		items = append(items, PackagingAssemblyItemResponse{
			ID:                      line.ID,
			ProductBarcode:          strings.TrimSpace(line.ProductBarcode),
			ProductBarcodeBindingID: strings.TrimSpace(line.ProductBarcodeBindingID),
			BarcodeProtocol:         strings.TrimSpace(line.BarcodeProtocol),
			BarcodeSummary:          strings.TrimSpace(line.BarcodeSummary),
			SortOrder:               line.SortOrder,
		})
	}

	return PackagingAssemblyResponse{
		ID:          item.ID,
		PackageCode: strings.TrimSpace(item.PackageCode),
		Status:      strings.TrimSpace(item.Status),
		ItemCount:   item.ItemCount,
		Source:      strings.TrimSpace(item.Source),
		SessionID:   strings.TrimSpace(item.SessionID),
		AssembledBy: strings.TrimSpace(item.AssembledBy),
		AssembledAt: item.AssembledAt,
		CreatedAt:   item.CreatedAt,
		Items:       items,
	}
}

func mapPackagingAssemblyCaptureSession(session models.PackagingAssemblyCaptureSession, includeToken bool, assembly *PackagingAssemblyResponse) PackagingAssemblyCaptureSessionResponse {
	response := PackagingAssemblyCaptureSessionResponse{
		SessionID:   strings.TrimSpace(session.SessionID),
		Status:      strings.TrimSpace(session.Status),
		PackageCode: strings.TrimSpace(session.PackageCode),
		AssemblyID:  optionalUUIDString(session.AssemblyID),
		Assembly:    assembly,
		SubmittedAt: session.SubmittedAt,
		ExpiresAt:   session.ExpiresAt,
	}
	if includeToken {
		response.UploadToken = session.UploadToken
	}
	return response
}

func optionalUUIDString(value *string) string {
	if value == nil {
		return ""
	}
	return strings.TrimSpace(*value)
}

func stringPtr(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func nextPackagingAssemblyPackageCode() string {
	return "PKG-" + time.Now().UTC().Format("20060102-150405") + "-" + strings.ToUpper(strings.ReplaceAll(uuid.NewString()[:8], "-", ""))
}

func randomPackagingAssemblyCaptureToken(byteLen int) string {
	buf := make([]byte, byteLen)
	if _, err := rand.Read(buf); err != nil {
		return strings.ReplaceAll(uuid.NewString(), "-", "") + strings.ReplaceAll(uuid.NewString(), "-", "")
	}
	return hex.EncodeToString(buf)
}
