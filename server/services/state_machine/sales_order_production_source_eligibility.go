package statemachine

// SalesOrderProductionSourceStatuses is shared by MRP, cutting and barcode issuance.
// Preparing production never requires a manual Scheduling transition.
func SalesOrderProductionSourceStatuses() []string {
	return []string{string(SalesOrderStatusPending), string(SalesOrderStatusScheduling), string(SalesOrderStatusInProgress)}
}

func IsSalesOrderStatusEligibleForProduction(raw string) bool {
	switch NormalizeSalesOrderStatus(raw) {
	case SalesOrderStatusPending, SalesOrderStatusScheduling, SalesOrderStatusInProgress:
		return true
	default:
		return false
	}
}
