package db

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

var (
	ErrRedisUnavailable = errors.New("redis client is not initialized")
	ErrLockBusy         = errors.New("distributed lock is already held")
	ErrLockNotOwned     = errors.New("distributed lock ownership lost")
	releaseLockScript   = redis.NewScript(`
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0
`)
)

func lockKey(key string) string {
	return "lock:" + key
}

func generateLockToken() (string, error) {
	token := make([]byte, 16)
	if _, err := rand.Read(token); err != nil {
		return "", fmt.Errorf("generate lock token: %w", err)
	}
	return hex.EncodeToString(token), nil
}

func releaseOwnedLock(ctx context.Context, redisKey, token string) error {
	if RDB == nil {
		return ErrRedisUnavailable
	}

	deleted, err := releaseLockScript.Run(ctx, RDB, []string{redisKey}, token).Int64()
	if err != nil {
		return err
	}
	if deleted == 0 {
		return ErrLockNotOwned
	}
	return nil
}

// AcquireLock keeps compatibility with historical call sites.
func AcquireLock(ctx context.Context, key string, expiration time.Duration) (bool, error) {
	if RDB == nil {
		return false, ErrRedisUnavailable
	}
	return RDB.SetNX(ctx, lockKey(key), "locked", expiration).Result()
}

// ReleaseLock keeps compatibility with historical call sites.
func ReleaseLock(ctx context.Context, key string) error {
	if RDB == nil {
		return ErrRedisUnavailable
	}
	return RDB.Del(ctx, lockKey(key)).Err()
}

// WithLock executes fn under a distributed lock with ownership-safe release.
func WithLock(ctx context.Context, key string, expiration time.Duration, fn func() error) error {
	if RDB == nil {
		return ErrRedisUnavailable
	}

	token, err := generateLockToken()
	if err != nil {
		return err
	}

	redisKey := lockKey(key)
	ok, err := RDB.SetNX(ctx, redisKey, token, expiration).Result()
	if err != nil {
		return err
	}
	if !ok {
		return ErrLockBusy
	}

	fnErr := fn()
	releaseCtx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	releaseErr := releaseOwnedLock(releaseCtx, redisKey, token)
	if fnErr != nil && releaseErr != nil {
		return errors.Join(fnErr, releaseErr)
	}
	if fnErr != nil {
		return fnErr
	}
	return releaseErr
}
