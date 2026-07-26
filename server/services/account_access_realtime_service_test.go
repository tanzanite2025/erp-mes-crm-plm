package services

import (
	"testing"
	"xdfc-server/models"
)

type capturedAccountAccessRealtimeMessage struct {
	module     string
	action     string
	title      string
	targetUser string
	data       interface{}
}

func withCapturedAccountAccessRealtimePublisher(t *testing.T) *[]capturedAccountAccessRealtimeMessage {
	t.Helper()

	messages := make([]capturedAccountAccessRealtimeMessage, 0)
	original := accountAccessRealtimePublisher
	accountAccessRealtimePublisher = func(module, action, title, targetUser string, data interface{}) error {
		messages = append(messages, capturedAccountAccessRealtimeMessage{
			module:     module,
			action:     action,
			title:      title,
			targetUser: targetUser,
			data:       data,
		})
		return nil
	}
	t.Cleanup(func() {
		accountAccessRealtimePublisher = original
	})
	return &messages
}

func TestNotifyAccountAccessSnapshotInvalidatedForUserPublishesAccountScopedPayload(t *testing.T) {
	messages := withCapturedAccountAccessRealtimePublisher(t)

	NotifyAccountAccessSnapshotInvalidatedForUser(models.User{
		ID:       "account-1",
		Username: "alice",
	}, AccountAccessInvalidationReasonDirectPermissionsReplaced)

	if len(*messages) != 1 {
		t.Fatalf("expected one realtime message, got %d", len(*messages))
	}
	message := (*messages)[0]
	if message.module != accountAccessRealtimeModule || message.action != accountAccessRealtimeAction {
		t.Fatalf("unexpected envelope module/action: %+v", message)
	}
	if message.targetUser != "account-1" {
		t.Fatalf("expected account id as websocket target, got %q", message.targetUser)
	}

	payload, ok := message.data.(AccountAccessSnapshotInvalidationPayload)
	if !ok {
		t.Fatalf("unexpected payload type %T", message.data)
	}
	if payload.AccountID != "account-1" || payload.Username != "alice" {
		t.Fatalf("unexpected account payload: %+v", payload)
	}
	if payload.Reason != string(AccountAccessInvalidationReasonDirectPermissionsReplaced) {
		t.Fatalf("unexpected reason: %+v", payload)
	}
	if payload.PermissionPresetID != "" {
		t.Fatalf("direct account permission invalidation must not include permission preset id: %+v", payload)
	}
	if payload.ChangedAt == "" {
		t.Fatalf("changedAt should be populated")
	}
}

func TestNotifyAccountAccessSnapshotInvalidatedForPermissionPresetAccountsDeduplicatesTargets(t *testing.T) {
	messages := withCapturedAccountAccessRealtimePublisher(t)

	NotifyAccountAccessSnapshotInvalidatedForPermissionPresetAccounts([]models.User{
		{ID: "account-1", Username: "alice"},
		{ID: "account-1", Username: "alice-duplicate"},
		{ID: "account-2", Username: "bob"},
	}, AccountAccessInvalidationReasonPermissionPresetPermissionsChanged, " Sales ")

	if len(*messages) != 2 {
		t.Fatalf("expected two deduplicated realtime messages, got %d", len(*messages))
	}
	for _, message := range *messages {
		payload, ok := message.data.(AccountAccessSnapshotInvalidationPayload)
		if !ok {
			t.Fatalf("unexpected payload type %T", message.data)
		}
		if payload.PermissionPresetID != "sales" {
			t.Fatalf("permission preset id should be normalized, got %+v", payload)
		}
		if payload.Reason != string(AccountAccessInvalidationReasonPermissionPresetPermissionsChanged) {
			t.Fatalf("unexpected reason: %+v", payload)
		}
	}
}
