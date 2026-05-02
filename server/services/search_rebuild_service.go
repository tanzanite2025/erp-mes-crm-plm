package services

import (
	"log"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"
)

func RebuildSearchIndex() (int, error) {
	total := 0

	if GlobalSearchClient == nil {
		return total, nil
	}

	var inventories []models.Inventory
	if err := db.DB.Find(&inventories).Error; err != nil {
		return 0, err
	}
	for _, item := range inventories {
		if err := GlobalSearchClient.SyncIndex(inventorySearchDocument(item)); err == nil {
			total++
		}
	}

	var salesOrders []models.SalesOrder
	if err := db.DB.Find(&salesOrders).Error; err != nil {
		return 0, err
	}
	for _, order := range salesOrders {
		if err := GlobalSearchClient.SyncIndex(salesOrderSearchDocument(order)); err == nil {
			total++
		}
	}

	var purchaseOrders []models.PurchaseOrder
	if err := db.DB.Find(&purchaseOrders).Error; err != nil {
		return 0, err
	}
	for _, order := range purchaseOrders {
		if err := GlobalSearchClient.SyncIndex(purchaseOrderSearchDocument(order)); err == nil {
			total++
		}
	}

	var suppliers []models.Supplier
	if err := db.DB.Find(&suppliers).Error; err != nil {
		return 0, err
	}
	for _, supplier := range suppliers {
		if err := GlobalSearchClient.SyncIndex(supplierSearchDocument(supplier)); err == nil {
			total++
		}
	}

	var approvalRequests []models.ApprovalRequest
	if err := db.DB.Find(&approvalRequests).Error; err != nil {
		return 0, err
	}
	for _, request := range approvalRequests {
		if err := GlobalSearchClient.SyncIndex(approvalRequestSearchDocument(request)); err == nil {
			total++
		}
	}

	log.Printf("[SEARCH_REBUILD] Completed re-indexing %d documents", total)
	return total, nil
}

func StartInitialSearchRebuild() {
	if GlobalSearchClient == nil {
		return
	}

	go func() {
		for attempt := 1; attempt <= 5; attempt++ {
			if !GlobalSearchClient.HealthCheck() {
				log.Printf("[SEARCH_REBUILD] search engine not ready on startup attempt %d/5", attempt)
				time.Sleep(2 * time.Second)
				continue
			}

			total, err := RebuildSearchIndex()
			if err != nil {
				log.Printf("[SEARCH_REBUILD] startup rebuild attempt %d/5 failed: %v", attempt, err)
				time.Sleep(2 * time.Second)
				continue
			}

			log.Printf("[SEARCH_REBUILD] startup rebuild succeeded with %d documents", total)
			return
		}

		log.Printf("[SEARCH_REBUILD] startup rebuild exhausted retries")
	}()
}
