package statemachine

import (
	"github.com/stretchr/testify/require"
	"testing"
)

func TestSalesOrderManualTransitionsCannotSetDerivedProductionOrCompletionStatus(t *testing.T) {
	for _, current := range SalesOrderStatusCatalog() {
		for _, target := range []string{"Scheduling", "InProgress", "Done"} {
			require.False(t, CanTransitionSalesOrderStatus(string(current.Status), target).Allowed)
		}
	}
	require.True(t, CanTransitionSalesOrderStatus("Draft", "Pending").Allowed)
	require.True(t, CanTransitionSalesOrderStatus("Pending", "Canceled").Allowed)
	require.True(t, CanTransitionSalesOrderStatus("Scheduling", "Canceled").Allowed)
	require.False(t, CanTransitionSalesOrderStatus("InProgress", "Canceled").Allowed)
}

func TestSalesOrderProductionSourceEligibilityRequiresConfirmationAndActiveFulfillment(t *testing.T) {
	require.Equal(t, []string{"Pending", "Scheduling", "InProgress"}, SalesOrderProductionSourceStatuses())
	for _, status := range []string{"Pending", "Scheduling", "InProgress"} {
		require.True(t, IsSalesOrderStatusEligibleForProduction(status))
	}
	for _, status := range []string{"", "Draft", "Done", "Canceled", "unknown"} {
		require.False(t, IsSalesOrderStatusEligibleForProduction(status))
	}
}
