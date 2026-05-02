package handlers

import (
	"log"
	"net/http"
	"xdfc-server/authz"
	"xdfc-server/db"
	"xdfc-server/middleware"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
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

	access := buildGlobalSearchAccess(c)
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

		switch item.Category {
		case services.SearchCategorySalesOrder:
			if !access.canSalesOrder {
				continue
			}
			salesOrderIDs = append(salesOrderIDs, item.ID)
		case services.SearchCategoryPurchaseOrder:
			if !access.canPurchaseOrder {
				continue
			}
			purchaseOrderIDs = append(purchaseOrderIDs, item.ID)
		case services.SearchCategorySupplier:
			if !access.canSupplier {
				continue
			}
			supplierIDs = append(supplierIDs, item.ID)
		case services.SearchCategoryApprovalRequest:
			if !access.canApprovalRequest {
				continue
			}
			approvalRequestIDs = append(approvalRequestIDs, item.ID)
		default:
			if !access.canInventory {
				continue
			}
			inventoryIDs = append(inventoryIDs, item.ID)
		}
		matches = append(matches, match)
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
		if err := db.DB.Where("id IN ?", salesOrderIDs).Find(&salesOrders).Error; err != nil {
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
		if err := db.DB.Where("id IN ?", purchaseOrderIDs).Find(&purchaseOrders).Error; err != nil {
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
		if err := db.DB.Where("id IN ?", supplierIDs).Find(&suppliers).Error; err != nil {
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
		query := db.DB.Where("id IN ?", approvalRequestIDs)
		query = applyGlobalSearchApprovalScope(query, access)
		if err := query.Find(&approvalRequests).Error; err != nil {
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

type globalSearchAccess struct {
	userID             string
	canInventory       bool
	canSalesOrder      bool
	canPurchaseOrder   bool
	canSupplier        bool
	canApprovalRequest bool
	canAllApprovals    bool
}

func buildGlobalSearchAccess(c *gin.Context) globalSearchAccess {
	hasManage := middleware.HasAnyPermission(c, authz.PermissionManage)
	return globalSearchAccess{
		userID:             middleware.GetSafeUserID(c),
		canInventory:       hasManage || middleware.HasAnyPermission(c, authz.MenuWarehouse),
		canSalesOrder:      hasManage || middleware.HasAnyPermission(c, authz.MenuTrading),
		canPurchaseOrder:   hasManage || middleware.HasAnyPermission(c, authz.MenuPurchase),
		canSupplier:        hasManage || middleware.HasAnyPermission(c, authz.MenuPurchase),
		canApprovalRequest: hasManage || middleware.HasAnyPermission(c, authz.MenuApproval, authz.ActionApprovalReview),
		canAllApprovals:    hasManage,
	}
}

func applyGlobalSearchApprovalScope(query *gorm.DB, access globalSearchAccess) *gorm.DB {
	if access.canAllApprovals {
		return query
	}
	if access.userID == "" {
		return query.Where("1 = 0")
	}
	return query.Where(
		`requester_id = ?
		 OR approver1_id = ?
		 OR approver2_id = ?`,
		access.userID, access.userID, access.userID,
	)
}
