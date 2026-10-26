package services

import "xdfc-server/authz"

// Each source owns its searchable fields, related records, access and destination.
// SQL identifiers below are application constants; user input is always bound.
type globalBusinessSearchSource struct {
	category            string
	table               string
	codeColumn          string
	titleColumns        []string
	searchColumns       []string
	relations           []globalBusinessSearchRelation
	requiredPermissions []string
	href                string
	parentTitle         string
	detailParameter     string
	condition           string
	userScopeColumns    []string
}

type globalBusinessSearchRelation struct {
	table            string
	foreignKey       string
	parentKey        string
	searchColumns    []string
	softDeleted      bool
	foreignKeyIsUUID bool
}

// Order and after-sales documents share the same persisted product identity.
// Keep these fields together so every document searches its displayed line data.
var globalBusinessSearchProductLineIdentityColumns = []string{
	"product_code", "product_model", "specification", "description",
	"product_display_title_snapshot", "product_display_subtitle_snapshot",
	"product_display_code_snapshot", "product_display_full_label_snapshot",
}

var globalBusinessSearchSalesOrderLineIdentityColumns = append(
	append([]string{}, globalBusinessSearchProductLineIdentityColumns...),
	"customer_part_no", "engineering_spec_name_snapshot", "model_code_snapshot", "job_no",
)

var globalBusinessSearchSources = []globalBusinessSearchSource{
	{
		category: "sales-order", table: "sales_orders", codeColumn: "order_no",
		titleColumns:  []string{"order_name", "customer_name", "order_no"},
		searchColumns: []string{"order_no", "order_name", "customer_name", "purchase_order_no", "barcode", "status", "requirements"},
		relations: []globalBusinessSearchRelation{
			{table: "sales_order_lines", foreignKey: "sales_order_id", foreignKeyIsUUID: true, parentKey: "id", searchColumns: globalBusinessSearchSalesOrderLineIdentityColumns},
			{table: "customers", foreignKey: "id", foreignKeyIsUUID: true, parentKey: "customer_id", searchColumns: []string{"code", "name"}, softDeleted: true},
		},
		requiredPermissions: []string{authz.MenuTrading}, href: "/trading/sales-orders", parentTitle: "销售订单 / Sales Orders", detailParameter: "detailId",
		condition: "LOWER(TRIM(COALESCE(record.classification, ''))) <> 'quote' AND LOWER(TRIM(COALESCE(record.type, ''))) <> 'quote'",
	},
	{
		category: "quote", table: "sales_orders", codeColumn: "order_no",
		titleColumns:  []string{"order_name", "customer_name", "order_no"},
		searchColumns: []string{"order_no", "order_name", "customer_name", "purchase_order_no", "barcode", "status", "requirements"},
		relations: []globalBusinessSearchRelation{
			{table: "sales_order_lines", foreignKey: "sales_order_id", foreignKeyIsUUID: true, parentKey: "id", searchColumns: globalBusinessSearchSalesOrderLineIdentityColumns},
			{table: "customers", foreignKey: "id", foreignKeyIsUUID: true, parentKey: "customer_id", searchColumns: []string{"code", "name"}, softDeleted: true},
		},
		requiredPermissions: []string{authz.MenuTrading}, href: "/quotes/orders", parentTitle: "报价单 / Quotes", detailParameter: "detailId",
		condition: "(LOWER(TRIM(record.classification)) = 'quote' OR LOWER(TRIM(record.type)) = 'quote')",
	},
	{
		category: "purchase-order", table: "purchase_orders", codeColumn: "order_no",
		titleColumns: []string{"supplier_name", "order_no"}, searchColumns: []string{"order_no", "supplier_name", "purchaser", "status"},
		relations: []globalBusinessSearchRelation{
			{table: "purchase_order_lines", foreignKey: "purchase_order_id", foreignKeyIsUUID: true, parentKey: "id", searchColumns: []string{"material_code", "material_name", "specification"}},
			{table: "suppliers", foreignKey: "id", foreignKeyIsUUID: true, parentKey: "supplier_id", searchColumns: []string{"code", "name"}, softDeleted: true},
		},
		requiredPermissions: []string{authz.MenuPurchase}, href: "/purchase/orders", parentTitle: "采购订单 / Purchase Orders", detailParameter: "detailId",
	},
	{
		category: "material", table: "materials", codeColumn: "code", titleColumns: []string{"name", "code"},
		searchColumns:       []string{"code", "name", "spec", "description"},
		requiredPermissions: []string{authz.MenuEngineering, authz.MenuTrading, authz.MenuWarehouse}, href: "/materials/all", parentTitle: "物料档案 / Materials",
	},
	{
		category: "product", table: "products", codeColumn: "sku", titleColumns: []string{"name", "sku"},
		searchColumns:       []string{"sku", "name", "model_code", "description"},
		requiredPermissions: []string{authz.MenuEngineering}, href: "/engineering/products", parentTitle: "产品型号 / Products", detailParameter: "productId",
	},
	{
		category: "customer", table: "customers", codeColumn: "code", titleColumns: []string{"name", "code"},
		searchColumns:       []string{"code", "name", "contact_person", "contact_phone", "email"},
		requiredPermissions: []string{authz.MenuTrading}, href: "/trading/customers", parentTitle: "客户档案 / Customers",
	},
	{
		category: "supplier", table: "suppliers", codeColumn: "code", titleColumns: []string{"name", "code"},
		searchColumns:       []string{"code", "name", "contact_person", "contact_phone", "email", "category", "status", "main_products"},
		requiredPermissions: []string{authz.MenuPurchase}, href: "/purchase/suppliers", parentTitle: "供应商 / Suppliers", detailParameter: "detailId",
	},
	{
		category: "inventory", table: "inventory", codeColumn: "material_code", titleColumns: []string{"material_name", "material_code"},
		searchColumns:       []string{"material_code", "material_name", "material_spec", "batch_no", "category_code"},
		requiredPermissions: []string{authz.MenuWarehouse}, href: "/warehouse", parentTitle: "库存记录 / Inventory",
	},
	{
		category: "sales-return", table: "sales_returns", codeColumn: "return_no", titleColumns: []string{"customer_name", "return_no"},
		searchColumns: []string{"return_no", "sales_order_no", "customer_name", "tracking_no"},
		relations: []globalBusinessSearchRelation{
			{table: "sales_return_lines", foreignKey: "sales_return_id", foreignKeyIsUUID: true, parentKey: "id", searchColumns: globalBusinessSearchProductLineIdentityColumns},
			{table: "sales_return_line_barcodes", foreignKey: "sales_return_id", foreignKeyIsUUID: true, parentKey: "id", searchColumns: []string{"raw_code", "normalized_code", "product_code_snapshot"}},
			{table: "customers", foreignKey: "id", foreignKeyIsUUID: true, parentKey: "customer_id", searchColumns: []string{"code", "name"}, softDeleted: true},
		},
		requiredPermissions: []string{authz.MenuTrading}, href: "/trading/sales-returns", parentTitle: "销售退货 / Sales Returns", detailParameter: "returnId",
	},
	{
		category: "sales-exchange", table: "sales_exchanges", codeColumn: "exchange_no", titleColumns: []string{"customer_name", "exchange_no"},
		searchColumns: []string{"exchange_no", "sales_order_no", "customer_name", "received_old_item_tracking_no", "replacement_tracking_no"},
		relations: []globalBusinessSearchRelation{
			{table: "sales_exchange_lines", foreignKey: "sales_exchange_id", foreignKeyIsUUID: true, parentKey: "id", searchColumns: append(append([]string{}, globalBusinessSearchProductLineIdentityColumns...), "replacement_product_code", "replacement_product_model")},
			{table: "sales_exchange_label_codes", foreignKey: "sales_exchange_id", foreignKeyIsUUID: true, parentKey: "id", searchColumns: []string{"raw_label_code", "normalized_label_code"}},
			{table: "customers", foreignKey: "id", foreignKeyIsUUID: true, parentKey: "customer_id", searchColumns: []string{"code", "name"}, softDeleted: true},
		},
		requiredPermissions: []string{authz.MenuTrading}, href: "/trading/sales-exchanges", parentTitle: "销售换货 / Sales Exchanges", detailParameter: "exchangeId",
	},
	{
		userScopeColumns: []string{"requester_id", "approver1_id", "approver2_id"},
		category:         "approval-request", table: "approval_requests", codeColumn: "target_id", titleColumns: []string{"reason", "module", "action"},
		searchColumns:       []string{"target_id", "reason", "module", "action", "status", "requester_id"},
		requiredPermissions: []string{authz.MenuApproval}, href: "/approval/requests", parentTitle: "审批请求 / Approval Requests", detailParameter: "requestId",
	},
}
