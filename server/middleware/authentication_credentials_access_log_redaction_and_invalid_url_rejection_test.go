package middleware

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/stretchr/testify/require"
)

func TestAuthenticationCredentialsQueryLogRedactionCoversEncodedRepeatedAndMalformedParameters(t *testing.T) {
	for _, parameterName := range []string{"ticket", "wsTicket", "access_token", "refresh-token", "id.token", "Authorization", "csrf_token", "apiKey", "client_secret", "password", "currentPassword", "newPassword", "confirmNewPassword"} {
		t.Run(parameterName, func(t *testing.T) {
			rawQuery := url.QueryEscape(parameterName) + "=first-sensitive-value&" + url.QueryEscape(parameterName) + "=second-sensitive-value&page=2"
			redacted := redactAuthenticationCredentialsFromLoggedQueryString(rawQuery)
			require.NotContains(t, redacted, "sensitive-value")
			parameters, err := url.ParseQuery(redacted)
			require.NoError(t, err)
			require.Equal(t, []string{"[REDACTED]"}, parameters[parameterName])
			require.Equal(t, "2", parameters.Get("page"))
		})
	}
	redacted := redactAuthenticationCredentialsFromLoggedQueryString("%74icket=encoded-sensitive-value&search=order")
	require.NotContains(t, redacted, "sensitive-value")
	require.Contains(t, redacted, "search=order")
	for _, rawQuery := range []string{"ticket=secret&malformed=%zz", "ticket=secret;extra=1"} {
		require.Equal(t, "[REDACTED_INVALID_QUERY]", redactAuthenticationCredentialsFromLoggedQueryString(rawQuery))
	}
	require.Empty(t, redactAuthenticationCredentialsFromLoggedQueryString(""))
}

func TestAuthenticationCredentialsRefererLogRedactionRemovesUserInfoFragmentsAndMalformedURLs(t *testing.T) {
	redacted := redactAuthenticationCredentialsFromLoggedReferer("https://sensitive-user:sensitive-password@example.test/path?access_token=sensitive-token&page=2#sensitive-fragment")
	require.NotContains(t, redacted, "sensitive-")
	referer, err := url.Parse(redacted)
	require.NoError(t, err)
	require.Equal(t, "https", referer.Scheme)
	require.Equal(t, "example.test", referer.Host)
	require.Equal(t, "/path", referer.Path)
	require.Nil(t, referer.User)
	require.Empty(t, referer.Fragment)
	require.Equal(t, "[REDACTED]", referer.Query().Get("access_token"))
	require.Equal(t, "2", referer.Query().Get("page"))
	require.Equal(t, "[REDACTED_INVALID_REFERER]", redactAuthenticationCredentialsFromLoggedReferer("https://%zz/sensitive-password"))
	require.Empty(t, redactAuthenticationCredentialsFromLoggedReferer(""))
}

func TestAuthenticationCredentialsAreAbsentFromActualSuccessfulAndRejectedHTTPAccessLogs(t *testing.T) {
	previousMode, previousLogger := gin.Mode(), log.Logger
	t.Cleanup(func() { gin.SetMode(previousMode); log.Logger = previousLogger })
	gin.SetMode(gin.TestMode)
	var accessLogs bytes.Buffer
	log.Logger = zerolog.New(&accessLogs)
	router := gin.New()
	router.Use(Logger())
	router.GET("/api/v1/ws", func(c *gin.Context) {
		if c.Query("reject") == "true" {
			c.AbortWithStatus(http.StatusUnauthorized)
			return
		}
		c.Status(http.StatusNoContent)
	})
	for _, reject := range []string{"false", "true"} {
		accessLogs.Reset()
		request := httptest.NewRequest(http.MethodGet, "/api/v1/ws?ticket=sensitive-ticket&reject="+reject, nil)
		request.Header.Set("Referer", "https://example.test/page?newPassword=sensitive-password&tab=profile")
		response := httptest.NewRecorder()
		router.ServeHTTP(response, request)
		require.NotContains(t, accessLogs.String(), "sensitive-")
		var entry map[string]any
		require.NoError(t, json.Unmarshal(accessLogs.Bytes(), &entry))
		require.Equal(t, "HTTP_ACCESS", entry["message"])
		require.Equal(t, "/api/v1/ws", entry["path"])
		parameters, err := url.ParseQuery(entry["query"].(string))
		require.NoError(t, err)
		require.Equal(t, "[REDACTED]", parameters.Get("ticket"))
		require.Equal(t, reject, parameters.Get("reject"))
		require.NotEmpty(t, entry["request_id"])
		expectedStatus := http.StatusNoContent
		if reject == "true" {
			expectedStatus = http.StatusUnauthorized
		}
		require.Equal(t, float64(expectedStatus), entry["status"])
	}
}
