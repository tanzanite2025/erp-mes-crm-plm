package services

// This is the composition boundary: adding a domain integration changes this
// wiring and that domain's adapter, without adding branches to the approval engine.
var configuredBusinessApprovalIntegrations = []struct {
	module              string
	policyDefinition    BusinessApprovalPolicyConfigurationDefinition
	transactionContract ApprovalBusinessTransactionContract
}{
	{module: "Quality", policyDefinition: qualityStandardApprovalPolicyConfigurationDefinition(), transactionContract: qualityStandardApprovalBusinessTransactionContract{}},
}

var defaultApprovalService = createApprovalServiceWithConfiguredBusinessIntegrations()

func createApprovalServiceWithConfiguredBusinessIntegrations() *ApprovalService {
	contracts := make(map[string]ApprovalBusinessTransactionContract, len(configuredBusinessApprovalIntegrations))
	for _, integration := range configuredBusinessApprovalIntegrations {
		contracts[integration.module] = integration.transactionContract
	}
	return NewApprovalServiceWithBusinessTransactionContracts(contracts)
}

// Only domains with a real submission/decision contract are offered. Editable
// notification-source metadata cannot invent new approval integrations.
func listSupportedBusinessApprovalPolicyConfigurationDefinitions() []BusinessApprovalPolicyConfigurationDefinition {
	definitions := make([]BusinessApprovalPolicyConfigurationDefinition, 0, len(configuredBusinessApprovalIntegrations))
	for _, integration := range configuredBusinessApprovalIntegrations {
		definitions = append(definitions, integration.policyDefinition)
	}
	return definitions
}
