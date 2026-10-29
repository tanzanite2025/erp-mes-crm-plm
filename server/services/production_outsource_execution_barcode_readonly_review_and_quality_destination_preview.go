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
	state, _, err := loadOutsourceBarcodeStateForLineTx(database, line, barcode)
	if err != nil {
		return ProductionOutsourceExecutionBarcodeReview{}, err
	}
	step, err := loadProductionRouteStepTx(database, state.RouteStepID)
	if err != nil {
		return ProductionOutsourceExecutionBarcodeReview{}, err
	}
	if step.RouteID != state.RouteID || step.ProcessStepID != state.CurrentProcessStepID {
		return ProductionOutsourceExecutionBarcodeReview{}, fmt.Errorf("%w: 产品当前路线步骤与工序不一致", ErrInvalidOutsourceOrder)
	}
	available := line.Quantity - line.SentQuantity
	if action == "RETURN" || action == "INSPECT" {
		factType := OutsourceTransferTypeSend
		available = line.SentQuantity - line.ReturnedQuantity
		if action == "INSPECT" {
			factType = OutsourceTransferTypeReturn
			available = line.ReturnedQuantity - line.AcceptedQuantity - line.ReworkQuantity - line.ScrapQuantity
		}
		var fact models.OutsourceTransfer
		if err := database.Where("outsource_order_line_id = ? AND product_barcode = ? AND transfer_type = ?", line.ID, barcode, factType).First(&fact).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ProductionOutsourceExecutionBarcodeReview{}, fmt.Errorf("%w: 当前条码未在该委外明细完成前置收发", ErrInvalidOutsourceOrder)
			}
			return ProductionOutsourceExecutionBarcodeReview{}, err
		}
		available = math.Min(available, fact.Quantity)
	}
	if available <= outsourceQuantityEpsilon {
		return ProductionOutsourceExecutionBarcodeReview{}, fmt.Errorf("%w: 该委外明细没有可办理数量", ErrInvalidOutsourceOrder)
	}
	if action == "INSPECT" {
		err = validateOutsourceInspectionAllowed(database, order, line, OutsourceInspectionRequest{ProductBarcode: barcode, InspectedQuantity: math.Min(1, available), UOM: line.UOM, Result: "PASS", Disposition: "ACCEPT"})
	} else {
		err = validateOutsourceTransferAllowed(database, order, line, action, OutsourceTransferRequest{ProductBarcode: barcode, Quantity: math.Min(1, available), UOM: line.UOM})
	}
	if err != nil {
		return ProductionOutsourceExecutionBarcodeReview{}, err
	}
	processName := line.ProcessName
	if step.ProcessStep != nil {
		processName = step.ProcessStep.Name
	}
	response := ProductionOutsourceExecutionBarcodeReview{LineID: line.ID, ProductBarcode: barcode, ProductName: firstNonEmpty(state.ProductName, line.ProductName), Action: action, RouteStepID: state.RouteStepID, ProcessName: processName, Status: state.Status, AvailableQuantity: available, UOM: line.UOM, Destinations: map[string]ProductionOutsourceExecutionDestinationPreview{}}
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
	preview.ProcessName = next.ProcessStepID
	if next.ProcessStep != nil {
		preview.ProcessName = next.ProcessStep.Name
	}
	preview.Status = ProductBarcodeStateStatusNotStarted
	if command.Action == ProductionOperationActionRework {
		preview.Status = ProductBarcodeStateStatusRework
	}
	return preview, nil
}
