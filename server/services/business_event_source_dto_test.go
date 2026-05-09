package services

import (
	"testing"
	"time"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
)

func TestMapBusinessEventSourceRequestToModel_AcceptsCodeOnlyStatuses(t *testing.T) {
	model, err := MapBusinessEventSourceRequestToModel(BusinessEventSourceRequest{
		Code:        "SALES_ORDER",
		Name:        "销售订单",
		Module:      "Trading",
		Entity:      "ORDER",
		Enabled:     true,
		Description: "销售订单事件源",
		Config: BusinessEventSourceWriteConfigDTO{
			Actions: []BusinessEventActionDTO{
				{ID: "action-1", Order: 0, Code: "CREATED", Name: "新建", Kind: "created"},
			},
			Statuses: []BusinessStatusWriteDTO{
				{ID: "status-1", Order: 0, Code: "Pending"},
				{ID: "status-2", Order: 1, Code: "Done"},
			},
			Fields: []BusinessEventFieldDTO{
				{ID: "field-1", Order: 0, Key: "orderId", Label: "订单ID", Path: "orderId", Type: "string"},
			},
			DynamicResolvers:         []BusinessDynamicResolverDTO{},
			DefaultActionURLTemplate: "/trading/orders/[OrderId]",
		},
	})
	require.NoError(t, err)

	config, err := unmarshalBusinessEventSourceStoredConfig(model.Config)
	require.NoError(t, err)
	require.Len(t, config.Statuses, 2)
	require.Equal(t, "Pending", config.Statuses[0].Code)
	require.Empty(t, config.Statuses[0].Label)
	require.Empty(t, config.Statuses[0].Phase)
	require.False(t, config.Statuses[0].IsTerminal)
	require.False(t, config.Statuses[0].DefaultResolve)
}

func TestMapBusinessEventSourceToResponse_HydratesCompatibilityStatusFields(t *testing.T) {
	model := models.BusinessEventSource{
		BaseModel: models.BaseModel{
			ID:        "source-1",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		Code:        "SALES_ORDER",
		Name:        "销售订单",
		Module:      "Trading",
		Entity:      "ORDER",
		Enabled:     true,
		Description: "销售订单事件源",
		Config: []byte(`{
			"actions":[{"id":"action-1","order":0,"code":"CREATED","name":"新建","kind":"created"}],
			"statuses":[
				{"id":"status-1","order":0,"code":"Pending"},
				{"id":"status-2","order":1,"code":"Done"}
			],
			"fields":[{"id":"field-1","order":0,"key":"orderId","label":"订单ID","path":"orderId","type":"string","templateKey":"OrderId","templateEnabled":false,"dynamicResolver":false}],
			"dynamicResolvers":[],
			"defaultActionUrlTemplate":"/trading/orders/[OrderId]"
		}`),
	}

	storedConfig, err := unmarshalBusinessEventSourceStoredConfig(model.Config)
	require.NoError(t, err)
	require.Len(t, storedConfig.Statuses, 2)
	require.Equal(t, "Pending", storedConfig.Statuses[0].Code)
	require.Empty(t, storedConfig.Statuses[0].Label)
	require.Empty(t, storedConfig.Statuses[0].Phase)
	require.False(t, storedConfig.Statuses[0].IsTerminal)
	require.False(t, storedConfig.Statuses[0].DefaultResolve)
	require.Equal(t, "Done", storedConfig.Statuses[1].Code)
	require.Empty(t, storedConfig.Statuses[1].Label)
	require.Empty(t, storedConfig.Statuses[1].Phase)
	require.False(t, storedConfig.Statuses[1].IsTerminal)
	require.False(t, storedConfig.Statuses[1].DefaultResolve)

	response, err := MapBusinessEventSourceToResponse(model)
	require.NoError(t, err)
	require.Len(t, response.Config.Statuses, 2)

	expected := listBusinessEventSourceCompatibilityStatuses("SALES_ORDER")
	expectedByCode := make(map[string]BusinessStatusDTO, len(expected))
	for _, item := range expected {
		expectedByCode[item.Code] = item
	}

	pending := response.Config.Statuses[0]
	require.Equal(t, expectedByCode[pending.Code].Label, pending.Label)
	require.Equal(t, expectedByCode[pending.Code].Phase, pending.Phase)
	require.Equal(t, expectedByCode[pending.Code].IsTerminal, pending.IsTerminal)
	require.Equal(t, expectedByCode[pending.Code].DefaultResolve, pending.DefaultResolve)

	done := response.Config.Statuses[1]
	require.Equal(t, expectedByCode[done.Code].Label, done.Label)
	require.Equal(t, expectedByCode[done.Code].Phase, done.Phase)
	require.Equal(t, expectedByCode[done.Code].IsTerminal, done.IsTerminal)
	require.Equal(t, expectedByCode[done.Code].DefaultResolve, done.DefaultResolve)
}
