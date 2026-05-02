package handlers

import (
	"context"
	"net"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestValidateTargetURLRejectsAllowedLocalhost(t *testing.T) {
	_, err := validateTargetURL("https://localhost/v1/chat/completions", aiProxySecurityConfig{
		AllowedHosts: []string{"localhost"},
	})

	require.Error(t, err)
	require.Contains(t, err.Error(), "localhost target is blocked")
}

func TestValidateTargetURLRejectsUnlistedHost(t *testing.T) {
	_, err := validateTargetURL("https://evil.example.com/v1/chat/completions", aiProxySecurityConfig{
		AllowedHosts: []string{"api.openai.com"},
	})

	require.Error(t, err)
	require.Contains(t, err.Error(), "target host is not allowed")
}

func TestSecureAIProxyDialContextRejectsDNSRebindToPrivateIP(t *testing.T) {
	dialCalled := false
	secureDial := secureAIProxyDialContext(
		aiProxySecurityConfig{},
		func(context.Context, string) ([]net.IPAddr, error) {
			return []net.IPAddr{{IP: net.ParseIP("127.0.0.1")}}, nil
		},
		func(context.Context, string, string) (net.Conn, error) {
			dialCalled = true
			return nil, nil
		},
	)

	conn, err := secureDial(context.Background(), "tcp", "rebind.example.com:443")

	require.Nil(t, conn)
	require.Error(t, err)
	require.Contains(t, err.Error(), "resolved ip is private or blocked")
	require.False(t, dialCalled)
}

func TestSecureAIProxyDialContextDialsResolvedPublicIP(t *testing.T) {
	var dialedAddress string
	secureDial := secureAIProxyDialContext(
		aiProxySecurityConfig{},
		func(context.Context, string) ([]net.IPAddr, error) {
			return []net.IPAddr{{IP: net.ParseIP("8.8.8.8")}}, nil
		},
		func(_ context.Context, _ string, address string) (net.Conn, error) {
			dialedAddress = address
			clientConn, serverConn := net.Pipe()
			t.Cleanup(func() {
				_ = clientConn.Close()
				_ = serverConn.Close()
			})
			return clientConn, nil
		},
	)

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	conn, err := secureDial(ctx, "tcp", "api.example.com:443")

	require.NoError(t, err)
	require.NotNil(t, conn)
	require.Equal(t, "8.8.8.8:443", dialedAddress)
	require.False(t, strings.Contains(dialedAddress, "api.example.com"))
}
