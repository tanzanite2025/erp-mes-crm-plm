package services

import (
	"context"
	"encoding/json"
	"sync"
	"xdfc-server/db"
)

const notificationChannel = "xdfc_notifications"

type notificationPublisher func(ctx context.Context, channel string, payload string) error

var (
	notificationPublisherMu      sync.RWMutex
	currentNotificationPublisher notificationPublisher = publishNotificationToRedis
)

func PublishNotification(module, action, title, targetUser string, data interface{}) error {
	msg := map[string]interface{}{
		"module":     module,
		"action":     action,
		"title":      title,
		"targetUser": targetUser,
		"payload":    data,
	}
	jsonBytes, err := json.Marshal(msg)
	if err != nil {
		return err
	}
	return publishNotificationPayload(context.Background(), notificationChannel, string(jsonBytes))
}

func PublishCacheInvalidate(module string) error {
	msg := map[string]interface{}{
		"type":   "CACHE_INVALIDATE",
		"module": module,
	}
	jsonBytes, err := json.Marshal(msg)
	if err != nil {
		return err
	}
	return publishNotificationPayload(context.Background(), notificationChannel, string(jsonBytes))
}

func publishNotificationPayload(ctx context.Context, channel string, payload string) error {
	notificationPublisherMu.RLock()
	publisher := currentNotificationPublisher
	notificationPublisherMu.RUnlock()
	if publisher == nil {
		return nil
	}
	return publisher(ctx, channel, payload)
}

func publishNotificationToRedis(ctx context.Context, channel string, payload string) error {
	if db.RDB == nil {
		return nil
	}
	return db.RDB.Publish(ctx, channel, payload).Err()
}
