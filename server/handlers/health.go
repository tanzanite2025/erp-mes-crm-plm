package handlers

import (
	"context"
	"net/http"
	"os"
	"runtime"
	"strconv"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

var GlobalStartTime = time.Now()

type healthDBStatus struct {
	Status             string `json:"status"`
	OpenConnections    int    `json:"openConnections,omitempty"`
	MaxOpenConnections int    `json:"maxOpenConnections,omitempty"`
	InUse              int    `json:"inUse,omitempty"`
	Idle               int    `json:"idle,omitempty"`
	WaitCount          int64  `json:"waitCount,omitempty"`
}

type healthRedisStatus struct {
	Status string `json:"status"`
}

type systemDBStatus struct {
	Status             string `json:"status"`
	OpenConns          int    `json:"open_conns,omitempty"`
	MaxOpenConnections int    `json:"max_open_connections,omitempty"`
	InUse              int    `json:"in_use,omitempty"`
	Idle               int    `json:"idle,omitempty"`
	WaitCount          int64  `json:"wait_count,omitempty"`
}

type systemComponentStatus struct {
	Status string `json:"status"`
	Detail string `json:"detail,omitempty"`
}

type systemComponents struct {
	Postgres systemComponentStatus `json:"postgres"`
	Redis    systemComponentStatus `json:"redis"`
	Watchdog systemComponentStatus `json:"watchdog"`
	Loki     systemComponentStatus `json:"loki"`
}

type systemStatusResponse struct {
	Identity struct {
		Hostname    string `json:"hostname"`
		OS          string `json:"os"`
		Arch        string `json:"arch"`
		Runtime     string `json:"runtime"`
		Uptime      string `json:"uptime"`
		Environment string `json:"environment"`
	} `json:"identity"`
	Resources struct {
		CPUCores int `json:"cpu_cores"`
		Memory   struct {
			AllocMB          uint64 `json:"alloc_mb"`
			SysMB            uint64 `json:"sys_mb"`
			ContainerUsedMB  uint64 `json:"container_used_mb,omitempty"`
			ContainerLimitMB uint64 `json:"container_limit_mb,omitempty"`
			NumGC            uint32 `json:"num_gc"`
			Goroutines       int    `json:"goroutines"`
		} `json:"memory"`
	} `json:"resources"`
	Infrastructure struct {
		DB    systemDBStatus    `json:"db"`
		Redis healthRedisStatus `json:"redis"`
	} `json:"infrastructure"`
	Components systemComponents `json:"components"`
	Time       string           `json:"time"`
}

func collectHealthSnapshot(ctx context.Context) (healthDBStatus, healthRedisStatus, int) {
	dbStatus := healthDBStatus{Status: "down"}
	redisStatus := healthRedisStatus{Status: "down"}
	statusCode := http.StatusOK

	if db.DB != nil {
		sqlDB, err := db.DB.DB()
		if err == nil {
			stats := sqlDB.Stats()
			dbStatus.OpenConnections = stats.OpenConnections
			dbStatus.MaxOpenConnections = stats.MaxOpenConnections
			dbStatus.InUse = stats.InUse
			dbStatus.Idle = stats.Idle
			dbStatus.WaitCount = stats.WaitCount
			if err := sqlDB.PingContext(ctx); err == nil {
				dbStatus.Status = "connected"
			}
		}
	}

	if db.RDB == nil {
		redisStatus.Status = "not_initialized"
	} else if err := db.RDB.Ping(ctx).Err(); err == nil {
		redisStatus.Status = "connected"
	}

	if dbStatus.Status != "connected" || redisStatus.Status != "connected" {
		statusCode = http.StatusServiceUnavailable
	}

	return dbStatus, redisStatus, statusCode
}

func containsIntegrityAnomaly(anomalies []string, target string) bool {
	for _, anomaly := range anomalies {
		if anomaly == target {
			return true
		}
	}
	return false
}

func normalizeSystemEnvironment() string {
	environment := strings.TrimSpace(os.Getenv("GIN_MODE"))
	if environment == "" {
		environment = strings.TrimSpace(gin.Mode())
	}
	if environment == "" {
		return "UNKNOWN"
	}
	return strings.ToUpper(environment)
}

func toSystemDBStatus(dbStatus healthDBStatus) systemDBStatus {
	return systemDBStatus{
		Status:             dbStatus.Status,
		OpenConns:          dbStatus.OpenConnections,
		MaxOpenConnections: dbStatus.MaxOpenConnections,
		InUse:              dbStatus.InUse,
		Idle:               dbStatus.Idle,
		WaitCount:          dbStatus.WaitCount,
	}
}

func toComponentStatus(rawStatus string) systemComponentStatus {
	if rawStatus == "connected" {
		return systemComponentStatus{Status: "connected"}
	}
	return systemComponentStatus{Status: "disconnected"}
}

func buildWatchdogComponentStatus(integrity services.IntegrityResult) systemComponentStatus {
	detail := strings.TrimSpace(strings.Join(integrity.Details, " | "))
	if detail == "" && len(integrity.Anomalies) > 0 {
		detail = strings.Join(integrity.Anomalies, " | ")
	}

	if containsIntegrityAnomaly(integrity.Anomalies, "SYSTEM_WATCHDOG_OFFLINE") {
		return systemComponentStatus{Status: "disconnected", Detail: detail}
	}
	if containsIntegrityAnomaly(integrity.Anomalies, "DATA_LINK_ANOMALY") || integrity.IsHealing || len(integrity.Anomalies) > 0 {
		return systemComponentStatus{Status: "warning", Detail: detail}
	}
	return systemComponentStatus{Status: "connected", Detail: detail}
}

func normalizeLokiReadyURL(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	if strings.HasSuffix(raw, "/ready") {
		return raw
	}
	return strings.TrimRight(raw, "/") + "/ready"
}

func probeLokiComponentStatus(ctx context.Context) systemComponentStatus {
	candidates := []string{
		normalizeLokiReadyURL(os.Getenv("LOKI_READY_URL")),
		normalizeLokiReadyURL(os.Getenv("LOKI_URL")),
		"http://127.0.0.1:3100/ready",
		"http://loki:3100/ready",
	}
	seen := make(map[string]struct{}, len(candidates))
	client := &http.Client{}
	lastDetail := ""

	for _, candidate := range candidates {
		candidate = strings.TrimSpace(candidate)
		if candidate == "" {
			continue
		}
		if _, exists := seen[candidate]; exists {
			continue
		}
		seen[candidate] = struct{}{}

		probeCtx, cancel := context.WithTimeout(ctx, 800*time.Millisecond)
		req, err := http.NewRequestWithContext(probeCtx, http.MethodGet, candidate, nil)
		if err != nil {
			cancel()
			lastDetail = err.Error()
			continue
		}

		resp, err := client.Do(req)
		cancel()
		if err != nil {
			lastDetail = err.Error()
			continue
		}
		resp.Body.Close()

		if resp.StatusCode >= http.StatusOK && resp.StatusCode < http.StatusBadRequest {
			return systemComponentStatus{Status: "connected", Detail: candidate}
		}
		lastDetail = resp.Status
	}

	if lastDetail == "" {
		lastDetail = "probe_failed"
	}
	return systemComponentStatus{Status: "disconnected", Detail: lastDetail}
}

func readUint64File(path string) (uint64, bool) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return 0, false
	}
	value := strings.TrimSpace(string(raw))
	if value == "" || value == "max" {
		return 0, false
	}
	parsed, err := strconv.ParseUint(value, 10, 64)
	if err != nil {
		return 0, false
	}
	return parsed, true
}

func bytesToMB(bytes uint64) uint64 {
	return bytes / 1024 / 1024
}

func collectContainerMemorySnapshot() (uint64, uint64) {
	const noPracticalLimitBytes uint64 = 1 << 60

	var usedBytes uint64
	for _, path := range []string{
		"/sys/fs/cgroup/memory.current",
		"/sys/fs/cgroup/memory/memory.usage_in_bytes",
	} {
		if value, ok := readUint64File(path); ok {
			usedBytes = value
			break
		}
	}

	var limitBytes uint64
	for _, path := range []string{
		"/sys/fs/cgroup/memory.max",
		"/sys/fs/cgroup/memory/memory.limit_in_bytes",
	} {
		if value, ok := readUint64File(path); ok && value < noPracticalLimitBytes {
			limitBytes = value
			break
		}
	}

	return bytesToMB(usedBytes), bytesToMB(limitBytes)
}

func HealthHandler(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	dbStatus, redisStatus, statusCode := collectHealthSnapshot(ctx)
	c.JSON(statusCode, gin.H{
		"status":    "up",
		"env":       gin.Mode(),
		"integrity": services.AuditSystemIntegrity(),
		"db":        dbStatus,
		"redis":     redisStatus,
		"time":      time.Now().Format(time.RFC3339),
	})
}

func SystemStatusHandler(c *gin.Context) {
	hostname, _ := os.Hostname()
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	dbStatus, redisStatus, _ := collectHealthSnapshot(ctx)
	integrity := services.AuditSystemIntegrity()

	var mem runtime.MemStats
	runtime.ReadMemStats(&mem)
	containerUsedMB, containerLimitMB := collectContainerMemorySnapshot()

	response := systemStatusResponse{}
	response.Identity.Hostname = hostname
	response.Identity.OS = runtime.GOOS
	response.Identity.Arch = runtime.GOARCH
	response.Identity.Runtime = runtime.Version()
	response.Identity.Uptime = time.Since(GlobalStartTime).String()
	response.Identity.Environment = normalizeSystemEnvironment()
	response.Resources.CPUCores = runtime.NumCPU()
	response.Resources.Memory.AllocMB = mem.Alloc / 1024 / 1024
	response.Resources.Memory.SysMB = mem.Sys / 1024 / 1024
	response.Resources.Memory.ContainerUsedMB = containerUsedMB
	response.Resources.Memory.ContainerLimitMB = containerLimitMB
	response.Resources.Memory.NumGC = mem.NumGC
	response.Resources.Memory.Goroutines = runtime.NumGoroutine()
	response.Infrastructure.DB = toSystemDBStatus(dbStatus)
	response.Infrastructure.Redis = redisStatus
	response.Components.Postgres = toComponentStatus(dbStatus.Status)
	response.Components.Redis = toComponentStatus(redisStatus.Status)
	response.Components.Watchdog = buildWatchdogComponentStatus(integrity)
	response.Components.Loki = probeLokiComponentStatus(ctx)
	response.Time = time.Now().Format(time.RFC3339)

	c.JSON(http.StatusOK, response)
}
