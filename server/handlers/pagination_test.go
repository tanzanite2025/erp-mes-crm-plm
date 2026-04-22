package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestParsePageQueryUsesSharedPageKeys(t *testing.T) {
	gin.SetMode(gin.TestMode)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/orders?page=3&pageSize=25", nil)

	page, pageSize := parsePageQuery(ctx, 50)

	if page != 3 {
		t.Fatalf("expected page 3, got %d", page)
	}
	if pageSize != 25 {
		t.Fatalf("expected pageSize 25, got %d", pageSize)
	}
}

func TestParsePageQueryFallsBackForInvalidValues(t *testing.T) {
	gin.SetMode(gin.TestMode)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/orders?page=0&pageSize=-1", nil)

	page, pageSize := parsePageQuery(ctx, 50)

	if page != 1 {
		t.Fatalf("expected default page 1, got %d", page)
	}
	if pageSize != 50 {
		t.Fatalf("expected default pageSize 50, got %d", pageSize)
	}
}
