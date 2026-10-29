package services

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func productionMaterialIssuanceSerializableTransactionOptions(database *gorm.DB) []*sql.TxOptions {
	if database.Dialector.Name() == "postgres" {
		return []*sql.TxOptions{{Isolation: sql.LevelSerializable}}
	}
	return nil
}

func ReviewProductionMaterialIssuanceSources(ctx context.Context, database *gorm.DB, selections []ProductionMaterialIssuanceSourceSelection) ([]ProductionMaterialIssuanceReviewedSourceBasis, error) {
	if database == nil {
		return nil, fmt.Errorf("%w: database is required", ErrProductionMaterialIssuanceInvalidRequest)
	}
	var result []ProductionMaterialIssuanceReviewedSourceBasis
	options := []*sql.TxOptions(nil)
	if database.Dialector.Name() == "postgres" {
		options = []*sql.TxOptions{{Isolation: sql.LevelRepeatableRead, ReadOnly: true}}
	}
	err := database.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var err error
		result, err = reviewProductionMaterialIssuanceSourcesWithinTransaction(tx, selections, time.Now().UTC(), false)
		return err
	}, options...)
	return result, err
}

func normalizeProductionMaterialIssuanceDispatchRequest(request ProductionMaterialIssuanceDispatchRequest) (ProductionMaterialIssuanceDispatchRequest, error) {
	request.CommandID = strings.TrimSpace(request.CommandID)
	if request.CommandID == "" || len(request.CommandID) > 100 {
		return request, fmt.Errorf("%w: commandId is required (maximum 100 characters)", ErrProductionMaterialIssuanceInvalidRequest)
	}
	selections := make([]ProductionMaterialIssuanceSourceSelection, 0, len(request.Sources))
	expectations := make(map[uint]ProductionMaterialIssuanceDispatchSourceExpectation)
	for _, source := range request.Sources {
		source.SalesOrderID, source.BOMID = strings.TrimSpace(source.SalesOrderID), strings.TrimSpace(source.BOMID)
		source.BasisFingerprint = strings.ToLower(strings.TrimSpace(source.BasisFingerprint))
		fingerprint, err := hex.DecodeString(source.BasisFingerprint)
		if err != nil || len(fingerprint) != sha256.Size || source.ExpectedOrderVersion <= 0 || source.ExpectedBOMVersion <= 0 {
			return request, fmt.Errorf("%w: 请先核对完整来源版本和配方依据", ErrProductionMaterialIssuanceInvalidRequest)
		}
		selections = append(selections, source.ProductionMaterialIssuanceSourceSelection)
		expectations[source.SalesOrderLineID] = source
	}
	normalized, err := normalizeProductionMaterialIssuanceSourceSelections(selections)
	if err != nil {
		return request, err
	}
	request.Sources = make([]ProductionMaterialIssuanceDispatchSourceExpectation, 0, len(normalized))
	for _, selection := range normalized {
		request.Sources = append(request.Sources, expectations[selection.SalesOrderLineID])
	}
	return request, nil
}

func fingerprintProductionMaterialIssuanceCommand(intent string, payload any) (string, error) {
	raw, err := json.Marshal(struct {
		Intent  string
		Payload any
	}{intent, payload})
	if err != nil {
		return "", err
	}
	hash := sha256.Sum256(raw)
	return hex.EncodeToString(hash[:]), nil
}

func claimProductionMaterialIssuanceCommandReceiptTx(tx *gorm.DB, actorID, commandID, fingerprint, documentID string, now time.Time) (models.ProductionMaterialIssuanceCommandReceipt, bool, error) {
	receipt := models.ProductionMaterialIssuanceCommandReceipt{ID: uuid.NewString(), ActorID: actorID, CommandID: commandID, RequestFingerprint: fingerprint, DocumentID: documentID, CompletedAt: now}
	result := tx.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "actor_id"}, {Name: "command_id"}}, DoNothing: true}).Create(&receipt)
	if result.Error != nil {
		return receipt, false, result.Error
	}
	if result.RowsAffected == 1 {
		return receipt, false, nil
	}
	receipt = models.ProductionMaterialIssuanceCommandReceipt{}
	if err := tx.Where("actor_id = ? AND command_id = ?", actorID, commandID).First(&receipt).Error; err != nil {
		return receipt, false, err
	}
	if receipt.RequestFingerprint != fingerprint {
		return receipt, true, ErrProductionMaterialIssuanceCommandReused
	}
	return receipt, true, nil
}

func normalizeProductionMaterialIssuanceCommandActor(actor ProductionMaterialIssuanceCommandActor) (ProductionMaterialIssuanceCommandActor, error) {
	actor.UserID, actor.Username = strings.TrimSpace(actor.UserID), strings.TrimSpace(actor.Username)
	if actor.UserID == "" || len(actor.UserID) > 100 {
		return actor, fmt.Errorf("%w: 已登录操作者身份必填", ErrProductionMaterialIssuanceInvalidRequest)
	}
	if actor.Username == "" {
		actor.Username = actor.UserID
	}
	return actor, nil
}

func DispatchProductionMaterialIssuanceDocument(ctx context.Context, database *gorm.DB, actor ProductionMaterialIssuanceCommandActor, request ProductionMaterialIssuanceDispatchRequest) (ProductionMaterialIssuanceDocumentDetail, error) {
	var detail ProductionMaterialIssuanceDocumentDetail
	if database == nil {
		return detail, fmt.Errorf("%w: database is required", ErrProductionMaterialIssuanceInvalidRequest)
	}
	actor, err := normalizeProductionMaterialIssuanceCommandActor(actor)
	if err != nil {
		return detail, err
	}
	request, err = normalizeProductionMaterialIssuanceDispatchRequest(request)
	if err != nil {
		return detail, err
	}
	fingerprint, err := fingerprintProductionMaterialIssuanceCommand("DISPATCH", request)
	if err != nil {
		return detail, err
	}
	err = database.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		now := time.Now().UTC()
		documentID := uuid.NewString()
		receipt, replayed, err := claimProductionMaterialIssuanceCommandReceiptTx(tx, actor.UserID, request.CommandID, fingerprint, documentID, now)
		if err != nil {
			return err
		}
		if replayed {
			detail, err = getProductionMaterialIssuanceDocumentDetailTx(tx, receipt.DocumentID)
			return err
		}
		selections := make([]ProductionMaterialIssuanceSourceSelection, 0, len(request.Sources))
		for _, source := range request.Sources {
			selections = append(selections, source.ProductionMaterialIssuanceSourceSelection)
		}
		bases, err := reviewProductionMaterialIssuanceSourcesWithinTransaction(tx, selections, now, true)
		if err != nil {
			return err
		}
		for index, basis := range bases {
			expected := request.Sources[index]
			if expected.ExpectedOrderVersion != basis.OrderVersion || expected.ExpectedBOMVersion != basis.BOM.Version || expected.BasisFingerprint != basis.BasisFingerprint {
				return fmt.Errorf("%w: 订单 %s 第 %d 行已变化，请重新核对后下发", ErrProductionMaterialIssuanceBasisChanged, basis.OrderNo, basis.LineNo)
			}
		}
		document := models.ProductionMaterialIssuanceDocument{ID: documentID, DocumentNo: "PMI-" + strings.ToUpper(strings.ReplaceAll(documentID, "-", "")),
			Version: 1, Status: models.ProductionMaterialIssuanceDispatched, WarehouseCategoryCode: ProductionMaterialInventoryWarehouseCategoryCode, DispatchedBy: actor.UserID, DispatchedAt: now}
		if err := tx.Create(&document).Error; err != nil {
			return err
		}
		for index, basis := range bases {
			raw, err := json.Marshal(basis)
			if err != nil {
				return err
			}
			snapshot := models.ProductionMaterialIssuanceSourceSnapshot{ID: uuid.NewString(), DocumentID: documentID, SalesOrderID: basis.SalesOrderID, SalesOrderLineID: basis.SalesOrderLineID,
				Position: index + 1, OrderVersion: basis.OrderVersion, CustomerID: basis.CustomerID, ProductID: basis.ProductID, FinishedQty: basis.FinishedQty, FinishedUnit: basis.FinishedUnit,
				BasisFingerprint: basis.BasisFingerprint, Snapshot: raw}
			if err := tx.Create(&snapshot).Error; err != nil {
				return err
			}
			coverage := models.ProductionMaterialIssuanceActiveSourceCoverage{SalesOrderLineID: basis.SalesOrderLineID, SalesOrderID: basis.SalesOrderID, DocumentID: documentID, SourceSnapshotID: snapshot.ID}
			result := tx.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "sales_order_line_id"}}, DoNothing: true}).Create(&coverage)
			if result.Error != nil {
				return result.Error
			}
			if result.RowsAffected != 1 {
				return fmt.Errorf("%w: 明细 %d 已由其他单据下发", ErrProductionMaterialIssuanceSourceCovered, basis.SalesOrderLineID)
			}
		}
		auditPayload, err := json.Marshal(map[string]any{"documentNo": document.DocumentNo, "commandId": request.CommandID, "sourceCount": len(bases), "warehouseCategoryCode": document.WarehouseCategoryCode})
		if err != nil {
			return err
		}
		if err := recordLegacyAuditEntryTx(tx, "ProductionMaterialIssuance", documentID, "DISPATCH", auditPayload, actor.Username, actor.UserID, actor.IP); err != nil {
			return err
		}
		detail = ProductionMaterialIssuanceDocumentDetail{Document: document, Sources: bases}
		return nil
	}, productionMaterialIssuanceSerializableTransactionOptions(database)...)
	if err != nil {
		return ProductionMaterialIssuanceDocumentDetail{}, classifyProductionMaterialIssuanceDatabaseConflict(err)
	}
	return detail, nil
}

func WithdrawProductionMaterialIssuanceDocument(ctx context.Context, database *gorm.DB, actor ProductionMaterialIssuanceCommandActor, request ProductionMaterialIssuanceWithdrawalRequest) (ProductionMaterialIssuanceDocumentDetail, error) {
	var detail ProductionMaterialIssuanceDocumentDetail
	if database == nil {
		return detail, fmt.Errorf("%w: database is required", ErrProductionMaterialIssuanceInvalidRequest)
	}
	actor, err := normalizeProductionMaterialIssuanceCommandActor(actor)
	if err != nil {
		return detail, err
	}
	request.CommandID, request.DocumentID, request.Reason = strings.TrimSpace(request.CommandID), strings.TrimSpace(request.DocumentID), strings.TrimSpace(request.Reason)
	if request.CommandID == "" || len(request.CommandID) > 100 || request.DocumentID == "" || request.ExpectedVersion <= 0 || request.Reason == "" || len(request.Reason) > 2000 {
		return detail, fmt.Errorf("%w: 撤回须提供命令标识、单据版本及原因", ErrProductionMaterialIssuanceInvalidRequest)
	}
	fingerprint, err := fingerprintProductionMaterialIssuanceCommand("WITHDRAW", request)
	if err != nil {
		return detail, err
	}
	err = database.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		now := time.Now().UTC()
		receipt, replayed, err := claimProductionMaterialIssuanceCommandReceiptTx(tx, actor.UserID, request.CommandID, fingerprint, request.DocumentID, now)
		if err != nil {
			return err
		}
		if replayed {
			detail, err = getProductionMaterialIssuanceDocumentDetailTx(tx, receipt.DocumentID)
			return err
		}
		var document models.ProductionMaterialIssuanceDocument
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&document, "id = ?", request.DocumentID).Error; err != nil {
			return err
		}
		if document.Version != request.ExpectedVersion || document.Status != models.ProductionMaterialIssuanceDispatched || document.WarehouseExecutionAt != nil {
			return fmt.Errorf("%w: 单据已变化或已存在仓库执行事实，不能撤回", ErrProductionMaterialIssuanceBasisChanged)
		}
		var movementCount int64
		if err := tx.Model(&models.ProductionMaterialIssuanceWarehouseMovement{}).Where("document_id = ?", document.ID).Count(&movementCount).Error; err != nil {
			return err
		}
		if movementCount > 0 {
			return fmt.Errorf("%w: 已存在正式仓库收发事实，不能撤回", ErrProductionMaterialIssuanceBasisChanged)
		}
		var sourceCount int64
		if err := tx.Model(&models.ProductionMaterialIssuanceSourceSnapshot{}).Where("document_id = ?", document.ID).Count(&sourceCount).Error; err != nil {
			return err
		}
		deleted := tx.Where("document_id = ?", document.ID).Delete(&models.ProductionMaterialIssuanceActiveSourceCoverage{})
		if deleted.Error != nil {
			return deleted.Error
		}
		if sourceCount == 0 || deleted.RowsAffected != sourceCount {
			return fmt.Errorf("[CRITICAL] production material issuance coverage is inconsistent")
		}
		if err := tx.Model(&document).Updates(map[string]any{"status": models.ProductionMaterialIssuanceWithdrawn, "version": document.Version + 1, "withdrawn_by": actor.UserID, "withdrawn_at": now, "withdrawal_reason": request.Reason}).Error; err != nil {
			return err
		}
		auditPayload, err := json.Marshal(map[string]any{"commandId": request.CommandID, "reason": request.Reason, "previousVersion": request.ExpectedVersion, "nextVersion": request.ExpectedVersion + 1})
		if err != nil {
			return err
		}
		if err := recordLegacyAuditEntryTx(tx, "ProductionMaterialIssuance", document.ID, "WITHDRAW", auditPayload, actor.Username, actor.UserID, actor.IP); err != nil {
			return err
		}
		detail, err = getProductionMaterialIssuanceDocumentDetailTx(tx, document.ID)
		return err
	}, productionMaterialIssuanceSerializableTransactionOptions(database)...)
	if err != nil {
		return ProductionMaterialIssuanceDocumentDetail{}, classifyProductionMaterialIssuanceDatabaseConflict(err)
	}
	return detail, nil
}

func classifyProductionMaterialIssuanceDatabaseConflict(err error) error {
	var sqlState interface{ SQLState() string }
	if errors.As(err, &sqlState) && (sqlState.SQLState() == "40001" || sqlState.SQLState() == "40P01") {
		return fmt.Errorf("%w: 并发操作改变了依据，请使用原命令标识重试", ErrProductionMaterialIssuanceBasisChanged)
	}
	return err
}
