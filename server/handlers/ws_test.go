package handlers

import "testing"

func TestShouldDeliverNotificationMatchesUserIdentityKeys(t *testing.T) {
	client := &Client{
		UserID:   "user-001",
		Username: "alice",
	}

	for _, target := range []string{"user-001", "alice"} {
		if !shouldDeliverNotification(client, target) {
			t.Fatalf("expected target %q to be delivered", target)
		}
	}

	if shouldDeliverNotification(client, "bob") {
		t.Fatalf("expected unrelated target not to be delivered")
	}
}

func TestShouldDeliverNotificationMatchesPermissionTarget(t *testing.T) {
	client := &Client{
		UserID:   "user-001",
		Username: "alice",
		Permissions: map[string]struct{}{
			"menu_approval": {},
		},
	}

	if !shouldDeliverNotification(client, "permission:menu_approval") {
		t.Fatalf("expected permission target to be delivered")
	}
}
