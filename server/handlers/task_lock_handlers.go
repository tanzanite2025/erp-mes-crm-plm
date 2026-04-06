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
	err := runWithTaskLock(ExchangeRatesSyncLockKey, ExchangeRatesSyncLockTTL, func() error {
		SyncExchangeRates(c)
		return nil
	})
	if err == nil {
		return
	}

	if errors.Is(err, db.ErrLockBusy) || errors.Is(err, redis.Nil) {
		c.JSON(http.StatusConflict, gin.H{"error": "Exchange rate sync is already running"})
		return
	}

	c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to acquire exchange-rate sync lock: " + err.Error()})
}
