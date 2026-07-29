package services

import statemachine "xdfc-server/services/state_machine"

func listBusinessEventSourceCompatibilityStatuses(sourceCode string) []BusinessStatusDTO {
	switch sourceCode {
	case "SALES_ORDER":
		catalog := statemachine.SalesOrderStatusCatalog()
		statuses := make([]BusinessStatusDTO, 0, len(catalog))
		for _, item := range catalog {
			statuses = append(statuses, BusinessStatusDTO{
				Code:           string(item.Status),
				Label:          item.Label,
				Phase:          item.Phase,
				IsTerminal:     item.IsTerminal,
				DefaultResolve: item.DefaultResolve,
			})
		}
		return statuses
	case "PURCHASE_ORDER":
		catalog := statemachine.PurchaseOrderStatusCatalog()
		statuses := make([]BusinessStatusDTO, 0, len(catalog))
		for _, item := range catalog {
			statuses = append(statuses, BusinessStatusDTO{
				Code:           string(item.Status),
				Label:          item.Label,
				Phase:          item.Phase,
				IsTerminal:     item.IsTerminal,
				DefaultResolve: item.DefaultResolve,
			})
		}
		return statuses
	case "PRODUCTION_PLAN":
		return []BusinessStatusDTO{
			{Code: "SCHEDULED", Label: "已排产", Phase: "active", IsTerminal: false, DefaultResolve: false},
			{Code: "IN_PROGRESS", Label: "生产中", Phase: "active", IsTerminal: false, DefaultResolve: false},
			{Code: "COMPLETED", Label: "计划完成", Phase: "done", IsTerminal: true, DefaultResolve: true},
			{Code: "CANCELED", Label: "已取消", Phase: "cancelled", IsTerminal: true, DefaultResolve: true},
		}
	case "PRODUCTION_TASK":
		return []BusinessStatusDTO{
			{Code: "PENDING", Label: "待执行", Phase: "pending", IsTerminal: false, DefaultResolve: false},
			{Code: "RUNNING", Label: "执行中", Phase: "active", IsTerminal: false, DefaultResolve: false},
			{Code: "HOLD", Label: "已挂起", Phase: "custom", IsTerminal: false, DefaultResolve: false},
			{Code: "DONE", Label: "已完工", Phase: "done", IsTerminal: true, DefaultResolve: true},
		}
	case "PRODUCTION_OPERATION":
		return []BusinessStatusDTO{
			{Code: ProductBarcodeStateStatusNotStarted, Label: "待开始", Phase: "pending", IsTerminal: false, DefaultResolve: false},
			{Code: ProductBarcodeStateStatusInProgress, Label: "执行中", Phase: "active", IsTerminal: false, DefaultResolve: false},
			{Code: ProductBarcodeStateStatusCompleted, Label: "已完成", Phase: "done", IsTerminal: true, DefaultResolve: true},
			{Code: ProductBarcodeStateStatusHold, Label: "已挂起", Phase: "custom", IsTerminal: false, DefaultResolve: false},
			{Code: ProductBarcodeStateStatusRework, Label: "返工中", Phase: "custom", IsTerminal: false, DefaultResolve: false},
		}
	case "PRODUCTION_OUTSOURCE":
		return []BusinessStatusDTO{
			{Code: OutsourceOrderStatusReleased, Label: "已下达", Phase: "active", IsTerminal: false, DefaultResolve: false},
			{Code: OutsourceOrderStatusSent, Label: "已发出", Phase: "active", IsTerminal: false, DefaultResolve: false},
			{Code: OutsourceOrderStatusReturned, Label: "已退回", Phase: "active", IsTerminal: false, DefaultResolve: false},
			{Code: businessEventOutsourceStatusInspectionAccepted, Label: "检验合格入库", Phase: "done", IsTerminal: true, DefaultResolve: true},
			{Code: businessEventOutsourceStatusInspectionConcession, Label: "检验让步接收", Phase: "done", IsTerminal: true, DefaultResolve: true},
			{Code: businessEventOutsourceStatusInspectionRework, Label: "检验返工", Phase: "custom", IsTerminal: false, DefaultResolve: false},
			{Code: businessEventOutsourceStatusInspectionScrap, Label: "检验报废", Phase: "done", IsTerminal: true, DefaultResolve: true},
			{Code: OutsourceOrderStatusClosed, Label: "已关闭", Phase: "done", IsTerminal: true, DefaultResolve: true},
			{Code: OutsourceOrderStatusCanceled, Label: "已取消", Phase: "cancelled", IsTerminal: true, DefaultResolve: true},
		}
	default:
		return []BusinessStatusDTO{}
	}
}

func indexBusinessEventSourceCompatibilityStatuses(sourceCode string) map[string]BusinessStatusDTO {
	statuses := listBusinessEventSourceCompatibilityStatuses(sourceCode)
	index := make(map[string]BusinessStatusDTO, len(statuses))
	for _, status := range statuses {
		index[status.Code] = status
	}
	return index
}

func buildBusinessStatusWriteDTOs(statuses []BusinessStatusDTO) []BusinessStatusWriteDTO {
	result := make([]BusinessStatusWriteDTO, 0, len(statuses))
	for index, status := range statuses {
		result = append(result, BusinessStatusWriteDTO{
			ID:    status.ID,
			Order: index,
			Code:  status.Code,
		})
	}
	return result
}
