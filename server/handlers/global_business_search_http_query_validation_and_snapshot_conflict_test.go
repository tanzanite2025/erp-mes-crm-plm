package handlers

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"
	"xdfc-server/authz"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestGlobalBusinessSearchHTTPValidatesQueriesAndDistinguishesSnapshotChangesFromOutages(t *testing.T) {
	previousClient := services.GlobalSearchClient
	t.Cleanup(func() { services.GlobalSearchClient = previousClient })
	services.GlobalSearchClient = nil
	router := gin.New()
	router.GET("/search/global", func(c *gin.Context) {
		c.Set("userId", "search-http-user")
		c.Set("permissions", []string{authz.MenuWarehouse})
		GlobalSearchHandler(c)
	})
	for _, parameters := range []url.Values{
		{"q": {strings.Repeat("字", 201)}},
		{"q": {"1 2 3 4 5 6 7 8 9"}},
		{"q": {"search"}, "limit": {"0"}},
		{"q": {"search"}, "limit": {"101"}},
		{"q": {"search"}, "offset": {"-1"}},
		{"q": {"search"}, "offset": {"100001"}},
		{"q": {"search"}, "offset": {"100000"}, "generation": {"snapshot"}},
		{"q": {"search"}, "offset": {"1"}},
		{"q": {"search"}, "generation": {strings.Repeat("x", 129)}},
	} {
		response := httptest.NewRecorder()
		router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/search/global?"+parameters.Encode(), nil))
		require.Equal(t, http.StatusBadRequest, response.Code, parameters.Encode())
	}
	emptyResponse := httptest.NewRecorder()
	router.ServeHTTP(emptyResponse, httptest.NewRequest(http.MethodGet, "/search/global?q=%20", nil))
	require.Equal(t, http.StatusOK, emptyResponse.Code)
	require.JSONEq(t, `{"data":[],"hasMore":false,"nextOffset":0,"generation":"","candidateLimitReached":false}`, emptyResponse.Body.String())

	outageResponse := httptest.NewRecorder()
	router.ServeHTTP(outageResponse, httptest.NewRequest(http.MethodGet, "/search/global?q=search", nil))
	require.Equal(t, http.StatusServiceUnavailable, outageResponse.Code)

	engine := httptest.NewServer(http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		require.Equal(t, "/v1/search", request.URL.Path)
		var query services.GlobalBusinessSearchEngineRequest
		require.NoError(t, json.NewDecoder(request.Body).Decode(&query))
		require.Equal(t, "MAT-1", query.Query, "normalize fullwidth input before crossing the language boundary")
		require.Equal(t, "old-generation", query.Generation)
		require.Equal(t, []string{"material", "inventory"}, query.Categories)
		response.WriteHeader(http.StatusConflict)
	}))
	defer engine.Close()
	services.GlobalSearchClient = &services.SearchServiceClient{BaseURL: engine.URL, HTTPClient: engine.Client()}
	conflictResponse := httptest.NewRecorder()
	router.ServeHTTP(conflictResponse, httptest.NewRequest(http.MethodGet, "/search/global?"+url.Values{"q": {"ＭＡＴ-１"}, "offset": {"30"}, "generation": {"old-generation"}}.Encode(), nil))
	require.Equal(t, http.StatusConflict, conflictResponse.Code)
	var conflictBody map[string]string
	require.NoError(t, json.Unmarshal(conflictResponse.Body.Bytes(), &conflictBody))
	require.Equal(t, "GLOBAL_SEARCH_SNAPSHOT_CHANGED", conflictBody["code"])
}

func TestGlobalBusinessSearchHTTPStopsWhenCallerCancelsRequest(t *testing.T) {
	previousClient := services.GlobalSearchClient
	t.Cleanup(func() { services.GlobalSearchClient = previousClient })
	engineRequestStarted := make(chan struct{})
	engineRequestCancelled := make(chan struct{})
	engine := httptest.NewServer(http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		// Axum's JSON extractor consumes the request before invoking the search
		// handler. Do the same so HTTP/1 can detect a disconnected caller.
		_, _ = io.Copy(io.Discard, request.Body)
		close(engineRequestStarted)
		select {
		case <-request.Context().Done():
			close(engineRequestCancelled)
		case <-time.After(2 * time.Second):
		}
	}))
	defer engine.Close()
	services.GlobalSearchClient = &services.SearchServiceClient{BaseURL: engine.URL, HTTPClient: engine.Client()}
	router := gin.New()
	router.GET("/search/global", func(c *gin.Context) {
		c.Set("userId", "search-http-user")
		c.Set("permissions", []string{authz.MenuWarehouse})
		GlobalSearchHandler(c)
	})
	requestContext, cancelRequest := context.WithCancel(context.Background())
	defer cancelRequest()
	response := httptest.NewRecorder()
	requestCompleted := make(chan struct{})
	go func() {
		router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/search/global?q=order", nil).WithContext(requestContext))
		close(requestCompleted)
	}()
	select {
	case <-engineRequestStarted:
	case <-time.After(time.Second):
		t.Fatal("search request did not reach the sidecar")
	}
	cancelRequest()
	select {
	case <-requestCompleted:
	case <-time.After(time.Second):
		t.Fatal("Go search handler ignored caller cancellation")
	}
	select {
	case <-engineRequestCancelled:
	case <-time.After(time.Second):
		t.Fatal("outgoing Rust HTTP request did not receive cancellation")
	}
	require.Empty(t, response.Body.String(), "a discarded query must not be reported as a service outage")
}
