package services

import (
	"fmt"
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
)

// Call only while holding the parent order lock. Compare to frozen values, so
// ordinary edits cannot adopt a source changed by another write path.
func validateSalesOrderMutationAgainstActiveProductionMaterialCoverageTx(tx *gorm.DB, next *models.SalesOrder) error {
	var coverage []models.ProductionMaterialIssuanceActiveSourceCoverage
	if err := tx.Where("sales_order_id = ?", next.ID).Find(&coverage).Error; err != nil {
		return err
	}
	if len(coverage) == 0 {
		return nil
	}
	blocked := func() error {
		return fmt.Errorf("%w: 订单已关联有效生产领料单；变更产品、数量、成品单位、客户归属或移除来源前，请先撤回原领料单并重新核对", ErrProductionMaterialIssuanceOrderProtected)
	}
	if next.IsDeleted || next.DeletedAt.Valid || next.Status == "Canceled" || strings.EqualFold(next.Classification, "quote") || strings.EqualFold(next.Type, "quote") {
		return blocked()
	}
	if next.Status != "Pending" && next.Status != "Scheduling" && next.Status != "InProgress" && next.Status != "Done" {
		return blocked()
	}
	lineByID := make(map[uint]models.SalesOrderLine)
	for _, line := range next.Lines {
		lineByID[line.ID] = line
	}
	for _, covered := range coverage {
		var snapshot models.ProductionMaterialIssuanceSourceSnapshot
		if err := tx.First(&snapshot, "id = ? AND document_id = ? AND sales_order_id = ? AND sales_order_line_id = ?", covered.SourceSnapshotID, covered.DocumentID, covered.SalesOrderID, covered.SalesOrderLineID).Error; err != nil {
			return fmt.Errorf("[CRITICAL] active production material coverage has no matching frozen source: %w", err)
		}
		line, exists := lineByID[covered.SalesOrderLineID]
		if !exists || next.CustomerID != snapshot.CustomerID || line.ProductID != snapshot.ProductID || line.Qty != snapshot.FinishedQty || !strings.EqualFold(strings.TrimSpace(line.UOM), strings.TrimSpace(snapshot.FinishedUnit)) {
			return blocked()
		}
	}
	return nil
}

func rejectSalesOrderRemovalWithActiveProductionMaterialCoverageTx(tx *gorm.DB, orderID string) error {
	var count int64
	if err := tx.Model(&models.ProductionMaterialIssuanceActiveSourceCoverage{}).Where("sales_order_id = ?", orderID).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return fmt.Errorf("%w: 订单已有有效生产领料单，请先撤回原领料单", ErrProductionMaterialIssuanceOrderProtected)
	}
	return nil
}
