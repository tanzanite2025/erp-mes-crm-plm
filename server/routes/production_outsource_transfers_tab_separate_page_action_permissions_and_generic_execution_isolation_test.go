package routes

import (
	"net/http/httptest"
	"strings"
	"testing"
	"xdfc-server/authz"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestProductionOutsourceTransfersTabRequiresSeparateBusinessActionsAndCannotRunGenericProductionCommands(t *testing.T) {
	for _, item := range []struct {
		name, method, path, body string
		permissions              []string
		want                     int
	}{
		{"action without page", "POST", "/outsourcing/order-lines/line/send", "{}", []string{authz.ActionOutsourceTransferExecute}, 403},
		{"page without send", "POST", "/outsourcing/order-lines/line/send", "{}", []string{authz.TabProductionOutsourcingTransfers}, 403},
		{"inspector cannot send", "POST", "/outsourcing/order-lines/line/send", "{}", []string{authz.TabProductionOutsourcingTransfers, authz.ActionOutsourceInspectionSubmit}, 403},
		{"sender cannot inspect", "POST", "/outsourcing/order-lines/line/inspect", "{}", []string{authz.TabProductionOutsourcingTransfers, authz.ActionOutsourceTransferExecute}, 403},
		{"sender cannot review inspection", "GET", "/outsourcing/order-lines/line/barcode-review?action=INSPECT&productBarcode=BC", "", []string{authz.TabProductionOutsourcingTransfers, authz.ActionOutsourceTransferExecute}, 403},
		{"inspector cannot edit registration", "PUT", "/outsourcing/order-lines/line/registered-barcodes", "{}", []string{authz.TabProductionOutsourcingTransfers, authz.ActionOutsourceInspectionSubmit}, 403},
		{"sender reaches registration validation without broad menu", "PUT", "/outsourcing/order-lines/line/registered-barcodes", "{}", []string{authz.TabProductionOutsourcingTransfers, authz.ActionOutsourceTransferExecute}, 400},
		{"sender reaches send validation without broad menu", "POST", "/outsourcing/order-lines/line/send", "{", []string{authz.TabProductionOutsourcingTransfers, authz.ActionOutsourceTransferExecute}, 400},
		{"inspector reaches inspect validation without broad menu", "POST", "/outsourcing/order-lines/line/inspect", "{", []string{authz.TabProductionOutsourcingTransfers, authz.ActionOutsourceInspectionSubmit}, 400},
		{"outsourcing cannot run generic engine", "POST", "/scan-commands/execute", "{}", []string{authz.TabProductionOutsourcingTransfers, authz.ActionOutsourceTransferExecute, authz.ActionOutsourceInspectionSubmit}, 403},
	} {
		t.Run(item.name, func(t *testing.T) {
			router := gin.New()
			group := router.Group("/api/v1")
			group.Use(func(c *gin.Context) { c.Set("permissions", item.permissions); c.Set("userID", "operator"); c.Next() })
			registerProductionRoutes(group)
			request := httptest.NewRequest(item.method, "/api/v1/production"+item.path, strings.NewReader(item.body))
			request.Header.Set("Content-Type", "application/json")
			response := httptest.NewRecorder()
			router.ServeHTTP(response, request)
			require.Equal(t, item.want, response.Code, response.Body.String())
		})
	}
}
