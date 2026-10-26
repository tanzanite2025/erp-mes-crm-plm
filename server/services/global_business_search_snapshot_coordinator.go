package services

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"time"
	"xdfc-server/db"

	"gorm.io/gorm"
)

// Central table invalidation also covers order lines, renamed partners and new
// sources. Periodic reconciliation repairs raw SQL writes and sidecar restarts.
func registerGlobalBusinessSearchTableInvalidation(database *gorm.DB, refreshRequests chan<- struct{}) error {
	tables := map[string]bool{}
	for _, source := range globalBusinessSearchSources {
		tables[source.table] = true
		for _, relation := range source.relations {
			tables[relation.table] = true
		}
	}
	invalidate := func(transaction *gorm.DB) {
		if transaction.Error == nil && transaction.Statement != nil && tables[transaction.Statement.Table] {
			select {
			case refreshRequests <- struct{}{}:
			default:
			}
		}
	}
	for _, register := range []func() error{
		func() error {
			return database.Callback().Create().After("gorm:commit_or_rollback_transaction").Register("business_search:invalidate_after_create", invalidate)
		},
		func() error {
			return database.Callback().Update().After("gorm:commit_or_rollback_transaction").Register("business_search:invalidate_after_update", invalidate)
		},
		func() error {
			return database.Callback().Delete().After("gorm:commit_or_rollback_transaction").Register("business_search:invalidate_after_delete", invalidate)
		},
	} {
		if err := register(); err != nil {
			return err
		}
	}
	return nil
}

// RebuildGlobalBusinessSearchSnapshot publishes only after every catalog source
// and relation was read successfully. Readers keep the previous complete index.
func RebuildGlobalBusinessSearchSnapshot(searchContext context.Context, database *gorm.DB, client *SearchServiceClient) (int, error) {
	if client == nil {
		return 0, fmt.Errorf("Rust search client is not initialized")
	}
	token, err := client.BeginGlobalBusinessSearchSnapshot(searchContext)
	if err != nil {
		return 0, err
	}
	published := false
	defer func() {
		if !published {
			cleanupContext, cancelCleanup := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancelCleanup()
			if abortError := client.AbortGlobalBusinessSearchSnapshot(cleanupContext, token); abortError != nil {
				log.Printf("[SEARCH_REBUILD] discard incomplete snapshot: %v", abortError)
			}
		}
	}()
	total := 0
	snapshotFingerprint := sha256.New()
	documentEncoder := json.NewEncoder(snapshotFingerprint)
	options := &sql.TxOptions{ReadOnly: true}
	if database.Dialector.Name() == "postgres" {
		options.Isolation = sql.LevelRepeatableRead
	}
	err = database.WithContext(searchContext).Transaction(func(transaction *gorm.DB) error {
		for _, source := range globalBusinessSearchSources {
			afterID := ""
			for {
				documents, err := loadGlobalBusinessSearchSourceDocuments(searchContext, transaction, source, afterID, nil, 250)
				if err != nil {
					return err
				}
				if len(documents) == 0 {
					break
				}
				for _, document := range documents {
					if err := documentEncoder.Encode(document); err != nil {
						return err
					}
				}
				if err := client.AppendGlobalBusinessSearchSnapshotBatch(searchContext, token, documents); err != nil {
					return err
				}
				total += len(documents)
				afterID = documents[len(documents)-1].ID
			}
		}
		return nil
	}, options)
	if err != nil {
		return 0, err
	}
	if err := client.PublishGlobalBusinessSearchSnapshot(searchContext, token, fmt.Sprintf("%x", snapshotFingerprint.Sum(nil))); err != nil {
		return 0, err
	}
	published = true
	return total, nil
}

func StartGlobalBusinessSearchSnapshotCoordinator(workerContext context.Context) {
	refreshRequests := make(chan struct{}, 1)
	if err := registerGlobalBusinessSearchTableInvalidation(db.DB, refreshRequests); err != nil {
		log.Fatalf("register business search invalidation: %v", err)
	}
	go func() {
		reconciliationTimer := time.NewTimer(0)
		defer reconciliationTimer.Stop()
		for {
			select {
			case <-workerContext.Done():
				return
			case <-reconciliationTimer.C:
			case <-refreshRequests:
				// Coalesce a burst of writes. A callback inside an explicit outer
				// transaction may precede commit; the periodic snapshot repairs it.
				timer := time.NewTimer(750 * time.Millisecond)
				select {
				case <-timer.C:
				case <-workerContext.Done():
					timer.Stop()
					return
				}
			}
			// Drain signals that precede this snapshot, preserving any new signals
			// received during its construction for the next pass.
			select {
			case <-refreshRequests:
			default:
			}
			rebuildContext, cancelRebuild := context.WithTimeout(workerContext, 2*time.Minute)
			total, err := RebuildGlobalBusinessSearchSnapshot(rebuildContext, db.DB, GlobalSearchClient)
			cancelRebuild()
			interval := 30 * time.Second
			if err != nil {
				log.Printf("[SEARCH_REBUILD] snapshot failed, retrying: %v", err)
				interval = 3 * time.Second
			} else {
				log.Printf("[SEARCH_REBUILD] published complete snapshot (%d records)", total)
			}
			if !reconciliationTimer.Stop() {
				select {
				case <-reconciliationTimer.C:
				default:
				}
			}
			reconciliationTimer.Reset(interval)
		}
	}()
}
