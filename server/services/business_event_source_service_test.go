package services

import (
	"fmt"
	"testing"
	"xdfc-server/db"
	"xdfc-server/models"
	statemachine "xdfc-server/services/state_machine"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupBusinessEventSourceServiceTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	testDB, err := gorm.Open(
		sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())),
		&gorm.Config{},
	)
	require.NoError(t, err)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE business_event_sources (
			id text PRIMARY KEY,
			created_at datetime,
			updated_at datetime,
			deleted_at datetime,
			code text NOT NULL,
			name text NOT NULL,
			module text,
			entity text,
			enabled numeric,
			description text,
			config blob
		)
	`).Error)

	prev := db.DB
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = prev
	})

	return testDB
}

func seedBusinessEventSource(t *testing.T, testDB *gorm.DB) models.BusinessEventSource {
	t.Helper()

	source := models.BusinessEventSource{
		BaseModel:   models.BaseModel{ID: "source-1"},
		Code:        "SALES_ORDER",
		Name:        "Sales Order",
		Module:      "Trading",
		Entity:      "ORDER",
		Enabled:     true,
		Description: "default source",
		Config: []byte(`{
			"actions":[{"id":"action-1","order":0,"code":"CREATED","name":"Created","kind":"created"}],
			"statuses":[{"id":"status-1","order":0,"code":"Pending","label":"Pending","phase":"pending","isTerminal":false,"defaultResolve":false}],
			"fields":[{"id":"field-1","order":0,"key":"orderNo","label":"Order No","path":"orderNo","type":"string","templateKey":"OrderNo","templateEnabled":true,"dynamicResolver":false}],
			"dynamicResolvers":[{"id":"resolver-1","order":0,"code":"createdBy","label":"Created By","path":"createdBy","type":"user"}],
			"defaultActionUrlTemplate":"/trading/orders/[OrderId]"
		}`),
	}
	require.NoError(t, testDB.Create(&source).Error)
	return source
}

func TestUpdateBusinessEventSource_RejectsIdentityMutation(t *testing.T) {
	testDB := setupBusinessEventSourceServiceTestDB(t)
	existing := seedBusinessEventSource(t, testDB)

	_, err := UpdateBusinessEventSource(existing.ID, models.BusinessEventSource{
		Code:        "SALES_ORDER_V2",
		Name:        "Sales Order Renamed",
		Module:      existing.Module,
		Entity:      existing.Entity,
		Enabled:     existing.Enabled,
		Description: existing.Description,
		Config:      existing.Config,
	})
	require.Error(t, err)
	require.Contains(t, err.Error(), "immutable")
}

func TestUpdateBusinessEventSource_RejectsNestedIdentityMutation(t *testing.T) {
	cases := []struct {
		name   string
		config string
	}{
		{
			name: "action code",
			config: `{
				"actions":[{"id":"action-1","order":0,"code":"CREATED_V2","name":"Created","kind":"created"}],
				"statuses":[{"id":"status-1","order":0,"code":"Pending","label":"Pending","phase":"pending","isTerminal":false,"defaultResolve":false}],
				"fields":[{"id":"field-1","order":0,"key":"orderNo","label":"Order No","path":"orderNo","type":"string","templateKey":"OrderNo","templateEnabled":true,"dynamicResolver":false}],
				"dynamicResolvers":[{"id":"resolver-1","order":0,"code":"createdBy","label":"Created By","path":"createdBy","type":"user"}],
				"defaultActionUrlTemplate":"/trading/orders/[OrderId]"
			}`,
		},
		{
			name: "action kind",
			config: `{
				"actions":[{"id":"action-1","order":0,"code":"CREATED","name":"Created","kind":"updated"}],
				"statuses":[{"id":"status-1","order":0,"code":"Pending","label":"Pending","phase":"pending","isTerminal":false,"defaultResolve":false}],
				"fields":[{"id":"field-1","order":0,"key":"orderNo","label":"Order No","path":"orderNo","type":"string","templateKey":"OrderNo","templateEnabled":true,"dynamicResolver":false}],
				"dynamicResolvers":[{"id":"resolver-1","order":0,"code":"createdBy","label":"Created By","path":"createdBy","type":"user"}],
				"defaultActionUrlTemplate":"/trading/orders/[OrderId]"
			}`,
		},
		{
			name: "status code",
			config: `{
				"actions":[{"id":"action-1","order":0,"code":"CREATED","name":"Created","kind":"created"}],
				"statuses":[{"id":"status-1","order":0,"code":"Waiting","label":"Pending","phase":"pending","isTerminal":false,"defaultResolve":false}],
				"fields":[{"id":"field-1","order":0,"key":"orderNo","label":"Order No","path":"orderNo","type":"string","templateKey":"OrderNo","templateEnabled":true,"dynamicResolver":false}],
				"dynamicResolvers":[{"id":"resolver-1","order":0,"code":"createdBy","label":"Created By","path":"createdBy","type":"user"}],
				"defaultActionUrlTemplate":"/trading/orders/[OrderId]"
			}`,
		},
		{
			name: "field path",
			config: `{
				"actions":[{"id":"action-1","order":0,"code":"CREATED","name":"Created","kind":"created"}],
				"statuses":[{"id":"status-1","order":0,"code":"Pending","label":"Pending","phase":"pending","isTerminal":false,"defaultResolve":false}],
				"fields":[{"id":"field-1","order":0,"key":"orderNo","label":"Order No","path":"payload.orderNo","type":"string","templateKey":"OrderNo","templateEnabled":true,"dynamicResolver":false}],
				"dynamicResolvers":[{"id":"resolver-1","order":0,"code":"createdBy","label":"Created By","path":"createdBy","type":"user"}],
				"defaultActionUrlTemplate":"/trading/orders/[OrderId]"
			}`,
		},
		{
			name: "resolver type",
			config: `{
				"actions":[{"id":"action-1","order":0,"code":"CREATED","name":"Created","kind":"created"}],
				"statuses":[{"id":"status-1","order":0,"code":"Pending","label":"Pending","phase":"pending","isTerminal":false,"defaultResolve":false}],
				"fields":[{"id":"field-1","order":0,"key":"orderNo","label":"Order No","path":"orderNo","type":"string","templateKey":"OrderNo","templateEnabled":true,"dynamicResolver":false}],
				"dynamicResolvers":[{"id":"resolver-1","order":0,"code":"createdBy","label":"Created By","path":"createdBy","type":"group"}],
				"defaultActionUrlTemplate":"/trading/orders/[OrderId]"
			}`,
		},
		{
			name: "persisted action deletion",
			config: `{
				"actions":[],
				"statuses":[{"id":"status-1","order":0,"code":"Pending","label":"Pending","phase":"pending","isTerminal":false,"defaultResolve":false}],
				"fields":[{"id":"field-1","order":0,"key":"orderNo","label":"Order No","path":"orderNo","type":"string","templateKey":"OrderNo","templateEnabled":true,"dynamicResolver":false}],
				"dynamicResolvers":[{"id":"resolver-1","order":0,"code":"createdBy","label":"Created By","path":"createdBy","type":"user"}],
				"defaultActionUrlTemplate":"/trading/orders/[OrderId]"
			}`,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			testDB := setupBusinessEventSourceServiceTestDB(t)
			existing := seedBusinessEventSource(t, testDB)

			_, err := UpdateBusinessEventSource(existing.ID, models.BusinessEventSource{
				Code:        existing.Code,
				Name:        existing.Name,
				Module:      existing.Module,
				Entity:      existing.Entity,
				Enabled:     existing.Enabled,
				Description: existing.Description,
				Config:      []byte(tc.config),
			})
			require.Error(t, err)
			require.Contains(t, err.Error(), "immutable")
		})
	}
}

func TestUpdateBusinessEventSource_AllowsDisplayFieldMutation(t *testing.T) {
	testDB := setupBusinessEventSourceServiceTestDB(t)
	existing := seedBusinessEventSource(t, testDB)

	updated, err := UpdateBusinessEventSource(existing.ID, models.BusinessEventSource{
		Code:        existing.Code,
		Name:        "Sales Order Lifecycle",
		Module:      existing.Module,
		Entity:      existing.Entity,
		Enabled:     false,
		Description: "updated description",
		Config: []byte(`{
			"actions":[{"id":"action-1","order":0,"code":"CREATED","name":"Created Event","kind":"created"}],
			"statuses":[{"id":"status-1","order":0,"code":"Pending","label":"Pending Review","phase":"pending","isTerminal":false,"defaultResolve":false}],
			"fields":[{"id":"field-1","order":0,"key":"orderNo","label":"Order Number","path":"orderNo","type":"string","templateKey":"OrderNo","templateEnabled":true,"dynamicResolver":false}],
			"dynamicResolvers":[{"id":"resolver-1","order":0,"code":"createdBy","label":"Created By User","path":"createdBy","type":"user"}],
			"defaultActionUrlTemplate":"/trading/orders/[OrderId]"
		}`),
	})
	require.NoError(t, err)
	require.Equal(t, "Sales Order Lifecycle", updated.Name)
	require.False(t, updated.Enabled)
	require.Equal(t, "updated description", updated.Description)
}

func TestEnsureDefaultBusinessEventSources_SeedsDefaultSources(t *testing.T) {
	testDB := setupBusinessEventSourceServiceTestDB(t)

	require.NoError(t, EnsureDefaultBusinessEventSources())

	var sources []models.BusinessEventSource
	require.NoError(t, testDB.Order("code asc").Find(&sources).Error)
	require.Len(t, sources, 4)
	require.ElementsMatch(t, []string{
		"SALES_ORDER",
		"PURCHASE_ORDER",
		"PRODUCTION_PLAN",
		"PRODUCTION_TASK",
	}, []string{
		sources[0].Code,
		sources[1].Code,
		sources[2].Code,
		sources[3].Code,
	})
}

func TestEnsureDefaultBusinessEventSources_BackfillsMissingDefaultSeeds(t *testing.T) {
	testDB := setupBusinessEventSourceServiceTestDB(t)
	seedBusinessEventSource(t, testDB)

	require.NoError(t, EnsureDefaultBusinessEventSources())

	var sources []models.BusinessEventSource
	require.NoError(t, testDB.Order("code asc").Find(&sources).Error)
	require.Len(t, sources, 4)

	var purchase models.BusinessEventSource
	require.NoError(t, testDB.Where("code = ?", "PURCHASE_ORDER").First(&purchase).Error)
	require.Equal(t, "采购订单", purchase.Name)
	require.Equal(t, "Trading", purchase.Module)
	require.Equal(t, "ORDER", purchase.Entity)
	require.True(t, purchase.Enabled)

	var production models.BusinessEventSource
	require.NoError(t, testDB.Where("code = ?", "PRODUCTION_TASK").First(&production).Error)
	require.Equal(t, "生产任务", production.Name)
	require.Equal(t, "Production", production.Module)
	require.Equal(t, "SYSTEM", production.Entity)
	require.True(t, production.Enabled)

	var productionPlan models.BusinessEventSource
	require.NoError(t, testDB.Where("code = ?", "PRODUCTION_PLAN").First(&productionPlan).Error)
	require.Equal(t, "生产计划", productionPlan.Name)
	require.Equal(t, "Production", productionPlan.Module)
	require.Equal(t, "SYSTEM", productionPlan.Entity)
	require.True(t, productionPlan.Enabled)

	config, err := unmarshalBusinessEventSourceConfig(productionPlan.Config)
	require.NoError(t, err)
	require.Equal(t, []string{"SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELED"}, []string{
		config.Statuses[0].Code,
		config.Statuses[1].Code,
		config.Statuses[2].Code,
		config.Statuses[3].Code,
	})
}

func TestDefaultSalesOrderEventSourceUsesStateMachineStatuses(t *testing.T) {
	config, err := unmarshalBusinessEventSourceConfig(defaultSalesOrderEventSourceConfig())
	require.NoError(t, err)

	catalog := statemachine.SalesOrderStatusCatalog()
	require.Len(t, config.Statuses, len(catalog))
	for index, item := range catalog {
		require.Equal(t, string(item.Status), config.Statuses[index].Code)
		require.Equal(t, item.Phase, config.Statuses[index].Phase)
		require.Equal(t, item.IsTerminal, config.Statuses[index].IsTerminal)
		require.Equal(t, item.DefaultResolve, config.Statuses[index].DefaultResolve)
	}
}
