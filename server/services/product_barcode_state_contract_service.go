package services

// ProductBarcodeStateDefinitionContract describes one immutable state value that
// can appear in the product barcode execution state machine.
type ProductBarcodeStateDefinitionContract struct {
	Code        string `json:"code"`
	Kind        string `json:"kind"`
	Phase       string `json:"phase"`
	Trigger     string `json:"trigger"`
	SourceTable string `json:"sourceTable"`
	Tone        string `json:"tone"`
	IsTerminal  bool   `json:"isTerminal"`
}

// ProductBarcodeStateLocationDimensionContract describes a second-level
// location dimension under the production execution status.
type ProductBarcodeStateLocationDimensionContract struct {
	Code        string `json:"code"`
	Field       string `json:"field"`
	SourceTable string `json:"sourceTable"`
	Required    bool   `json:"required"`
}

// ProductBarcodeStateWritePolicyContract makes the write boundary explicit for
// UI surfaces that consume the contract.
type ProductBarcodeStateWritePolicyContract struct {
	Code        string `json:"code"`
	Description string `json:"description"`
}

// ProductBarcodeStateContractResponse is the read-only contract used by code
// center pages to display barcode status definitions without duplicating the
// state machine in frontend data files.
type ProductBarcodeStateContractResponse struct {
	InventoryStatuses         []ProductBarcodeStateDefinitionContract        `json:"inventoryStatuses"`
	ProductionStatuses        []ProductBarcodeStateDefinitionContract        `json:"productionStatuses"`
	ProductionLocationAnchors []ProductBarcodeStateLocationDimensionContract `json:"productionLocationAnchors"`
	WritePolicies             []ProductBarcodeStateWritePolicyContract       `json:"writePolicies"`
}

func GetProductBarcodeStateContract() ProductBarcodeStateContractResponse {
	return ProductBarcodeStateContractResponse{
		InventoryStatuses:         buildLinearBarcodeInventoryStatusContracts(),
		ProductionStatuses:        buildProductBarcodeProductionStateContracts(),
		ProductionLocationAnchors: buildProductBarcodeProductionLocationAnchorContracts(),
		WritePolicies:             buildProductBarcodeStateWritePolicyContracts(),
	}
}

func buildLinearBarcodeInventoryStatusContracts() []ProductBarcodeStateDefinitionContract {
	return []ProductBarcodeStateDefinitionContract{
		{
			Code:        LinearBarcodeInventoryStatusAvailable,
			Kind:        "inventory",
			Phase:       "print_inventory_available",
			Trigger:     "batch_print_success",
			SourceTable: "linear_barcode_inventory_items",
			Tone:        "success",
			IsTerminal:  false,
		},
		{
			Code:        LinearBarcodeInventoryStatusBound,
			Kind:        "inventory",
			Phase:       "product_bound",
			Trigger:     "product_binding_success",
			SourceTable: "linear_barcode_inventory_items",
			Tone:        "info",
			IsTerminal:  false,
		},
		{
			Code:        LinearBarcodeInventoryStatusExpired,
			Kind:        "inventory",
			Phase:       "inventory_expired",
			Trigger:     "expiry_refresh_before_query_or_binding",
			SourceTable: "linear_barcode_inventory_items",
			Tone:        "warning",
			IsTerminal:  true,
		},
		{
			Code:        LinearBarcodeInventoryStatusScrapped,
			Kind:        "inventory",
			Phase:       "inventory_scrapped",
			Trigger:     "batch_scrap_or_safety_rollback",
			SourceTable: "linear_barcode_inventory_items",
			Tone:        "danger",
			IsTerminal:  true,
		},
	}
}

func buildProductBarcodeProductionStateContracts() []ProductBarcodeStateDefinitionContract {
	return []ProductBarcodeStateDefinitionContract{
		{
			Code:        ProductBarcodeStateStatusNotStarted,
			Kind:        "production",
			Phase:       "production_pending",
			Trigger:     "state_initialized_or_route_step_advanced",
			SourceTable: "product_barcode_states",
			Tone:        "neutral",
			IsTerminal:  false,
		},
		{
			Code:        ProductBarcodeStateStatusInProgress,
			Kind:        "production",
			Phase:       "process_execution",
			Trigger:     "scan_start_or_operation_execution",
			SourceTable: "product_barcode_states",
			Tone:        "info",
			IsTerminal:  false,
		},
		{
			Code:        ProductBarcodeStateStatusCompleted,
			Kind:        "production",
			Phase:       "execution_complete",
			Trigger:     "scan_complete_or_operation_complete",
			SourceTable: "product_barcode_states",
			Tone:        "success",
			IsTerminal:  true,
		},
		{
			Code:        ProductBarcodeStateStatusHold,
			Kind:        "production",
			Phase:       "exception_waiting",
			Trigger:     "scan_hold_or_exception_hold",
			SourceTable: "product_barcode_states",
			Tone:        "warning",
			IsTerminal:  false,
		},
		{
			Code:        ProductBarcodeStateStatusRework,
			Kind:        "production",
			Phase:       "rework_handling",
			Trigger:     "scan_rework_or_quality_rework",
			SourceTable: "product_barcode_states",
			Tone:        "accent",
			IsTerminal:  false,
		},
	}
}

func buildProductBarcodeProductionLocationAnchorContracts() []ProductBarcodeStateLocationDimensionContract {
	return []ProductBarcodeStateLocationDimensionContract{
		{
			Code:        "ROUTE",
			Field:       "routeId",
			SourceTable: "production_routes",
			Required:    false,
		},
		{
			Code:        "ROUTE_STEP",
			Field:       "routeStepId",
			SourceTable: "production_route_steps",
			Required:    true,
		},
		{
			Code:        "L3_PROCESS",
			Field:       "currentProcessStepId",
			SourceTable: "process_steps",
			Required:    true,
		},
		{
			Code:        "CUSTODY_TRANSFER",
			Field:       "product_barcode_transfer_events",
			SourceTable: "product_barcode_transfer_events",
			Required:    false,
		},
	}
}

func buildProductBarcodeStateWritePolicyContracts() []ProductBarcodeStateWritePolicyContract {
	return []ProductBarcodeStateWritePolicyContract{
		{
			Code:        "STATUS_DEFINITIONS_READ_ONLY",
			Description: "Status definitions are immutable contract values; UI pages must not edit them.",
		},
		{
			Code:        "PRODUCTION_STATUS_WITH_LOCATION",
			Description: "Production status is the first-level state; routeStepId and currentProcessStepId are the second-level location under that state.",
		},
		{
			Code:        "ROUTE_STEP_IS_PRECISE_L3_ANCHOR",
			Description: "The UI may show L3 selection, but writes should persist the selected production route step because one process can appear in multiple route steps.",
		},
		{
			Code:        "WRITE_THROUGH_SCAN_OR_EXECUTION_COMMAND",
			Description: "Barcode state changes should be written by scan, execution, transfer, or audited correction commands rather than ad-hoc dictionary edits.",
		},
	}
}
