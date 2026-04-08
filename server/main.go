package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/handlers"
	"xdfc-server/middleware"
	"xdfc-server/routes"
	"xdfc-server/services"

	"github.com/gin-contrib/gzip"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"
	"github.com/robfig/cron/v3"
	"github.com/rs/zerolog"
	zlog "github.com/rs/zerolog/log"
)

func logMonitoringBootstrapSummary(ginMode, webhookToken string) {
	tokenLoaded := strings.TrimSpace(webhookToken) != ""
	log.Printf("[MONITORING_SUMMARY] mode=%s", ginMode)
	log.Printf("[MONITORING_SUMMARY] alert_webhook_token_loaded=%t", tokenLoaded)
	log.Printf("[MONITORING_SUMMARY] metrics_guard_layer=nginx_or_cloudflare (route=/api/v1/system/metrics)")
	log.Printf("[MONITORING_SUMMARY] alert_webhook_route=/api/v1/system/alerts/webhook (bearer token)")
	log.Printf("[MONITORING_SUMMARY] checklist=docs/ops/monitoring-deploy-checklist.md")
}

func resolveTrustedProxies() []string {
	configured := strings.TrimSpace(os.Getenv("TRUSTED_PROXIES"))
	if configured == "" {
		return []string{
			"127.0.0.1",
			"::1",
			"10.0.0.0/8",
			"172.16.0.0/12",
			"192.168.0.0/16",
		}
	}

	proxies := make([]string, 0)
	for _, item := range strings.Split(configured, ",") {
		if value := strings.TrimSpace(item); value != "" {
			proxies = append(proxies, value)
		}
	}

	return proxies
}

func resolveServerAddr() string {
	port := strings.TrimSpace(os.Getenv("PORT"))
	if port == "" {
		port = "8080"
	}

	if strings.HasPrefix(port, ":") {
		return port
	}

	return ":" + port
}

func isAddrInUseError(err error) bool {
	if err == nil {
		return false
	}

	message := strings.ToLower(err.Error())
	return strings.Contains(message, "address already in use") ||
		strings.Contains(message, "only one usage of each socket address")
}

func localHealthURL(serverAddr string) string {
	normalizedAddr := strings.TrimSpace(serverAddr)
	if normalizedAddr == "" {
		return ""
	}
	if strings.HasPrefix(normalizedAddr, ":") {
		return "http://127.0.0.1" + normalizedAddr + "/api/v1/health"
	}
	return ""
}

func originsMatch(origin, candidate string) bool {
	if origin == candidate {
		return true
	}

	originURL, err := url.Parse(origin)
	if err != nil {
		return false
	}
	candidateURL, err := url.Parse(candidate)
	if err != nil {
		return false
	}

	if !strings.EqualFold(originURL.Scheme, candidateURL.Scheme) {
		return false
	}
	if originURL.Port() != candidateURL.Port() {
		return false
	}

	return loopbackHostsEquivalent(originURL.Hostname(), candidateURL.Hostname())
}

func loopbackHostsEquivalent(left, right string) bool {
	normalizedLeft := strings.ToLower(strings.TrimSpace(left))
	normalizedRight := strings.ToLower(strings.TrimSpace(right))

	if normalizedLeft == normalizedRight {
		return true
	}

	return isLoopbackHost(normalizedLeft) && isLoopbackHost(normalizedRight)
}

func isLoopbackHost(host string) bool {
	switch strings.ToLower(strings.TrimSpace(host)) {
	case "localhost", "127.0.0.1", "::1":
		return true
	default:
		return false
	}
}

func logAddrInUseHint(serverAddr string) {
	healthURL := localHealthURL(serverAddr)
	if healthURL == "" {
		log.Printf("[DEV_HINT] Server address %s is already in use. Check for another local instance or change PORT.", serverAddr)
		return
	}

	client := &http.Client{Timeout: 1500 * time.Millisecond}
	resp, err := client.Get(healthURL)
	if err == nil {
		defer resp.Body.Close()
		if resp.StatusCode == http.StatusOK {
			log.Printf("[DEV_HINT] %s is already serving a healthy XDFC backend on %s. This usually means another local server instance is already running.", serverAddr, healthURL)
			log.Printf("[DEV_HINT] Reuse the existing backend, or stop the old process before starting a new one.")
			return
		}
	}

	log.Printf("[DEV_HINT] Server address %s is already in use, but the existing listener did not respond with a healthy XDFC API.", serverAddr)
	log.Printf("[DEV_HINT] Check which process owns the port, stop it if needed, or change PORT before restarting.")
}

func runCronWithDistributedLock(jobName, lockKey string, lockTTL time.Duration, fn func() error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err := db.WithLock(ctx, lockKey, lockTTL, fn)
	if err == nil {
		return
	}

	if errors.Is(err, db.ErrLockBusy) || errors.Is(err, redis.Nil) {
		log.Printf("[CRON][%s] skipped: lock held by another instance", jobName)
		return
	}

	log.Printf("[CRON][%s][ERROR] failed to execute singleton task: %v", jobName, err)
}

func main() {
	if err := godotenv.Load("../.env.local"); err != nil {
		log.Printf("[INFO] .env.local not found in project root, using system environment variables.")
	}

	middleware.InitJwt()
	services.InitSearchClient()

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("[CRITICAL_SECURITY] DATABASE_URL 环境变量缺失，拒绝启动。请在 .env 文件或环境变量中配置数据库连接字符串。")
	}

	db.InitDB(dsn)
	db.InitRedis()

	go handlers.GlobalHub.Run()
	go handlers.StartRedisSubscriber()

	if err := os.MkdirAll("uploads", 0755); err != nil {
		log.Printf("[WARN] 无法初始化 uploads 目录: %v", err)
	}

	ginMode := os.Getenv("GIN_MODE")
	webhookToken := os.Getenv("ALERT_WEBHOOK_TOKEN")
	if ginMode != "debug" && strings.TrimSpace(webhookToken) == "" {
		log.Fatal("[CRITICAL_SECURITY] ALERT_WEBHOOK_TOKEN is required when GIN_MODE is not debug.")
	}
	if ginMode == "debug" {
		zlog.Logger = zlog.Output(zerolog.ConsoleWriter{Out: os.Stderr, TimeFormat: time.RFC3339})
		gin.SetMode(gin.DebugMode)
	} else {
		zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
		gin.SetMode(gin.ReleaseMode)
	}
	logMonitoringBootstrapSummary(ginMode, webhookToken)

	r := gin.New()
	r.Use(middleware.Logger(), gin.Recovery())

	trustedProxies := resolveTrustedProxies()
	if err := r.SetTrustedProxies(trustedProxies); err != nil {
		log.Fatalf("[CRITICAL_SECURITY] invalid TRUSTED_PROXIES configuration: %v", err)
	}
	log.Printf("[READY] Trusted proxies configured: %s", strings.Join(trustedProxies, ", "))

	r.MaxMultipartMemory = 100 << 20
	r.Use(gzip.Gzip(gzip.DefaultCompression))

	r.Use(func(c *gin.Context) {
		start := time.Now()
		c.Next()
		duration := time.Since(start)
		c.Writer.Header().Set("X-Response-Time", duration.String())
	})

	allowedOriginStr := os.Getenv("ALLOWED_ORIGIN")
	if allowedOriginStr == "" {
		allowedOriginStr = "http://localhost:5173"
	}
	log.Printf("[READY] System Booting up with ALLOWED_ORIGIN: [%s]", allowedOriginStr)

	r.Use(func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		allow := false
		if allowedOriginStr == "*" {
			allow = true
		} else if origin != "" {
			origins := strings.Split(allowedOriginStr, ",")
			for _, item := range origins {
				candidate := strings.TrimSpace(item)
				if candidate != "" && originsMatch(origin, candidate) {
					allow = true
					break
				}
			}
		}

		if allow {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		} else if ginMode == "debug" && origin != "" {
			log.Printf("[CORS_DENIED] Rejected Origin: %s. Expected matches in: %s", origin, allowedOriginStr)
		}

		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE, PATCH")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Expose-Headers", "X-Response-Time")
		c.Writer.Header().Set("Access-Control-Max-Age", "86400")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	c := cron.New(cron.WithLocation(time.FixedZone("CST", 8*3600)))
	_, err := c.AddFunc("0 11 * * *", func() {
		runCronWithDistributedLock("exchange-rates-daily", handlers.ExchangeRatesSyncLockKey, handlers.ExchangeRatesSyncLockTTL, func() error {
			log.Println("[CRON] 触发每日汇率同步任务...")
			handlers.SyncExchangeRates(nil)
			return nil
		})
	})
	if err != nil {
		log.Printf("[WARN] 无法启动汇率同步定时任务: %v", err)
	}

	_, err = c.AddFunc("0 2 * * *", func() {
		runCronWithDistributedLock("modular-backup-daily", handlers.ModularBackupLockKey, handlers.ModularBackupLockTTL, func() error {
			if err := handlers.PerformModularBackup(); err != nil {
				log.Printf("[CRON][BACKUP][CRITICAL] 自动备份执行失败: %v", err)
				return err
			}
			return nil
		})
	})
	if err != nil {
		log.Printf("[WARN] 无法启动自动备份定时任务: %v", err)
	}

	c.Start()
	log.Println("[READY] 定时任务集群已就绪: 汇率 (11:00) | 备份 (02:00)")

	routes.SetupRoutes(r)

	serverAddr := resolveServerAddr()
	log.Printf("Server starting on %s...", serverAddr)
	if err := r.Run(serverAddr); err != nil {
		if isAddrInUseError(err) {
			logAddrInUseHint(serverAddr)
		}
		log.Fatal("Failed to start server:", err)
	}
}
