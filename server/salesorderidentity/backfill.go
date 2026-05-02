package salesorderidentity

import (
	"fmt"
	"strings"
	"time"
	"xdfc-server/models"

	"gorm.io/gorm"
)

type BlankSalesOrderNoPlan struct {
	ID             string
	CustomerName   string
	Barcode        string
	DerivedOrderNo string
}

type blankSalesOrderNoCandidate struct {
	ID           string
	CustomerName string
	Barcode      string
}

func PlanBlankSalesOrderNoBackfill(database *gorm.DB) ([]BlankSalesOrderNoPlan, error) {
	var candidates []blankSalesOrderNoCandidate
	if err := database.Table("sales_orders").
		Select("id", "customer_name", "barcode").
		Where("deleted_at IS NULL AND (order_no IS NULL OR length(trim(order_no)) = 0)").
		Order("created_at ASC, id ASC").
		Scan(&candidates).Error; err != nil {
		return nil, err
	}
	if len(candidates) == 0 {
		return []BlankSalesOrderNoPlan{}, nil
	}

	plans := make([]BlankSalesOrderNoPlan, 0, len(candidates))
	planByOrderNo := make(map[string]BlankSalesOrderNoPlan, len(candidates))
	blankIDs := make([]string, 0, len(candidates))
	derivedOrderNos := make([]string, 0, len(candidates))
	for _, candidate := range candidates {
		derivedOrderNo := strings.TrimSpace(candidate.Barcode)
		if derivedOrderNo == "" {
			return nil, fmt.Errorf("sales order %s (%s) cannot backfill orderNo: barcode is blank", candidate.ID, candidate.CustomerName)
		}
		plan := BlankSalesOrderNoPlan{
			ID:             candidate.ID,
			CustomerName:   candidate.CustomerName,
			Barcode:        derivedOrderNo,
			DerivedOrderNo: derivedOrderNo,
		}
		if existing, exists := planByOrderNo[derivedOrderNo]; exists && existing.ID != plan.ID {
			return nil, fmt.Errorf("blank sales order orderNo backfill collision: orders %s and %s both derive to %s", existing.ID, plan.ID, derivedOrderNo)
		}
		planByOrderNo[derivedOrderNo] = plan
		plans = append(plans, plan)
		blankIDs = append(blankIDs, plan.ID)
		derivedOrderNos = append(derivedOrderNos, derivedOrderNo)
	}

	var conflictingOrders []models.SalesOrder
	if err := database.Select("id", "order_no", "customer_name").
		Where("deleted_at IS NULL AND order_no IN ? AND id NOT IN ?", derivedOrderNos, blankIDs).
		Find(&conflictingOrders).Error; err != nil {
		return nil, err
	}
	if len(conflictingOrders) > 0 {
		conflict := conflictingOrders[0]
		return nil, fmt.Errorf("blank sales order orderNo backfill collision: derived orderNo %s already belongs to sales order %s (%s)", conflict.OrderNo, conflict.ID, conflict.CustomerName)
	}

	return plans, nil
}

func ApplyBlankSalesOrderNoBackfill(database *gorm.DB) ([]BlankSalesOrderNoPlan, error) {
	plans, err := PlanBlankSalesOrderNoBackfill(database)
	if err != nil {
		return nil, err
	}
	if len(plans) == 0 {
		return plans, nil
	}

	err = database.Transaction(func(tx *gorm.DB) error {
		for _, plan := range plans {
			if err := tx.Model(&models.SalesOrder{}).
				Where("id = ? AND deleted_at IS NULL AND (order_no IS NULL OR length(trim(order_no)) = 0)", plan.ID).
				Updates(map[string]any{
					"order_no":   plan.DerivedOrderNo,
					"updated_at": time.Now(),
				}).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return plans, nil
}
