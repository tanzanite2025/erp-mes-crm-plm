package handlers

import (
	"bytes"
	"context"
	"encoding/json"
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

	"github.com/gin-gonic/gin"
)

type AiProxyRequest struct {
	Url     string            `json:"url"`
	Method  string            `json:"method"`
	Headers map[string]string `json:"headers"`
	Body    interface{}       `json:"body"`
}

type aiProxySecurityConfig struct {
	AllowedHosts   []string
	Timeout        time.Duration
	StreamTimeout  time.Duration
	MaxBodyBytes   int
	AllowPrivateIP bool
}

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

var allowedOutboundHeaders = map[string]struct{}{
	"authorization": {},
	"x-group-id":    {},
}

func AiProxyHandler(c *gin.Context) {
	cfg := getAIProxySecurityConfig()

	var proxyReq AiProxyRequest
	if err := c.ShouldBindJSON(&proxyReq); err != nil {
		writeSecurityError(c, http.StatusBadRequest, "AI_PROXY_BAD_REQUEST", "解析代理请求失败")
		return
	}

	method, err := validateProxyMethod(proxyReq.Method)
	if err != nil {
		writeSecurityError(c, http.StatusMethodNotAllowed, "AI_PROXY_METHOD_BLOCKED", err.Error())
		return
	}

	targetURL, err := validateTargetURL(proxyReq.Url, cfg)
	if err != nil {
		writeSecurityError(c, http.StatusForbidden, "AI_PROXY_TARGET_BLOCKED", err.Error())
		return
	}

	safeHeaders := filterAllowedHeaders(proxyReq.Headers)
	isStream := isStreamProxyRequest(proxyReq.Body)

	var bodyReader io.Reader
	var bodyBytes []byte
	if proxyReq.Body != nil {
		bodyBytes, err = json.Marshal(proxyReq.Body)
		if err != nil {
			writeSecurityError(c, http.StatusBadRequest, "AI_PROXY_BAD_BODY", "请求体序列化失败")
			return
		}
		if len(bodyBytes) > cfg.MaxBodyBytes {
			writeSecurityError(c, http.StatusRequestEntityTooLarge, "AI_PROXY_BODY_TOO_LARGE", fmt.Sprintf("请求体超过上限 %d bytes", cfg.MaxBodyBytes))
			return
		}
		bodyReader = bytes.NewBuffer(bodyBytes)
	}

	requestTimeout := cfg.Timeout
	if isStream && cfg.StreamTimeout > 0 {
		requestTimeout = cfg.StreamTimeout
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), requestTimeout)
	defer cancel()

	clientReq, err := http.NewRequestWithContext(ctx, method, targetURL, bodyReader)
	if err != nil {
		writeSecurityError(c, http.StatusBadRequest, "AI_PROXY_BUILD_REQUEST_FAILED", "构造上游请求失败")
		return
	}

	for k, v := range safeHeaders {
		clientReq.Header.Set(k, v)
	}
	clientReq.Header.Set("Content-Type", "application/json")

	authHeader := clientReq.Header.Get("Authorization")
	groupID := clientReq.Header.Get("x-group-id")
	log.Printf("[AI_PROXY][OUTBOUND] Target: %s %s | Auth: %t | GroupID: %s | Stream: %t | Timeout: %s",
		method, redactURL(targetURL), authHeader != "", groupID, isStream, requestTimeout)

	client := &http.Client{
		Timeout:   requestTimeout,
		Transport: newAIProxyTransport(cfg, requestTimeout),
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}

	resp, err := client.Do(clientReq)
	if err != nil {
		log.Printf("[AI_PROXY][ERROR] Connection failed: %v", err)
		writeSecurityError(c, http.StatusGatewayTimeout, "AI_PROXY_UPSTREAM_TIMEOUT", "无法连接上游模型服务")
		return
	}
	defer resp.Body.Close()

	for k, v := range resp.Header {
		if k == "Content-Type" || k == "Cache-Control" || k == "Connection" || k == "Transfer-Encoding" {
			c.Header(k, v[0])
		}
	}

	contentType := strings.ToLower(resp.Header.Get("Content-Type"))
	if isStream || strings.Contains(contentType, "text/event-stream") {
		streamUpstreamResponse(c, resp)
		return
	}

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		writeSecurityError(c, http.StatusInternalServerError, "AI_PROXY_READ_FAIL", "读取上游响应失败")
		return
	}

	if resp.StatusCode != http.StatusOK {
		log.Printf("[AI_PROXY][UPSTREAM_FAIL] Status: %d | Target: %s | Bytes: %d", resp.StatusCode, redactURL(targetURL), len(respBody))
	}

	c.Data(resp.StatusCode, resp.Header.Get("Content-Type"), respBody)
}

func validateProxyMethod(method string) (string, error) {
	m := strings.ToUpper(strings.TrimSpace(method))
	if m != http.MethodPost {
		return "", fmt.Errorf("method %q is not allowed", method)
	}
	return m, nil
}

func validateTargetURL(raw string, cfg aiProxySecurityConfig) (string, error) {
	u, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return "", fmt.Errorf("invalid url")
	}
	if !strings.EqualFold(u.Scheme, "https") {
		return "", fmt.Errorf("only https target is allowed")
	}
	host := strings.ToLower(strings.TrimSpace(u.Hostname()))
	if host == "" {
		return "", fmt.Errorf("missing target host")
	}

	if u.Port() != "" && u.Port() != "443" {
		return "", fmt.Errorf("target port %s is not allowed", u.Port())
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
		return u.String(), nil
	}

	ips, err := net.LookupIP(host)
	if err != nil {
		return "", fmt.Errorf("dns resolve failed")
	}
	if len(ips) == 0 {
		return "", fmt.Errorf("dns has no records")
	}
	// 只有在没开启允许私有 IP 的情况下才执行 SSRF 保护检查
	if !cfg.AllowPrivateIP {
		for _, ip := range ips {
			if isPrivateOrBlockedIP(ip) {
				return "", fmt.Errorf("resolved ip is private or blocked")
			}
		}
	}

	return u.String(), nil
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
			conn, err := dial(ctx, network, net.JoinHostPort(ip.String(), port))
			if err == nil {
				return conn, nil
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

	addrs, err := lookup(ctx, host)
	if err != nil {
		return nil, fmt.Errorf("dns resolve failed")
	}
	ips := make([]net.IP, 0, len(addrs))
	for _, addr := range addrs {
		if addr.IP != nil {
			ips = append(ips, addr.IP)
		}
	}
	return ips, nil
}

func isHostAllowed(host string, allowed []string) bool {
	for _, h := range allowed {
		if host == strings.ToLower(strings.TrimSpace(h)) {
			return true
		}
	}
	return false
}

func isPrivateOrBlockedIP(ip net.IP) bool {
	if ip == nil {
		return true
	}
	// Normalize IPv4-mapped IPv6 addresses such as ::ffff:47.89.128.168
	// so public IPv4 endpoints are not misclassified by the ::ffff:0:0/96 blocklist.
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

func filterAllowedHeaders(in map[string]string) map[string]string {
	out := make(map[string]string)
	for k, v := range in {
		kl := strings.ToLower(strings.TrimSpace(k))
		if _, ok := allowedOutboundHeaders[kl]; ok {
			out[k] = strings.TrimSpace(v)
		}
	}
	return out
}

func writeSecurityError(c *gin.Context, status int, code string, msg string) {
	c.JSON(status, gin.H{
		"code":  code,
		"error": msg,
	})
}

func redactURL(raw string) string {
	u, err := url.Parse(raw)
	if err != nil {
		return "invalid-url"
	}
	return fmt.Sprintf("%s://%s%s", u.Scheme, u.Host, u.Path)
}

func getAIProxySecurityConfig() aiProxySecurityConfig {
	allowedHosts := []string{
		"api.openai.com",
		"generativelanguage.googleapis.com",
		"api.minimax.io",
		"api.minimaxi.com",
	}
	if v := strings.TrimSpace(os.Getenv("AI_PROXY_ALLOWED_HOSTS")); v != "" {
		parts := strings.Split(v, ",")
		next := make([]string, 0, len(parts))
		for _, p := range parts {
			p = strings.ToLower(strings.TrimSpace(p))
			if p != "" {
				next = append(next, p)
			}
		}
		if len(next) > 0 {
			allowedHosts = next
		}
	}

	timeout := 30 * time.Second
	if v := strings.TrimSpace(os.Getenv("AI_PROXY_TIMEOUT_MS")); v != "" {
		if ms, err := strconv.Atoi(v); err == nil && ms > 0 {
			timeout = time.Duration(ms) * time.Millisecond
		}
	}
	streamTimeout := 120 * time.Second
	if v := strings.TrimSpace(os.Getenv("AI_PROXY_STREAM_TIMEOUT_MS")); v != "" {
		if ms, err := strconv.Atoi(v); err == nil && ms > 0 {
			streamTimeout = time.Duration(ms) * time.Millisecond
		}
	}

	maxBody := 256 * 1024
	if v := strings.TrimSpace(os.Getenv("AI_PROXY_MAX_BODY_BYTES")); v != "" {
		if b, err := strconv.Atoi(v); err == nil && b > 0 {
			maxBody = b
		}
	}

	allowPrivateIP := false
	if v := strings.TrimSpace(os.Getenv("AI_PROXY_ALLOW_PRIVATE_IP")); v != "" {
		allowPrivateIP, _ = strconv.ParseBool(v)
	}

	return aiProxySecurityConfig{
		AllowedHosts:   allowedHosts,
		Timeout:        timeout,
		StreamTimeout:  streamTimeout,
		MaxBodyBytes:   maxBody,
		AllowPrivateIP: allowPrivateIP,
	}
}

func isStreamProxyRequest(body interface{}) bool {
	bodyMap, ok := body.(map[string]interface{})
	if !ok {
		return false
	}
	streamFlag, exists := bodyMap["stream"]
	if !exists {
		return false
	}
	stream, ok := streamFlag.(bool)
	return ok && stream
}

func streamUpstreamResponse(c *gin.Context, resp *http.Response) {
	c.Header("Cache-Control", "no-cache, no-transform")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")
	c.Status(resp.StatusCode)

	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		if _, err := io.Copy(c.Writer, resp.Body); err != nil {
			log.Printf("[AI_PROXY][STREAM_ERROR] fallback copy failed: %v", err)
		}
		return
	}

	buf := make([]byte, 4*1024)
	for {
		if err := c.Request.Context().Err(); err != nil {
			return
		}

		n, err := resp.Body.Read(buf)
		if n > 0 {
			if _, writeErr := c.Writer.Write(buf[:n]); writeErr != nil {
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
	for _, c := range cidrs {
		_, n, err := net.ParseCIDR(c)
		if err != nil {
			panic("invalid cidr: " + c)
		}
		result = append(result, n)
	}
	return result
}
