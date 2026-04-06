package db

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/redis/go-redis/v9"
)

var RDB *redis.Client
var ctx = context.Background()

func redisOptionsFromEnv() (*redis.Options, error) {
	redisURL := strings.TrimSpace(os.Getenv("REDIS_URL"))
	if redisURL != "" {
		normalizedURL := redisURL
		if !strings.Contains(normalizedURL, "://") {
			normalizedURL = "redis://" + normalizedURL
		}

		opts, err := redis.ParseURL(normalizedURL)
		if err != nil {
			return nil, fmt.Errorf("parse REDIS_URL: %w", err)
		}

		// Allow REDIS_PASSWORD override when URL does not include password.
		if opts.Password == "" {
			opts.Password = os.Getenv("REDIS_PASSWORD")
		}

		return opts, nil
	}

	redisHost := os.Getenv("REDIS_HOST")
	if redisHost == "" {
		redisHost = "localhost"
	}

	redisPort := os.Getenv("REDIS_PORT")
	if redisPort == "" {
		redisPort = "6379"
	}

	return &redis.Options{
		Addr:     fmt.Sprintf("%s:%s", redisHost, redisPort),
		Password: os.Getenv("REDIS_PASSWORD"),
		DB:       0,
	}, nil
}

// InitRedis 初始化 Redis 连接
func InitRedis() {
	opts, err := redisOptionsFromEnv()
	if err != nil {
		log.Printf("[REDIS_ERROR] Invalid redis configuration: %v", err)
		// Fallback to localhost to keep process alive for non-Redis features.
		opts = &redis.Options{Addr: "localhost:6379", DB: 0}
	}

	RDB = redis.NewClient(opts)

	if err := RDB.Ping(ctx).Err(); err != nil {
		log.Printf("[REDIS_ERROR] Cannot connect to Redis (%s): %v. Distributed lock and real-time notifications may be unavailable.", opts.Addr, err)
	} else {
		log.Printf("[SUCCESS] Redis connected: %s", opts.Addr)
	}
}
