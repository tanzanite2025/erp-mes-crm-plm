package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestQueryStatusFilterUsesSharedStatusKey(t *testing.T) {
	gin.SetMode(gin.TestMode)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/orders?status=%20Pending,Done%20", nil)

	if got := queryStatusFilter(ctx); got != "Pending,Done" {
		t.Fatalf("expected status filter Pending,Done, got %q", got)
	}
}

func TestQueryStatusFilterHandlesNilContext(t *testing.T) {
	if got := queryStatusFilter(nil); got != "" {
		t.Fatalf("expected empty status filter for nil context, got %q", got)
	}
}

func TestLedgerSearchQueryHelpersUseSharedKeys(t *testing.T) {
	gin.SetMode(gin.TestMode)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/ledgers/search?keyword=%20SO-001%20&currency=%20CNY%20&outstandingMin=10.5&outstandingMax=99.75&sortBy=%20dueDate%20&sortOrder=%20desc%20", nil)

	if got := queryKeywordFilter(ctx); got != "SO-001" {
		t.Fatalf("expected keyword SO-001, got %q", got)
	}
	if got := queryCurrencyFilter(ctx); got != "CNY" {
		t.Fatalf("expected currency CNY, got %q", got)
	}
	if got := queryOutstandingMin(ctx); got != 10.5 {
		t.Fatalf("expected outstanding min 10.5, got %f", got)
	}
	if got := queryOutstandingMax(ctx); got != 99.75 {
		t.Fatalf("expected outstanding max 99.75, got %f", got)
	}
	if got := querySortBy(ctx); got != "dueDate" {
		t.Fatalf("expected sortBy dueDate, got %q", got)
	}
	if got := querySortOrder(ctx); got != "desc" {
		t.Fatalf("expected sortOrder desc, got %q", got)
	}
}

func TestQueryFloatParamFallsBackToZero(t *testing.T) {
	gin.SetMode(gin.TestMode)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/ledgers/search?outstandingMin=not-a-number", nil)

	if got := queryOutstandingMin(ctx); got != 0 {
		t.Fatalf("expected invalid outstanding min to fall back to zero, got %f", got)
	}
	if got := queryOutstandingMax(nil); got != 0 {
		t.Fatalf("expected nil context outstanding max to fall back to zero, got %f", got)
	}
}
