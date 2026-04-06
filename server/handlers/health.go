package handlers

import (
	"context"
	"net/http"
	"os"
	"runtime"
	"time"
	"xdfc-server/db"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

var GlobalStartTime = time.Now()

type healthDBStatus struct {
	Status          string `json:"status"`
	OpenConnections int    `json:"openConnections,omitempty"`
	InUse           int    `json:"inUse,omitempty"`
	Idle            int    `json:"idle,omitempty"`
	WaitCount       int64  `json:"waitCount,omitempty"`
}

type healthRedisStatus struct {
	Status string `json:"status"`
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

	var mem runtime.MemStats
	runtime.ReadMemStats(&mem)

	c.JSON(http.StatusOK, gin.H{
		"identity": gin.H{
			"hostname": hostname,
			"os":       runtime.GOOS,
			"arch":     runtime.GOARCH,
			"runtime":  runtime.Version(),
			"uptime":   time.Since(GlobalStartTime).String(),
		},
		"resources": gin.H{
			"cpu_cores": runtime.NumCPU(),
			"memory": gin.H{
				"alloc_mb":   mem.Alloc / 1024 / 1024,
				"sys_mb":     mem.Sys / 1024 / 1024,
				"num_gc":     mem.NumGC,
				"goroutines": runtime.NumGoroutine(),
			},
		},
		"infrastructure": gin.H{
			"db":    dbStatus,
			"redis": redisStatus,
		},
		"time": time.Now().Format(time.RFC3339),
	})
}
