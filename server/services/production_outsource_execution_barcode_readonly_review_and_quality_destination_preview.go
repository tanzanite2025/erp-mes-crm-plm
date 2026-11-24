package services

import (
	"errors"
	"fmt"
	"math"
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
)

type ProductionOutsourceExecutionDestinationPreview struct {
	RouteStepID    string `json:"routeStepId"`
	ProcessName    string `json:"processName"`
	RouteCompleted bool   `json:"routeCompleted"`
	Status         string `json:"status"`
}

type ProductionOutsourceExecutionBarcodeReview struct {
	LineID            string                                                    `json:"lineId"`
	ProductBarcode    string                                                    `json:"productBarcode"`
	ProductName       string                                                    `json:"productName"`
	Action            string                                                    `json:"action"`
	CycleNo           int                                                       `json:"cycleNo"`
	InspectionRoundNo int                                                       `json:"inspectionRoundNo"`
	RouteStepID       string                                                    `json:"routeStepId"`
	ProcessName       string                                                    `json:"processName"`
	Status            string                                                    `json:"status"`
	AvailableQuantity float64                                                   `json:"availableQuantity"`
	UOM               string                                                    `json:"uom"`
	Destinations      map[string]ProductionOutsourceExecutionDestinationPreview `json:"destinations"`
}

func ReviewProductionOutsourceExecutionBarcode(lineID, barcode, action string) (ProductionOutsourceExecutionBarcodeReview, error) {
	return defaultProductionOutsourcingService.ReviewProductionOutsourceExecutionBarcode(lineID, barcode, action)
}

// Review only reads existing facts. It neither creates an inspection task nor
// changes inventory, process state, custody or execution records.
func (s *ProductionOutsourcingService) ReviewProductionOutsourceExecutionBarcode(lineID, barcode, action string) (ProductionOutsourceExecutionBarcodeReview, error) {
	barcode = normalizeProductBarcodeValue(barcode)
	action = strings.ToUpper(strings.TrimSpace(action))
	if barcode == "" || (action != "SEND" && action != "RETURN" && action != "INSPECT") {
		return ProductionOutsourceExecutionBarcodeReview{}, fmt.Errorf("%w: 请扫描产品条码并选择委外动作", ErrInvalidOutsourceOrder)
	}
	database := s.txManager.DB()
	var line models.OutsourceOrderLine
	if err := database.First(&line, "id = ?", strings.TrimSpace(lineID)).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ProductionOutsourceExecutionBarcodeReview{}, ErrOutsourceOrderNotFound
		}
		return ProductionOutsourceExecutionBarcodeReview{}, err
	}
	var order models.OutsourceOrder
	if err := database.First(&order, "id = ?", line.OutsourceOrderID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ProductionOutsourceExecutionBarcodeReview{}, ErrOutsourceOrderNotFound
		}
		return ProductionOutsourceExecutionBarcodeReview{}, err
	}
	state, _, err := loadOutsourceBarcodeStateForLineTx(database, order, line, barcode)
	if err != nil {
		return ProductionOutsourceExecutionBarcodeReview{}, err
	}
	step, err := loadProductionRouteStepTx(database, state.RouteStepID)
	if err != nil {
		return ProductionOutsourceExecutionBarcodeReview{}, err
	}
	if step.RouteID != state.RouteID || step.BranchOperationID != state.CurrentBranchOperationID {
		return ProductionOutsourceExecutionBarcodeReview{}, fmt.Errorf("%w: 产品当前路线步骤与工序不一致", ErrInvalidOutsourceOrder)
	}
	available := 1.0
	cycleNo := 0
	inspectionRoundNo := 0
	if action == "SEND" || action == "RETURN" {
		cycleNo, err = resolveOutsourceTransferCycleNoTx(database, line.ID, barcode, action)
		if err != nil {
			return ProductionOutsourceExecutionBarcodeReview{}, err
		}
		if action == "RETURN" {
			var sent models.OutsourceTransfer
			if err := database.Where("outsource_order_line_id = ? AND product_barcode = ? AND transfer_type = ? AND cycle_no = ?", line.ID, barcode, OutsourceTransferTypeSend, cycleNo).First(&sent).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return ProductionOutsourceExecutionBarcodeReview{}, fmt.Errorf("%w: 当前条码未在该委外周期发出", ErrInvalidOutsourceOrder)
				}
				return ProductionOutsourceExecutionBarcodeReview{}, err
			}
			available = math.Min(available, sent.Quantity)
		}
	}
	if action == "INSPECT" {
		identity, err := resolveNextOutsourceInspectionIdentityTx(database, line.ID, barcode)
		if err != nil {
			return ProductionOutsourceExecutionBarcodeReview{}, err
		}
		cycleNo = identity.CycleNo
		inspectionRoundNo = identity.InspectionRoundNo
		var returned models.OutsourceTransfer
		if err := database.Where("outsource_order_line_id = ? AND product_barcode = ? AND transfer_type = ? AND cycle_no = ?", line.ID, barcode, OutsourceTransferTypeReturn, cycleNo).First(&returned).Error; err != nil {
			return ProductionOutsourceExecutionBarcodeReview{}, err
		}
		available = math.Min(available, returned.Quantity)
	}
	if available <= outsourceQuantityEpsilon {
		return ProductionOutsourceExecutionBarcodeReview{}, fmt.Errorf("%w: 该委外明细没有可办理数量", ErrInvalidOutsourceOrder)
	}
	available = math.Min(1, available)
	if action == "INSPECT" {
		err = validateOutsourceInspectionAllowed(database, order, line, OutsourceInspectionRequest{ProductBarcode: barcode, InspectedQuantity: available, UOM: line.UOM, Result: "PASS", Disposition: "ACCEPT"})
	} else {
		err = validateOutsourceTransferAllowed(database, order, line, action, OutsourceTransferRequest{ProductBarcode: barcode, Quantity: available, UOM: line.UOM})
	}
	if err != nil {
		return ProductionOutsourceExecutionBarcodeReview{}, err
	}
	processName := ""
	if step.BranchOperation != nil {
		processName = step.BranchOperation.Name
	}
	response := ProductionOutsourceExecutionBarcodeReview{LineID: line.ID, ProductBarcode: barcode, ProductName: firstNonEmpty(state.ProductName, line.ProductName), Action: action, CycleNo: cycleNo, InspectionRoundNo: inspectionRoundNo, RouteStepID: state.RouteStepID, ProcessName: processName, Status: state.Status, AvailableQuantity: available, UOM: line.UOM, Destinations: map[string]ProductionOutsourceExecutionDestinationPreview{}}
	if action == "INSPECT" {
		for _, disposition := range []string{"ACCEPT", "CONCESSION", "REWORK", "SCRAP"} {
			destination, err := previewProductionOutsourceInspectionDestination(database, order, state, processName, disposition)
			if err != nil {
				return ProductionOutsourceExecutionBarcodeReview{}, err
			}
			response.Destinations[disposition] = destination
		}
	}
	return response, nil
}

func previewProductionOutsourceInspectionDestination(database *gorm.DB, order models.OutsourceOrder, state models.ProductBarcodeState, currentName, disposition string) (ProductionOutsourceExecutionDestinationPreview, error) {
	preview := ProductionOutsourceExecutionDestinationPreview{RouteStepID: state.RouteStepID, ProcessName: currentName, Status: ProductBarcodeStateStatusHold}
	target, _, err := resolveProductionQualityRoutingTargetForDispositionTx(database, state.RouteStepID, disposition)
	if err != nil {
		return preview, err
	}
	command := buildOutsourceInspectionScanCommand(order, state, OutsourceInspectionRequest{Disposition: disposition}, target)
	if command.Action == ProductionOperationActionRework {
		preview.Status = ProductBarcodeStateStatusRework
	}
	if !shouldAdvanceProductionScanRoute(command) {
		return preview, nil
	}
	next, found, err := resolveProductionScanRouteTargetStepTx(database, command, models.ProductionOperationExecution{RouteID: state.RouteID, RouteStepID: state.RouteStepID})
	if err != nil {
		return preview, err
	}
	if !found {
		preview.RouteCompleted = true
		preview.Status = ProductBarcodeStateStatusCompleted
		return preview, nil
	}
	preview.RouteStepID = next.ID
	preview.ProcessName = next.BranchOperationID
	if next.BranchOperation != nil {
		preview.ProcessName = next.BranchOperation.Name
	}
	preview.Status = ProductBarcodeStateStatusNotStarted
	if command.Action == ProductionOperationActionRework {
		preview.Status = ProductBarcodeStateStatusRework
	}
	return preview, nil
}
