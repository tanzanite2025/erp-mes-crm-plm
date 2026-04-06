package services

import (
	"errors"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

type ResolvedProduct struct {
	ID        string `json:"id"`
	SKU       string `json:"sku"`
	Name      string `json:"name"`
	ModelCode string `json:"modelCode"`
	Status    string `json:"status"`
}

type ResolvedMaterial struct {
	ID     string `json:"id"`
	Code   string `json:"code"`
	Name   string `json:"name"`
	Status string `json:"status"`
}

func ResolveScanProductByModelCode(modelCode string) (*ResolvedProduct, error) {
	normalized := strings.TrimSpace(modelCode)
	if normalized == "" || db.DB == nil {
		return nil, nil
	}

	var product models.Product
	err := db.DB.
		Select("id", "sku", "name", "model_code", "status").
		Where("model_code = ? AND status <> ?", normalized, "Deleted").
		Order("updated_at desc").
		First(&product).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &ResolvedProduct{
		ID:        product.ID,
		SKU:       product.SKU,
		Name:      product.Name,
		ModelCode: product.ModelCode,
		Status:    product.Status,
	}, nil
}

func ResolveScanMaterialByCode(materialCode string) (*ResolvedMaterial, error) {
	normalized := strings.ToUpper(strings.TrimSpace(materialCode))
	if normalized == "" || db.DB == nil {
		return nil, nil
	}

	var material models.Material
	err := db.DB.
		Select("id", "code", "name", "status").
		Where("code = ?", normalized).
		First(&material).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &ResolvedMaterial{
		ID:     material.ID,
		Code:   material.Code,
		Name:   material.Name,
		Status: material.Status,
	}, nil
}
