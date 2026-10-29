package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"xdfc-server/models"

	"gorm.io/gorm"
)

func productionMaterialIssuanceConsistentReadOptions(database *gorm.DB) []*sql.TxOptions {
	if database.Dialector.Name() == "postgres" {
		return []*sql.TxOptions{{Isolation: sql.LevelRepeatableRead, ReadOnly: true}}
	}
	return nil
}

func GetProductionMaterialIssuanceDocument(ctx context.Context, database *gorm.DB, documentID string) (ProductionMaterialIssuanceDocumentDetail, error) {
	var detail ProductionMaterialIssuanceDocumentDetail
	if database == nil || documentID == "" {
		return detail, ErrProductionMaterialIssuanceInvalidRequest
	}
	err := database.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var err error
		detail, err = getProductionMaterialIssuanceDocumentDetailTx(tx, documentID)
		return err
	}, productionMaterialIssuanceConsistentReadOptions(database)...)
	return detail, err
}

func getProductionMaterialIssuanceDocumentDetailTx(tx *gorm.DB, documentID string) (ProductionMaterialIssuanceDocumentDetail, error) {
	detail := ProductionMaterialIssuanceDocumentDetail{Sources: make([]ProductionMaterialIssuanceReviewedSourceBasis, 0)}
	if err := tx.First(&detail.Document, "id = ?", documentID).Error; err != nil {
		return detail, err
	}
	var snapshots []models.ProductionMaterialIssuanceSourceSnapshot
	if err := tx.Where("document_id = ?", documentID).Order("position ASC, id ASC").Find(&snapshots).Error; err != nil {
		return detail, err
	}
	if len(snapshots) == 0 {
		return detail, fmt.Errorf("[CRITICAL] production material issuance document has no source snapshots")
	}
	for _, snapshot := range snapshots {
		var basis ProductionMaterialIssuanceReviewedSourceBasis
		if err := json.Unmarshal(snapshot.Snapshot, &basis); err != nil {
			return detail, fmt.Errorf("[CRITICAL] invalid production material issuance snapshot: %w", err)
		}
		fingerprint, err := fingerprintProductionMaterialIssuanceReviewedBasis(basis)
		if err != nil {
			return detail, err
		}
		if fingerprint != snapshot.BasisFingerprint || basis.BasisFingerprint != fingerprint || basis.SalesOrderLineID != snapshot.SalesOrderLineID || basis.SalesOrderID != snapshot.SalesOrderID || basis.OrderVersion != snapshot.OrderVersion || basis.FinishedQty != snapshot.FinishedQty || basis.ProductID != snapshot.ProductID || basis.CustomerID != snapshot.CustomerID || basis.FinishedUnit != snapshot.FinishedUnit {
			return detail, fmt.Errorf("[CRITICAL] production material issuance frozen basis does not match its source identity")
		}
		detail.Sources = append(detail.Sources, basis)
	}
	return detail, nil
}

func ListProductionMaterialIssuanceDocuments(ctx context.Context, database *gorm.DB, status string, page, pageSize int) (ProductionMaterialIssuanceDocumentList, error) {
	result := ProductionMaterialIssuanceDocumentList{Items: make([]models.ProductionMaterialIssuanceDocument, 0), Page: page, PageSize: pageSize}
	if database == nil || page < 1 || pageSize < 1 || pageSize > 200 || (status != "" && status != models.ProductionMaterialIssuanceDispatched && status != models.ProductionMaterialIssuanceWithdrawn) {
		return result, ErrProductionMaterialIssuanceInvalidRequest
	}
	if page-1 > int(^uint(0)>>1)/pageSize {
		return result, ErrProductionMaterialIssuanceInvalidRequest
	}
	err := database.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		query := tx.Model(&models.ProductionMaterialIssuanceDocument{})
		if status != "" {
			query = query.Where("status = ?", status)
		}
		if err := query.Count(&result.Total).Error; err != nil {
			return err
		}
		return query.Order("dispatched_at DESC, id ASC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&result.Items).Error
	}, productionMaterialIssuanceConsistentReadOptions(database)...)
	return result, err
}
