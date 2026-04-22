package handlers

import (
	"log"
	"net/http"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func GlobalSearchHandler(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusOK, gin.H{"data": []interface{}{}})
		return
	}

	if services.GlobalSearchClient == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "search service not initialized"})
		return
	}

	searchRes, err := services.GlobalSearchClient.Search(query)
	if err != nil {
		log.Printf("[SEARCH_ERROR] Search failed for query '%s': %v", query, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "search execution failed"})
		return
	}

	if len(searchRes.Items) == 0 {
		c.JSON(http.StatusOK, gin.H{"data": []interface{}{}})
		return
	}

	matches := make([]globalSearchMatch, 0, len(searchRes.Items))
	inventoryIDs := make([]string, 0, len(searchRes.Items))
	salesOrderIDs := make([]string, 0, len(searchRes.Items))
	purchaseOrderIDs := make([]string, 0, len(searchRes.Items))
	supplierIDs := make([]string, 0, len(searchRes.Items))
	approvalRequestIDs := make([]string, 0, len(searchRes.Items))

	for _, item := range searchRes.Items {
		match := globalSearchMatch{
			ID:       item.ID,
			Category: item.Category,
			Score:    item.Score,
		}
		matches = append(matches, match)

		switch item.Category {
		case services.SearchCategorySalesOrder:
			salesOrderIDs = append(salesOrderIDs, item.ID)
		case services.SearchCategoryPurchaseOrder:
			purchaseOrderIDs = append(purchaseOrderIDs, item.ID)
		case services.SearchCategorySupplier:
			supplierIDs = append(supplierIDs, item.ID)
		case services.SearchCategoryApprovalRequest:
			approvalRequestIDs = append(approvalRequestIDs, item.ID)
		default:
			inventoryIDs = append(inventoryIDs, item.ID)
		}
	}

	inventoryByID := make(map[string]models.Inventory)
	if len(inventoryIDs) > 0 {
		var inventories []models.Inventory
		if err := db.DB.Where("id IN ?", inventoryIDs).Find(&inventories).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "data hydration failed"})
			return
		}
		for _, inventory := range inventories {
			inventoryByID[inventory.ID] = inventory
		}
	}

	salesOrderByID := make(map[string]models.SalesOrder)
	if len(salesOrderIDs) > 0 {
		var salesOrders []models.SalesOrder
		if err := db.DB.Where("id IN ? AND is_deleted = ?", salesOrderIDs, false).Find(&salesOrders).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "data hydration failed"})
			return
		}
		for _, order := range salesOrders {
			salesOrderByID[order.ID] = order
		}
	}

	purchaseOrderByID := make(map[string]models.PurchaseOrder)
	if len(purchaseOrderIDs) > 0 {
		var purchaseOrders []models.PurchaseOrder
		if err := db.DB.Where("id IN ? AND is_deleted = ?", purchaseOrderIDs, false).Find(&purchaseOrders).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "data hydration failed"})
			return
		}
		for _, order := range purchaseOrders {
			purchaseOrderByID[order.ID] = order
		}
	}

	supplierByID := make(map[string]models.Supplier)
	if len(supplierIDs) > 0 {
		var suppliers []models.Supplier
		if err := db.DB.Where("id IN ? AND is_deleted = ?", supplierIDs, false).Find(&suppliers).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "data hydration failed"})
			return
		}
		for _, supplier := range suppliers {
			supplierByID[supplier.ID] = supplier
		}
	}

	approvalRequestByID := make(map[string]models.ApprovalRequest)
	if len(approvalRequestIDs) > 0 {
		var approvalRequests []models.ApprovalRequest
		if err := db.DB.Where("id IN ?", approvalRequestIDs).Find(&approvalRequests).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "data hydration failed"})
			return
		}
		for _, request := range approvalRequests {
			approvalRequestByID[request.ID] = request
		}
	}

	results := mapGlobalSearchMatches(matches, inventoryByID, salesOrderByID, purchaseOrderByID, supplierByID, approvalRequestByID)

	c.JSON(http.StatusOK, gin.H{"data": results})
}
