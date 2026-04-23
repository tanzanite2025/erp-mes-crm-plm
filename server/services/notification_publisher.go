package services

import (
	"context"
	"encoding/json"
	"xdfc-server/db"
)

const notificationChannel = "xdfc_notifications"

func PublishNotification(module, action, title, targetUser string, data interface{}) error {
	if db.RDB == nil {
		return nil
	}

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
	return db.RDB.Publish(context.Background(), notificationChannel, string(jsonBytes)).Err()
}

func PublishCacheInvalidate(module string) error {
	if db.RDB == nil {
		return nil
	}

	msg := map[string]interface{}{
		"type":   "CACHE_INVALIDATE",
		"module": module,
	}
	jsonBytes, err := json.Marshal(msg)
	if err != nil {
		return err
	}
	return db.RDB.Publish(context.Background(), notificationChannel, string(jsonBytes)).Err()
}
