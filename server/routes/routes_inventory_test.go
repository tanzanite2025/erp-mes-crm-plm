package routes

import (
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestRegisterInventoryRoutesRegistersSummaryEndpoints(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	api := r.Group("/api/v1")
	authorized := api.Group("")

	registerInventoryRoutes(authorized)

	var hasValuation bool
	var hasAlertSummary bool

	for _, route := range r.Routes() {
		if route.Method == "GET" && route.Path == "/api/v1/inventory/valuation" {
			hasValuation = strings.Contains(route.Handler, "GetInventoryValuationHandler")
		}
		if route.Method == "GET" && route.Path == "/api/v1/inventory/alerts/summary" {
			hasAlertSummary = strings.Contains(route.Handler, "GetInventoryAlertSummaryHandler")
		}
	}

	require.True(t, hasValuation, "expected GET /api/v1/inventory/valuation to be registered with GetInventoryValuationHandler")
	require.True(t, hasAlertSummary, "expected GET /api/v1/inventory/alerts/summary to be registered with GetInventoryAlertSummaryHandler")
}

func TestRegisterInventoryRoutesRegistersWarehouseMasterDataSearchEndpoint(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	api := r.Group("/api/v1")
	authorized := api.Group("")

	registerInventoryRoutes(authorized)

	var hasSearch bool
	for _, route := range r.Routes() {
		if route.Method == "GET" && route.Path == "/api/v1/warehouse/master-data/search" {
			hasSearch = strings.Contains(route.Handler, "SearchWarehouseMasterDataHandler")
		}
	}

	require.True(t, hasSearch, "expected GET /api/v1/warehouse/master-data/search to be registered")
}

func TestRegisterInventoryRoutesRegistersShipmentPreparationEndpoints(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	api := r.Group("/api/v1")
	authorized := api.Group("")

	registerInventoryRoutes(authorized)

	var hasShipmentDemands bool
	var hasVirtualLock bool
	for _, route := range r.Routes() {
		if route.Method == "GET" && route.Path == "/api/v1/inventory/shipment-demands" {
			hasShipmentDemands = strings.Contains(route.Handler, "GetShipmentDemandsHandler")
		}
		if route.Method == "POST" && route.Path == "/api/v1/inventory/shipment/virtual-lock" {
			hasVirtualLock = strings.Contains(route.Handler, "PrepareVirtualShipmentHandler")
		}
	}

	require.True(t, hasShipmentDemands, "expected GET /api/v1/inventory/shipment-demands to be registered with GetShipmentDemandsHandler")
	require.True(t, hasVirtualLock, "expected POST /api/v1/inventory/shipment/virtual-lock to be registered with PrepareVirtualShipmentHandler")
}

func TestRegisterInventoryRoutesRegistersStocktakePatchEndpoint(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	api := r.Group("/api/v1")
	authorized := api.Group("")

	registerInventoryRoutes(authorized)

	var hasStocktakePatch bool
	for _, route := range r.Routes() {
		if route.Method == "PATCH" && route.Path == "/api/v1/stocktakes/items/:id" {
			hasStocktakePatch = strings.Contains(route.Handler, "PatchStocktakeItemHandler")
		}
	}

	require.True(t, hasStocktakePatch, "expected PATCH /api/v1/stocktakes/items/:id to be registered with PatchStocktakeItemHandler")
}

func TestRegisterInventoryRoutesRegistersPackagingAssemblyEndpoints(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	api := r.Group("/api/v1")
	authorized := api.Group("")

	registerInventoryRoutes(authorized)

	var hasList bool
	var hasCreateSession bool
	var hasGetSession bool
	for _, route := range r.Routes() {
		if route.Method == "GET" && route.Path == "/api/v1/warehouse/packaging-assemblies" {
			hasList = strings.Contains(route.Handler, "GetPackagingAssembliesHandler")
		}
		if route.Method == "POST" && route.Path == "/api/v1/warehouse/packaging-assemblies/capture-sessions" {
			hasCreateSession = strings.Contains(route.Handler, "CreatePackagingAssemblyCaptureSessionHandler")
		}
		if route.Method == "GET" && route.Path == "/api/v1/warehouse/packaging-assemblies/capture-sessions/:sessionId" {
			hasGetSession = strings.Contains(route.Handler, "GetPackagingAssemblyCaptureSessionHandler")
		}
	}

	require.True(t, hasList, "expected GET /api/v1/warehouse/packaging-assemblies to be registered")
	require.True(t, hasCreateSession, "expected POST /api/v1/warehouse/packaging-assemblies/capture-sessions to be registered")
	require.True(t, hasGetSession, "expected GET /api/v1/warehouse/packaging-assemblies/capture-sessions/:sessionId to be registered")
}
