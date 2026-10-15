package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestIndependentPayrollHTTPWritersRejectProductionFieldsBeforeDatabaseAccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, testCase := range []struct {
		path, payload string
		handler       gin.HandlerFunc
	}{
		{"/rates", `{"productId":"old-product","piecePrice":2,"effectiveAt":"2026-10-01"}`, SavePieceworkRateHandler},
		{"/calculate", `{"productId":"old-product","sourceExecutionId":"production-id"}`, CalculateFinancePieceworkSalaryHandler},
		{"/calculate", `{"calculationDate":""}`, CalculateFinancePieceworkSalaryHandler},
		{"/pay-items", `{"name":"Payroll item","routeStepId":"old-step"}`, SavePieceworkPayItemHandler},
		{"/pay-items", `{"name":"Payroll item"} {"other":"object"}`, SavePieceworkPayItemHandler},
		{"/calculate", `{"calculationDate":"2026-10-15","rows":[{"teamId":"obsolete"}]}`, CalculateFinancePieceworkSalaryHandler},
		{"/calculate", `{"requestKey":"obsolete"}`, CalculateFinancePieceworkSalaryHandler},
	} {
		router := gin.New()
		router.POST(testCase.path, testCase.handler)
		response := httptest.NewRecorder()
		request := httptest.NewRequest(http.MethodPost, testCase.path, strings.NewReader(testCase.payload))
		request.Header.Set("Content-Type", "application/json")
		router.ServeHTTP(response, request)
		require.Equal(t, http.StatusBadRequest, response.Code, response.Body.String())
	}
}
