package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"
	"xdfc-server/middleware"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

type AiProxyMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type AiProxyRequest struct {
	Messages []AiProxyMessage `json:"messages" binding:"required"`
	Stream   bool             `json:"stream"`
}

type aiProxyUpstreamRequest struct {
	TargetURL string
	Headers   map[string]string
	Body      any
	Stream    bool
}

type aiProxySecurityConfig struct {
	AllowedHosts     []string
	Timeout          time.Duration
	StreamTimeout    time.Duration
	MaxBodyBytes     int
	MaxResponseBytes int
	AllowPrivateIP   bool
}

const (
	defaultAIProxyMaxBodyBytes            = 256 * 1024
	defaultAIProxyMaxResponseBytes        = 2 * 1024 * 1024
	defaultAIProxyMaxMessages             = 40
	defaultAIProxyMaxMessageContentRunes  = 12_000
	defaultAIProxyMaxTotalMessageRunes    = 60_000
	aiProxyResponseOverflowDetectionBytes = 1
)

var blockedCIDRs = mustParseCIDRs([]string{
	"100.64.0.0/10",
	"169.254.0.0/16",
	"198.18.0.0/15",
	"224.0.0.0/4",
	"240.0.0.0/4",
	"fc00::/7",
	"fe80::/10",
	"ff00::/8",
	"::ffff:0:0/96",
})

func AiProxyHandler(c *gin.Context) {
	policy, exists := middleware.AIPolicyFromContext(c)
	if !exists {
		writeSecurityError(c, http.StatusInternalServerError, "AI_POLICY_CONTEXT_MISSING", "AI policy context is unavailable")
		return
	}

	var proxyRequest AiProxyRequest
	if err := c.ShouldBindJSON(&proxyRequest); err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "request body too large") {
			writeSecurityError(c, http.StatusRequestEntityTooLarge, "AI_PROXY_BODY_TOO_LARGE", "Request body exceeds allowed size")
			return
		}
		writeSecurityError(c, http.StatusBadRequest, "AI_PROXY_BAD_REQUEST", "Invalid AI proxy request")
		return
	}
	if err := validateAIProxyMessages(proxyRequest.Messages); err != nil {
		writeSecurityError(c, http.StatusBadRequest, "AI_PROXY_BAD_MESSAGES", err.Error())
		return
	}

	upstreamRequest, err := buildAIProxyUpstreamRequest(policy, proxyRequest)
	if err != nil {
		writeSecurityError(c, http.StatusServiceUnavailable, "AI_PROXY_GATEWAY_NOT_CONFIGURED", err.Error())
		return
	}

	securityConfig := getAIProxySecurityConfig()
	targetURL, err := validateTargetURL(upstreamRequest.TargetURL, securityConfig)
	if err != nil {
		writeSecurityError(c, http.StatusForbidden, "AI_PROXY_TARGET_BLOCKED", err.Error())
		return
	}

	bodyBytes, err := json.Marshal(upstreamRequest.Body)
	if err != nil {
		writeSecurityError(c, http.StatusBadRequest, "AI_PROXY_BAD_BODY", "Failed to serialize upstream request")
		return
	}
	if len(bodyBytes) > securityConfig.MaxBodyBytes {
		writeSecurityError(c, http.StatusRequestEntityTooLarge, "AI_PROXY_BODY_TOO_LARGE", fmt.Sprintf("Upstream request exceeds %d bytes", securityConfig.MaxBodyBytes))
		return
	}

	requestTimeout := securityConfig.Timeout
	if upstreamRequest.Stream && securityConfig.StreamTimeout > 0 {
		requestTimeout = securityConfig.StreamTimeout
	}

	requestContext, cancel := context.WithTimeout(c.Request.Context(), requestTimeout)
	defer cancel()

	clientRequest, err := http.NewRequestWithContext(requestContext, http.MethodPost, targetURL, bytes.NewReader(bodyBytes))
	if err != nil {
		writeSecurityError(c, http.StatusBadRequest, "AI_PROXY_BUILD_REQUEST_FAILED", "Failed to build upstream request")
		return
	}
	for key, value := range upstreamRequest.Headers {
		clientRequest.Header.Set(key, value)
	}
	clientRequest.Header.Set("Content-Type", "application/json")

	log.Printf(
		"[AI_PROXY][OUTBOUND] Target: %s | Auth: %t | GroupID: %t | Stream: %t | Timeout: %s",
		redactURL(targetURL),
		clientRequest.Header.Get("Authorization") != "" || clientRequest.Header.Get("x-goog-api-key") != "",
		clientRequest.Header.Get("x-group-id") != "",
		upstreamRequest.Stream,
		requestTimeout,
	)

	client := &http.Client{
		Timeout:   requestTimeout,
		Transport: newAIProxyTransport(securityConfig, requestTimeout),
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}

	response, err := client.Do(clientRequest)
	if err != nil {
		log.Printf("[AI_PROXY][ERROR] Connection failed: %v", err)
		writeSecurityError(c, http.StatusGatewayTimeout, "AI_PROXY_UPSTREAM_TIMEOUT", "Unable to connect to the upstream AI service")
		return
	}
	defer response.Body.Close()

	for _, headerName := range []string{"Content-Type", "Cache-Control"} {
		if value := response.Header.Get(headerName); value != "" {
			c.Header(headerName, value)
		}
	}

	contentType := strings.ToLower(response.Header.Get("Content-Type"))
	if upstreamRequest.Stream || strings.Contains(contentType, "text/event-stream") {
		streamUpstreamResponse(c, response)
		return
	}

	responseBody, err := readAIProxyResponseBody(response.Body, securityConfig.MaxResponseBytes)
	if err != nil {
		if errors.Is(err, errAIProxyResponseTooLarge) {
			writeSecurityError(c, http.StatusBadGateway, "AI_PROXY_RESPONSE_TOO_LARGE", "Upstream response exceeds allowed size")
			return
		}
		writeSecurityError(c, http.StatusInternalServerError, "AI_PROXY_READ_FAIL", "Failed to read upstream response")
		return
	}
	if response.StatusCode != http.StatusOK {
		log.Printf("[AI_PROXY][UPSTREAM_FAIL] Status: %d | Target: %s | Bytes: %d", response.StatusCode, redactURL(targetURL), len(responseBody))
	}
	c.Data(response.StatusCode, response.Header.Get("Content-Type"), responseBody)
}

func validateAIProxyMessages(messages []AiProxyMessage) error {
	if len(messages) == 0 {
		return fmt.Errorf("at least one message is required")
	}
	if len(messages) > defaultAIProxyMaxMessages {
		return fmt.Errorf("message count exceeds the limit")
	}
	totalContentRunes := 0
	for _, message := range messages {
		role := strings.ToLower(strings.TrimSpace(message.Role))
		if role != "user" && role != "assistant" && role != "system" {
			return fmt.Errorf("unsupported message role")
		}
		content := strings.TrimSpace(message.Content)
		if content == "" {
			return fmt.Errorf("message content cannot be empty")
		}
		contentRunes := utf8.RuneCountInString(content)
		if contentRunes > defaultAIProxyMaxMessageContentRunes {
			return fmt.Errorf("message content exceeds the single-message limit")
		}
		totalContentRunes += contentRunes
		if totalContentRunes > defaultAIProxyMaxTotalMessageRunes {
			return fmt.Errorf("message content exceeds the total limit")
		}
	}
	return nil
}

func buildAIProxyUpstreamRequest(policy services.AIPolicy, request AiProxyRequest) (aiProxyUpstreamRequest, error) {
	gateway := policy.API
	provider := strings.ToLower(strings.TrimSpace(gateway.Provider))
	apiKey := strings.TrimSpace(gateway.APIKey)
	if apiKey == "" {
		return aiProxyUpstreamRequest{}, fmt.Errorf("AI gateway credential is not configured")
	}

	switch provider {
	case "gemini":
		if request.Stream {
			return aiProxyUpstreamRequest{}, fmt.Errorf("Gemini streaming is not enabled for this gateway")
		}
		model := url.PathEscape(strings.TrimSpace(gateway.Model))
		if model == "" {
			return aiProxyUpstreamRequest{}, fmt.Errorf("AI gateway model is not configured")
		}
		contents := make([]map[string]any, 0, len(request.Messages))
		for _, message := range request.Messages {
			role := "user"
			if strings.EqualFold(strings.TrimSpace(message.Role), "assistant") {
				role = "model"
			}
			contents = append(contents, map[string]any{
				"role":  role,
				"parts": []map[string]string{{"text": message.Content}},
			})
		}
		return aiProxyUpstreamRequest{
			TargetURL: strings.TrimRight(gateway.BaseURL, "/") + "/v1beta/models/" + model + ":generateContent",
			Headers:   map[string]string{"x-goog-api-key": apiKey},
			Body:      map[string]any{"contents": contents},
		}, nil

	case "openai", "custom":
		model := strings.TrimSpace(gateway.Model)
		if model == "" {
			return aiProxyUpstreamRequest{}, fmt.Errorf("AI gateway model is not configured")
		}
		targetURL := resolveAIChatCompletionsURL(gateway.BaseURL)
		headers := map[string]string{"Authorization": buildAIGatewayAuthorization(apiKey)}
		if isMiniMaxGatewayURL(targetURL) {
			groupID := strings.TrimSpace(gateway.GroupID)
			if groupID == "" {
				return aiProxyUpstreamRequest{}, fmt.Errorf("MiniMax Group ID is not configured")
			}
			headers["x-group-id"] = groupID
		}
		return aiProxyUpstreamRequest{
			TargetURL: targetURL,
			Headers:   headers,
			Body: map[string]any{
				"model":       model,
				"messages":    request.Messages,
				"temperature": 0.7,
				"stream":      request.Stream,
			},
			Stream: request.Stream,
		}, nil
	default:
		return aiProxyUpstreamRequest{}, fmt.Errorf("unsupported AI gateway provider")
	}
}

func resolveAIChatCompletionsURL(baseURL string) string {
	normalized := strings.TrimRight(strings.TrimSpace(baseURL), "/")
	lower := strings.ToLower(normalized)
	if strings.HasSuffix(lower, "/chat/completions") {
		return normalized
	}
	if strings.HasSuffix(lower, "/v1") {
		return normalized + "/chat/completions"
	}
	return normalized + "/v1/chat/completions"
}

func buildAIGatewayAuthorization(apiKey string) string {
	if strings.HasPrefix(strings.ToLower(strings.TrimSpace(apiKey)), "bearer ") {
		return strings.TrimSpace(apiKey)
	}
	return "Bearer " + strings.TrimSpace(apiKey)
}

func isMiniMaxGatewayURL(targetURL string) bool {
	normalized := strings.ToLower(targetURL)
	return strings.Contains(normalized, "minimaxi.com") || strings.Contains(normalized, "minimax.io")
}

func validateTargetURL(raw string, cfg aiProxySecurityConfig) (string, error) {
	parsedURL, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return "", fmt.Errorf("invalid url")
	}
	if !strings.EqualFold(parsedURL.Scheme, "https") {
		return "", fmt.Errorf("only https target is allowed")
	}
	host := strings.ToLower(strings.TrimSpace(parsedURL.Hostname()))
	if host == "" {
		return "", fmt.Errorf("missing target host")
	}
	if parsedURL.Port() != "" && parsedURL.Port() != "443" {
		return "", fmt.Errorf("target port %s is not allowed", parsedURL.Port())
	}
	if host == "localhost" || strings.HasSuffix(host, ".localhost") {
		return "", fmt.Errorf("localhost target is blocked")
	}
	if len(cfg.AllowedHosts) > 0 && !isHostAllowed(host, cfg.AllowedHosts) {
		return "", fmt.Errorf("target host is not allowed")
	}

	if ip := net.ParseIP(host); ip != nil {
		if isPrivateOrBlockedIP(ip) {
			return "", fmt.Errorf("target ip is private or blocked")
		}
		return parsedURL.String(), nil
	}

	ips, err := net.LookupIP(host)
	if err != nil {
		return "", fmt.Errorf("dns resolve failed")
	}
	if len(ips) == 0 {
		return "", fmt.Errorf("dns has no records")
	}
	if !cfg.AllowPrivateIP {
		for _, ip := range ips {
			if isPrivateOrBlockedIP(ip) {
				return "", fmt.Errorf("resolved ip is private or blocked")
			}
		}
	}
	return parsedURL.String(), nil
}

type aiProxyLookupIPAddrFunc func(ctx context.Context, host string) ([]net.IPAddr, error)
type aiProxyDialContextFunc func(ctx context.Context, network string, address string) (net.Conn, error)

func newAIProxyTransport(cfg aiProxySecurityConfig, requestTimeout time.Duration) *http.Transport {
	dialTimeout := 10 * time.Second
	if requestTimeout > 0 && requestTimeout < dialTimeout {
		dialTimeout = requestTimeout
	}
	dialer := &net.Dialer{
		Timeout:   dialTimeout,
		KeepAlive: 30 * time.Second,
	}

	return &http.Transport{
		DialContext:           secureAIProxyDialContext(cfg, net.DefaultResolver.LookupIPAddr, dialer.DialContext),
		TLSHandshakeTimeout:   10 * time.Second,
		ResponseHeaderTimeout: requestTimeout,
		ExpectContinueTimeout: 1 * time.Second,
	}
}

func secureAIProxyDialContext(cfg aiProxySecurityConfig, lookup aiProxyLookupIPAddrFunc, dial aiProxyDialContextFunc) aiProxyDialContextFunc {
	return func(ctx context.Context, network string, address string) (net.Conn, error) {
		host, port, err := net.SplitHostPort(address)
		if err != nil {
			return nil, fmt.Errorf("invalid upstream address")
		}
		host = strings.Trim(strings.ToLower(host), "[]")
		if host == "" {
			return nil, fmt.Errorf("missing upstream host")
		}
		if port != "443" {
			return nil, fmt.Errorf("upstream port %s is not allowed", port)
		}
		if host == "localhost" || strings.HasSuffix(host, ".localhost") {
			return nil, fmt.Errorf("localhost target is blocked")
		}

		ips, err := resolveAIProxyDialIPs(ctx, host, lookup)
		if err != nil {
			return nil, err
		}
		if len(ips) == 0 {
			return nil, fmt.Errorf("dns has no records")
		}
		if !cfg.AllowPrivateIP {
			for _, ip := range ips {
				if isPrivateOrBlockedIP(ip) {
					return nil, fmt.Errorf("resolved ip is private or blocked")
				}
			}
		}

		var lastErr error
		for _, ip := range ips {
			connection, err := dial(ctx, network, net.JoinHostPort(ip.String(), port))
			if err == nil {
				return connection, nil
			}
			lastErr = err
		}
		if lastErr != nil {
			return nil, lastErr
		}
		return nil, fmt.Errorf("upstream dial failed")
	}
}

func resolveAIProxyDialIPs(ctx context.Context, host string, lookup aiProxyLookupIPAddrFunc) ([]net.IP, error) {
	if ip := net.ParseIP(host); ip != nil {
		return []net.IP{ip}, nil
	}

	addresses, err := lookup(ctx, host)
	if err != nil {
		return nil, fmt.Errorf("dns resolve failed")
	}
	ips := make([]net.IP, 0, len(addresses))
	for _, address := range addresses {
		if address.IP != nil {
			ips = append(ips, address.IP)
		}
	}
	return ips, nil
}

func isHostAllowed(host string, allowed []string) bool {
	for _, allowedHost := range allowed {
		if host == strings.ToLower(strings.TrimSpace(allowedHost)) {
			return true
		}
	}
	return false
}

func isPrivateOrBlockedIP(ip net.IP) bool {
	if ip == nil {
		return true
	}
	isIPv4 := false
	if ip4 := ip.To4(); ip4 != nil {
		ip = ip4
		isIPv4 = true
	}
	if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsMulticast() || ip.IsUnspecified() {
		return true
	}
	for _, cidr := range blockedCIDRs {
		_, bits := cidr.Mask.Size()
		if (bits == 32) != isIPv4 {
			continue
		}
		if cidr.Contains(ip) {
			return true
		}
	}
	return false
}

func writeSecurityError(c *gin.Context, status int, code string, message string) {
	c.JSON(status, gin.H{
		"code":  code,
		"error": message,
	})
}

var errAIProxyResponseTooLarge = errors.New("AI proxy response exceeds the limit")

func readAIProxyResponseBody(body io.Reader, maxBytes int) ([]byte, error) {
	if maxBytes <= 0 {
		return io.ReadAll(body)
	}
	payload, err := io.ReadAll(io.LimitReader(body, int64(maxBytes+aiProxyResponseOverflowDetectionBytes)))
	if err != nil {
		return nil, err
	}
	if len(payload) > maxBytes {
		return nil, errAIProxyResponseTooLarge
	}
	return payload, nil
}

func redactURL(raw string) string {
	parsedURL, err := url.Parse(raw)
	if err != nil {
		return "invalid-url"
	}
	return fmt.Sprintf("%s://%s%s", parsedURL.Scheme, parsedURL.Host, parsedURL.Path)
}

func getAIProxySecurityConfig() aiProxySecurityConfig {
	allowedHosts := []string{
		"api.openai.com",
		"generativelanguage.googleapis.com",
		"api.minimax.io",
		"api.minimaxi.com",
	}
	if value := strings.TrimSpace(os.Getenv("AI_PROXY_ALLOWED_HOSTS")); value != "" {
		parts := strings.Split(value, ",")
		next := make([]string, 0, len(parts))
		for _, part := range parts {
			part = strings.ToLower(strings.TrimSpace(part))
			if part != "" {
				next = append(next, part)
			}
		}
		if len(next) > 0 {
			allowedHosts = next
		}
	}

	timeout := 30 * time.Second
	if value := strings.TrimSpace(os.Getenv("AI_PROXY_TIMEOUT_MS")); value != "" {
		if milliseconds, err := strconv.Atoi(value); err == nil && milliseconds > 0 {
			timeout = time.Duration(milliseconds) * time.Millisecond
		}
	}
	streamTimeout := 120 * time.Second
	if value := strings.TrimSpace(os.Getenv("AI_PROXY_STREAM_TIMEOUT_MS")); value != "" {
		if milliseconds, err := strconv.Atoi(value); err == nil && milliseconds > 0 {
			streamTimeout = time.Duration(milliseconds) * time.Millisecond
		}
	}

	maxBodyBytes := defaultAIProxyMaxBodyBytes
	if value := strings.TrimSpace(os.Getenv("AI_PROXY_MAX_BODY_BYTES")); value != "" {
		if bytesLimit, err := strconv.Atoi(value); err == nil && bytesLimit > 0 {
			maxBodyBytes = bytesLimit
		}
	}

	maxResponseBytes := defaultAIProxyMaxResponseBytes
	if value := strings.TrimSpace(os.Getenv("AI_PROXY_MAX_RESPONSE_BYTES")); value != "" {
		if bytesLimit, err := strconv.Atoi(value); err == nil && bytesLimit > 0 {
			maxResponseBytes = bytesLimit
		}
	}

	allowPrivateIP := false
	if value := strings.TrimSpace(os.Getenv("AI_PROXY_ALLOW_PRIVATE_IP")); value != "" {
		allowPrivateIP, _ = strconv.ParseBool(value)
	}
	if allowPrivateIP && strings.EqualFold(strings.TrimSpace(os.Getenv("GIN_MODE")), "release") {
		log.Printf("[AI_PROXY][SECURITY] AI_PROXY_ALLOW_PRIVATE_IP=true is ignored in release mode")
		allowPrivateIP = false
	}

	return aiProxySecurityConfig{
		AllowedHosts:     allowedHosts,
		Timeout:          timeout,
		StreamTimeout:    streamTimeout,
		MaxBodyBytes:     maxBodyBytes,
		MaxResponseBytes: maxResponseBytes,
		AllowPrivateIP:   allowPrivateIP,
	}
}

func streamUpstreamResponse(c *gin.Context, response *http.Response) {
	c.Header("Cache-Control", "no-cache, no-transform")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")
	c.Status(response.StatusCode)

	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		if _, err := io.Copy(c.Writer, response.Body); err != nil {
			log.Printf("[AI_PROXY][STREAM_ERROR] fallback copy failed: %v", err)
		}
		return
	}

	buffer := make([]byte, 4*1024)
	for {
		if err := c.Request.Context().Err(); err != nil {
			return
		}

		bytesRead, err := response.Body.Read(buffer)
		if bytesRead > 0 {
			if _, writeErr := c.Writer.Write(buffer[:bytesRead]); writeErr != nil {
				log.Printf("[AI_PROXY][STREAM_ERROR] write failed: %v", writeErr)
				return
			}
			flusher.Flush()
		}
		if err != nil {
			if err != io.EOF {
				log.Printf("[AI_PROXY][STREAM_ERROR] read failed: %v", err)
			}
			return
		}
	}
}

func mustParseCIDRs(cidrs []string) []*net.IPNet {
	result := make([]*net.IPNet, 0, len(cidrs))
	for _, value := range cidrs {
		_, network, err := net.ParseCIDR(value)
		if err != nil {
			panic("invalid cidr: " + value)
		}
		result = append(result, network)
	}
	return result
}
