package handlers

import (
	"context"
	"errors"
	"net/http"
	"time"
	"xdfc-server/db"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

const (
	ExchangeRatesSyncLockKey = "task:exchange-rates-sync"
	ModularBackupLockKey     = "task:modular-backup"
)

var (
	ExchangeRatesSyncLockTTL = 30 * time.Minute
	ModularBackupLockTTL     = 6 * time.Hour
)

func runWithTaskLock(lockKey string, lockTTL time.Duration, fn func() error) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	return db.WithLock(ctx, lockKey, lockTTL, fn)
}

// SyncExchangeRatesWithLock ensures manual trigger shares the same lock as cron trigger.
func SyncExchangeRatesWithLock(c *gin.Context) {
	var syncedCount int
	ctx := auditContextFromGin(c)
	err := runWithTaskLock(ExchangeRatesSyncLockKey, ExchangeRatesSyncLockTTL, func() error {
		count, err := RunExchangeRateSyncWithContext(ctx)
		if err != nil {
			return err
		}
		syncedCount = count
		return nil
	})
	if err == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Exchange rates synced successfully", "count": syncedCount})
		return
	}

	if errors.Is(err, db.ErrLockBusy) || errors.Is(err, redis.Nil) {
		c.JSON(http.StatusConflict, gin.H{"error": "Exchange rate sync is already running"})
		return
	}

	respondExchangeRateSyncError(c, err)
}
