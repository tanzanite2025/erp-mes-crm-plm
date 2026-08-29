package queue

import (
	"os"
	"path/filepath"
	"testing"
)

func TestStoreRecordFailureUpdatesExistingItem(t *testing.T) {
	root := t.TempDir()
	store, err := New(filepath.Join(root, "queue"), filepath.Join(root, "dead"), 10, 3)
	if err != nil {
		t.Fatalf("create store: %v", err)
	}

	item, err := store.Enqueue("status", "ATT-01", map[string]string{"status": "offline"})
	if err != nil {
		t.Fatalf("enqueue: %v", err)
	}
	if err := store.RecordFailure(item, "ERP unavailable"); err != nil {
		t.Fatalf("record failure: %v", err)
	}

	items, err := store.List()
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(items) != 1 || items[0].Attempts != 1 || items[0].LastError != "ERP unavailable" {
		t.Fatalf("unexpected retry item: %#v", items)
	}
	if _, err := os.Stat(filepath.Join(root, "queue", item.ID+".json")); err != nil {
		t.Fatalf("updated queue item is missing: %v", err)
	}
}

func TestStoreMovesItemToDeadLetterAfterRetryLimit(t *testing.T) {
	root := t.TempDir()
	store, err := New(filepath.Join(root, "queue"), filepath.Join(root, "dead"), 10, 2)
	if err != nil {
		t.Fatalf("create store: %v", err)
	}

	item, err := store.Enqueue("events", "ATT-01", map[string]string{"event": "punch"})
	if err != nil {
		t.Fatalf("enqueue: %v", err)
	}
	if err := store.RecordFailure(item, "first"); err != nil {
		t.Fatalf("first failure: %v", err)
	}
	items, err := store.List()
	if err != nil {
		t.Fatalf("list after first failure: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("expected one pending item, got %d", len(items))
	}
	if err := store.RecordFailure(items[0], "second"); err != nil {
		t.Fatalf("second failure: %v", err)
	}

	pending, err := store.List()
	if err != nil {
		t.Fatalf("list pending: %v", err)
	}
	if len(pending) != 0 {
		t.Fatalf("expected no pending items, got %d", len(pending))
	}
	deadItems, err := os.ReadDir(filepath.Join(root, "dead"))
	if err != nil {
		t.Fatalf("read dead letter directory: %v", err)
	}
	if len(deadItems) != 1 {
		t.Fatalf("expected one dead-letter item, got %d", len(deadItems))
	}
}

func TestStoreMovesItemToDeadLetterImmediately(t *testing.T) {
	root := t.TempDir()
	store, err := New(filepath.Join(root, "queue"), filepath.Join(root, "dead"), 10, 3)
	if err != nil {
		t.Fatalf("create store: %v", err)
	}

	item, err := store.Enqueue("events", "ATT-01", map[string]string{"event": "punch"})
	if err != nil {
		t.Fatalf("enqueue: %v", err)
	}
	if err := store.MoveToDead(item, "device disabled"); err != nil {
		t.Fatalf("move to dead letter: %v", err)
	}

	pending, err := store.List()
	if err != nil {
		t.Fatalf("list pending: %v", err)
	}
	if len(pending) != 0 {
		t.Fatalf("expected no pending items, got %d", len(pending))
	}
	deadItems, err := os.ReadDir(filepath.Join(root, "dead"))
	if err != nil {
		t.Fatalf("read dead letter directory: %v", err)
	}
	if len(deadItems) != 1 {
		t.Fatalf("expected one dead-letter item, got %d", len(deadItems))
	}
}
