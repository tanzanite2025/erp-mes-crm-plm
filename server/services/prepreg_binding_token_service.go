package services

import (
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	PrepregBindingTokenStatusUnbound = "UNBOUND"
	PrepregBindingTokenStatusBound   = "BOUND"
	PrepregRollInstanceStatusActive  = "ACTIVE"
	prepregBindingTokenMaxBatchSize  = 200
)

const prepregBindingTokenTTL = 5 * 24 * time.Hour

var (
	ErrPrepregBindingTokenConflict = errors.New("prepreg binding token conflict")
	ErrPrepregBindingTokenExpired  = errors.New("prepreg binding token expired")
	prepregBindingTokenPattern     = regexp.MustCompile(`^PREPREG-BIND-[A-Z0-9-]+$`)
)

type CreatePrepregBindingTokenBatchRequest struct {
	Quantity int `json:"quantity"`
}

type PrepregBindingTokenBatchItem struct {
	ID        string     `json:"id"`
	Token     string     `json:"token"`
	ExpiresAt *time.Time `json:"expiresAt,omitempty"`
}

type CreatePrepregBindingTokenBatchResponse struct {
	Items []PrepregBindingTokenBatchItem `json:"items"`
}

type BindPrepregBindingTokenRequest struct {
	SpecID string `json:"specId"`
}

type PrepregBindingTokenLookupResult struct {
	Token           string     `json:"token"`
	Status          string     `json:"status"`
	SpecID          string     `json:"specId,omitempty"`
	SpecCode        string     `json:"specCode,omitempty"`
	SpecName        string     `json:"specName,omitempty"`
	RollInstanceID  string     `json:"rollInstanceId,omitempty"`
	SupplierBatchNo string     `json:"supplierBatchNo,omitempty"`
	WidthMM         string     `json:"widthMm,omitempty"`
	LengthM         string     `json:"lengthM,omitempty"`
	NominalAreaM2   string     `json:"nominalAreaM2,omitempty"`
	BoxNo           string     `json:"boxNo,omitempty"`
	ProductionDate  string     `json:"productionDate,omitempty"`
	BoundAt         *time.Time `json:"boundAt,omitempty"`
	ExpiresAt       *time.Time `json:"expiresAt,omitempty"`
}

func mapPrepregRollInstanceToBindingTokenResult(binding models.PrepregBindingToken, roll *models.PrepregRollInstance) PrepregBindingTokenLookupResult {
	result := PrepregBindingTokenLookupResult{
		Token:     binding.Token,
		Status:    PrepregBindingTokenStatusBound,
		BoundAt:   binding.BoundAt,
		ExpiresAt: binding.ExpiresAt,
	}
	if roll == nil {
		return result
	}
	result.RollInstanceID = strings.TrimSpace(roll.ID)
	result.SpecID = strings.TrimSpace(roll.SpecID)
	result.SpecCode = strings.TrimSpace(roll.SpecCode)
	result.SpecName = strings.TrimSpace(roll.SpecName)
	result.SupplierBatchNo = strings.TrimSpace(roll.SupplierBatchNo)
	result.WidthMM = strings.TrimSpace(roll.WidthMM)
	result.LengthM = strings.TrimSpace(roll.LengthM)
	result.NominalAreaM2 = strings.TrimSpace(roll.NominalAreaM2)
	result.BoxNo = strings.TrimSpace(roll.BoxNo)
	result.ProductionDate = strings.TrimSpace(roll.ProductionDate)
	return result
}

func createPrepregRollInstanceFromSpecTx(tx *gorm.DB, binding *models.PrepregBindingToken, spec models.PrepregMaterialSpec) (*models.PrepregRollInstance, error) {
	if binding == nil || strings.TrimSpace(binding.ID) == "" {
		return nil, &PrepregMaterialSpecValidationError{Message: "绑定二维码无效，请重新生成"}
	}
	now := time.Now()
	roll := &models.PrepregRollInstance{
		BaseModel:           models.BaseModel{ID: uuid.NewString()},
		BindingToken:        strings.TrimSpace(binding.Token),
		SpecID:              strings.TrimSpace(spec.ID),
		SpecCode:            strings.TrimSpace(spec.Code),
		SpecName:            strings.TrimSpace(spec.DisplayAlias),
		ResinContentPercent: strings.TrimSpace(spec.ResinContentPercent),
		SupplierBatchNo:     strings.TrimSpace(spec.SupplierBatchNo),
		WidthMM:             strings.TrimSpace(spec.WidthMM),
		LengthM:             strings.TrimSpace(spec.LengthM),
		NominalAreaM2:       strings.TrimSpace(spec.NominalAreaM2),
		Inspector:           strings.TrimSpace(spec.Inspector),
		BoxNo:               strings.TrimSpace(spec.BoxNo),
		ProductionDate:      strings.TrimSpace(spec.ProductionDate),
		ActivatedAt:         &now,
		ActivatedBy:         "system",
		Status:              PrepregRollInstanceStatusActive,
	}
	if roll.SpecName == "" {
		roll.SpecName = strings.TrimSpace(spec.Name)
	}
	if err := tx.Create(roll).Error; err != nil {
		return nil, err
	}
	return roll, nil
}

func normalizePrepregBindingToken(token string) string {
	return strings.ToUpper(strings.TrimSpace(token))
}

func IsValidPrepregBindingToken(token string) bool {
	return prepregBindingTokenPattern.MatchString(normalizePrepregBindingToken(token))
}

func buildPrepregBindingTokenValue(now time.Time, index int) string {
	return fmt.Sprintf(
		"PREPREG-BIND-%s-%03d-%s",
		now.Format("20060102"),
		index+1,
		strings.ToUpper(uuid.NewString()[:8]),
	)
}

func isExpiredUnboundPrepregBindingToken(binding models.PrepregBindingToken, now time.Time) bool {
	if strings.TrimSpace(binding.BoundSpecID) != "" {
		return false
	}
	if binding.ExpiresAt == nil {
		return false
	}
	return binding.ExpiresAt.Before(now)
}

func cleanupExpiredPrepregBindingTokensTx(tx *gorm.DB, now time.Time, excludeToken string) error {
	query := tx.Where("(bound_spec_id = '' OR bound_spec_id IS NULL) AND expires_at IS NOT NULL AND expires_at < ?", now)
	if strings.TrimSpace(excludeToken) != "" {
		query = query.Where("token <> ?", normalizePrepregBindingToken(excludeToken))
	}
	return query.Unscoped().Delete(&models.PrepregBindingToken{}).Error
}

func invalidatePrepregBindingTokenTx(tx *gorm.DB, binding *models.PrepregBindingToken) error {
	if binding == nil || strings.TrimSpace(binding.ID) == "" {
		return nil
	}
	return tx.Unscoped().Delete(binding).Error
}

func CreatePrepregBindingTokenBatch(quantity int) (CreatePrepregBindingTokenBatchResponse, error) {
	if quantity < 1 || quantity > prepregBindingTokenMaxBatchSize {
		return CreatePrepregBindingTokenBatchResponse{}, &PrepregMaterialSpecValidationError{Message: "生成数量必须在 1 到 200 之间"}
	}

	response := CreatePrepregBindingTokenBatchResponse{
		Items: make([]PrepregBindingTokenBatchItem, 0, quantity),
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		now := time.Now()
		if err := cleanupExpiredPrepregBindingTokensTx(tx, now, ""); err != nil {
			return err
		}

		expiresAt := now.Add(prepregBindingTokenTTL)
		for index := 0; index < quantity; index++ {
			recordExpiresAt := expiresAt
			record := models.PrepregBindingToken{
				BaseModel: models.BaseModel{ID: uuid.NewString()},
				Token:     buildPrepregBindingTokenValue(now, index),
				ExpiresAt: &recordExpiresAt,
			}
			if err := tx.Create(&record).Error; err != nil {
				return err
			}

			itemExpiresAt := recordExpiresAt
			response.Items = append(response.Items, PrepregBindingTokenBatchItem{
				ID:        record.ID,
				Token:     record.Token,
				ExpiresAt: &itemExpiresAt,
			})
		}

		return nil
	})
	if err != nil {
		return CreatePrepregBindingTokenBatchResponse{}, err
	}

	return response, nil
}

func GetPrepregBindingTokenState(token string) (PrepregBindingTokenLookupResult, error) {
	normalizedToken := normalizePrepregBindingToken(token)
	if !IsValidPrepregBindingToken(normalizedToken) {
		return PrepregBindingTokenLookupResult{}, &PrepregMaterialSpecValidationError{Message: "绑定二维码无效，请重新生成"}
	}
	if err := cleanupExpiredPrepregBindingTokensTx(db.DB, time.Now(), normalizedToken); err != nil {
		return PrepregBindingTokenLookupResult{}, err
	}

	var binding models.PrepregBindingToken
	err := db.DB.Preload("BoundSpec").Preload("BoundRollInstance").Where("token = ?", normalizedToken).First(&binding).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return PrepregBindingTokenLookupResult{}, &PrepregMaterialSpecValidationError{Message: "绑定二维码无效，请重新生成"}
	}
	if err != nil {
		return PrepregBindingTokenLookupResult{}, err
	}

	now := time.Now()
	if isExpiredUnboundPrepregBindingToken(binding, now) {
		if err := invalidatePrepregBindingTokenTx(db.DB, &binding); err != nil {
			return PrepregBindingTokenLookupResult{}, err
		}
		return PrepregBindingTokenLookupResult{}, ErrPrepregBindingTokenExpired
	}
	if strings.TrimSpace(binding.BoundSpecID) == "" && strings.TrimSpace(binding.BoundRollInstanceID) == "" {
		return PrepregBindingTokenLookupResult{
			Token:     binding.Token,
			Status:    PrepregBindingTokenStatusUnbound,
			ExpiresAt: binding.ExpiresAt,
		}, nil
	}
	if strings.TrimSpace(binding.BoundRollInstanceID) != "" {
		if binding.BoundRollInstance == nil {
			if err := invalidatePrepregBindingTokenTx(db.DB, &binding); err != nil {
				return PrepregBindingTokenLookupResult{}, err
			}
			return PrepregBindingTokenLookupResult{}, &PrepregMaterialSpecValidationError{Message: "绑定二维码无效，请重新生成"}
		}
		return mapPrepregRollInstanceToBindingTokenResult(binding, binding.BoundRollInstance), nil
	}
	if binding.BoundSpec == nil {
		if err := invalidatePrepregBindingTokenTx(db.DB, &binding); err != nil {
			return PrepregBindingTokenLookupResult{}, err
		}
		return PrepregBindingTokenLookupResult{}, &PrepregMaterialSpecValidationError{Message: "绑定二维码无效，请重新生成"}
	}

	specCode := ""
	specName := ""
	if binding.BoundSpec != nil {
		specCode = strings.TrimSpace(binding.BoundSpec.Code)
		specName = strings.TrimSpace(binding.BoundSpec.DisplayAlias)
		if specName == "" {
			specName = strings.TrimSpace(binding.BoundSpec.Name)
		}
	}

	return PrepregBindingTokenLookupResult{
		Token:     binding.Token,
		Status:    PrepregBindingTokenStatusBound,
		SpecID:    strings.TrimSpace(binding.BoundSpecID),
		SpecCode:  specCode,
		SpecName:  specName,
		BoundAt:   binding.BoundAt,
		ExpiresAt: binding.ExpiresAt,
	}, nil
}

func bindPrepregBindingTokenToSpecTx(tx *gorm.DB, token string, spec models.PrepregMaterialSpec) error {
	normalizedToken := normalizePrepregBindingToken(token)
	if !IsValidPrepregBindingToken(normalizedToken) {
		return &PrepregMaterialSpecValidationError{Message: "绑定二维码无效，请重新生成"}
	}
	if strings.TrimSpace(spec.ID) == "" {
		return &PrepregMaterialSpecValidationError{Message: "绑定失败：规格 ID 不能为空"}
	}

	var binding models.PrepregBindingToken
	err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("token = ?", normalizedToken).First(&binding).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return &PrepregMaterialSpecValidationError{Message: "绑定二维码无效，请重新生成"}
	}
	if err != nil {
		return err
	}

	if isExpiredUnboundPrepregBindingToken(binding, time.Now()) {
		if err := invalidatePrepregBindingTokenTx(tx, &binding); err != nil {
			return err
		}
		return ErrPrepregBindingTokenExpired
	}
	if strings.TrimSpace(binding.BoundRollInstanceID) != "" {
		var roll models.PrepregRollInstance
		rollErr := tx.Select("id", "spec_id").Where("id = ?", strings.TrimSpace(binding.BoundRollInstanceID)).First(&roll).Error
		if errors.Is(rollErr, gorm.ErrRecordNotFound) {
			if err := invalidatePrepregBindingTokenTx(tx, &binding); err != nil {
				return err
			}
			return &PrepregMaterialSpecValidationError{Message: "绑定二维码无效，请重新生成"}
		}
		if rollErr != nil {
			return rollErr
		}
		if strings.TrimSpace(roll.SpecID) != strings.TrimSpace(spec.ID) {
			return ErrPrepregBindingTokenConflict
		}
		return nil
	}
	if strings.TrimSpace(binding.BoundSpecID) != "" {
		var boundSpec models.PrepregMaterialSpec
		boundSpecErr := tx.Select("id").Where("id = ?", strings.TrimSpace(binding.BoundSpecID)).First(&boundSpec).Error
		if errors.Is(boundSpecErr, gorm.ErrRecordNotFound) {
			if err := invalidatePrepregBindingTokenTx(tx, &binding); err != nil {
				return err
			}
			return &PrepregMaterialSpecValidationError{Message: "绑定二维码无效，请重新生成"}
		}
		if boundSpecErr != nil {
			return boundSpecErr
		}
	}

	if strings.TrimSpace(binding.BoundSpecID) == "" {
		roll, err := createPrepregRollInstanceFromSpecTx(tx, &binding, spec)
		if err != nil {
			return err
		}
		now := time.Now()
		binding.BoundSpecID = spec.ID
		binding.BoundRollInstanceID = roll.ID
		binding.BoundAt = &now
		return tx.Model(&binding).Updates(map[string]any{
			"bound_spec_id":          binding.BoundSpecID,
			"bound_roll_instance_id": binding.BoundRollInstanceID,
			"bound_at":               binding.BoundAt,
			"expires_at":             nil,
		}).Error
	}

	if strings.TrimSpace(binding.BoundSpecID) != strings.TrimSpace(spec.ID) {
		return ErrPrepregBindingTokenConflict
	}

	return nil
}

func BindPrepregBindingTokenToSpec(token string, specID string) (PrepregBindingTokenLookupResult, error) {
	normalizedSpecID := strings.TrimSpace(specID)
	if normalizedSpecID == "" {
		return PrepregBindingTokenLookupResult{}, &PrepregMaterialSpecValidationError{Message: "绑定失败：规格 ID 不能为空"}
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		if err := cleanupExpiredPrepregBindingTokensTx(tx, time.Now(), token); err != nil {
			return err
		}
		var spec models.PrepregMaterialSpec
		if err := tx.Where("id = ?", normalizedSpecID).First(&spec).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrPrepregMaterialSpecNotFound
			}
			return err
		}
		return bindPrepregBindingTokenToSpecTx(tx, token, spec)
	})
	if err != nil {
		return PrepregBindingTokenLookupResult{}, err
	}

	return GetPrepregBindingTokenState(token)
}
