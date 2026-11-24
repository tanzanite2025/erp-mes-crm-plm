package handlers

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"
	"xdfc-server/authz"
	"xdfc-server/middleware"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestQualityAbnormalityDisposalHTTPRequiresDedicatedActionAndValidCommand(t *testing.T) {
	permissions := []string{}
	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("permissions", permissions)
		c.Set("username", "disposal-http-test")
		c.Next()
	})
	quality := router.Group("/quality", middleware.RequireAnyPermission(authz.MenuQuality))
	quality.POST("/abnormalities/:id/disposal", middleware.RequireAnyPermission(authz.ActionQualityAbnormalityDispose), RecordQualityAbnormalityDisposalHandler)
	for _, test := range []struct {
		permissions []string
		body        string
		status      int
	}{
		{nil, `{"disposalMethod":"REWORK"}`, http.StatusForbidden},
		{[]string{authz.MenuQuality}, `{"disposalMethod":"REWORK"}`, http.StatusForbidden},
		{[]string{authz.ActionQualityAbnormalityDispose}, `{"disposalMethod":"REWORK"}`, http.StatusForbidden},
		{[]string{authz.MenuQuality, authz.ActionQualityAbnormalityDispose}, `{`, http.StatusBadRequest},
		{[]string{authz.MenuQuality, authz.ActionQualityAbnormalityDispose}, `{"disposalMethod":"REWORK"}`, http.StatusBadRequest},
	} {
		permissions = test.permissions
		request := httptest.NewRequest(http.MethodPost, "/quality/abnormalities/invalid-uuid/disposal", bytes.NewBufferString(test.body))
		request.Header.Set("Content-Type", "application/json")
		response := httptest.NewRecorder()
		router.ServeHTTP(response, request)
		require.Equal(t, test.status, response.Code, response.Body.String())
	}
}
