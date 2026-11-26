package handlers

import (
	"errors"
	"net/http"
	"xdfc-server/middleware"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func GetProductionLinesHandler(c *gin.Context) {
	lines, err := services.ListProductionLines()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch production lines"})
		return
	}
	c.JSON(http.StatusOK, services.ProductionLinesResponse{Items: lines})
}

func GetBOMProductionLineOptionsHandler(c *gin.Context) {
	options, err := services.ListActiveBOMProductionLineOptions()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch active production line options"})
		return
	}
	c.JSON(http.StatusOK, services.BOMProductionLineOptionsResponse{Items: options})
}

func SaveProductionLineHandler(c *gin.Context) {
	var input services.SaveProductionLineHandlerRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	line, err := services.SaveProductionLine(services.SaveProductionLineRequest{
		Line:     input.ProductionLineDTO,
		AuthCode: input.AuthCode,
		Operator: middleware.GetSafeUsername(c),
		IP:       c.ClientIP(),
	})
	if err != nil {
		if err == services.ErrProductionLineVersionConflict {
			respondVersionConflict(c)
			return
		}
		if err == services.ErrProductionLineUnauthorized {
			c.JSON(http.StatusForbidden, gin.H{"error": "UNAUTHORIZED", "message": "Topology authorization code is invalid"})
			return
		}
		if errors.Is(err, services.ErrInvalidProductionLine) {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "产线不存在或已删除"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save production line: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, line)
}

func PatchProductionLineHandler(c *gin.Context) {
	var input services.SDRTSDeltaHandlerRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	line, err := services.PatchProductionLine(services.PatchProductionLineRequest{
		ID:       c.Param("id"),
		Delta:    input.Delta,
		Version:  input.Metadata.Version,
		AuthCode: input.Metadata.AuthCode,
		Operator: middleware.GetSafeUsername(c),
		IP:       c.ClientIP(),
	})
	if err != nil {
		if err == services.ErrProductionLineVersionConflict {
			respondVersionConflict(c)
			return
		}
		if err == services.ErrProductionLineUnauthorized {
			c.JSON(http.StatusForbidden, gin.H{"error": "UNAUTHORIZED", "message": "Topology authorization code is invalid"})
			return
		}
		if errors.Is(err, services.ErrInvalidProductionLine) {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "产线不存在或已删除"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to patch production line: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, line)
}

func DeleteProductionLineHandler(c *gin.Context) {
	id := c.Param("id")
	if err := services.DeleteProductionLine(id, middleware.GetSafeUsername(c), c.ClientIP()); err != nil {
		if errors.Is(err, services.ErrProductionLineReferencedByBOM) {
			c.JSON(http.StatusConflict, gin.H{"error": "产线仍被 EBOM 引用，不能删除"})
			return
		}
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "产线不存在或已删除"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete production line"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Deleted successfully"})
}

func GetProductionRoutesHandler(c *gin.Context) {
	routes, err := services.ListProductionRoutes()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch production routes"})
		return
	}
	c.JSON(http.StatusOK, services.ProductionRoutesResponse{Items: routes})
}

func GetProductionRouteBOMBranchesHandler(c *gin.Context) {
	branches, err := services.ListProductionRouteBOMBranches()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to fetch production BOM branches: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, services.ProductionRouteBOMBranchesResponse{Items: branches})
}

func GetProductionRouteSalesOrderLineCandidatesHandler(c *gin.Context) {
	candidates, err := services.ListProductionRouteSalesOrderLineCandidates(c.Query("productId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, services.ProductionRouteSalesOrderLineCandidatesResponse{Items: candidates})
}

func SaveProductionMBOMBranchProcessSelectionHandler(c *gin.Context) {
	var input services.SaveProductionMBOMBranchProcessSelectionHandlerRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	processSteps, err := services.SaveProductionMBOMBranchProcessSelection(services.SaveProductionMBOMBranchProcessSelectionRequest{
		ProductID: input.ProductID, BOMOwnerType: input.BOMOwnerType,
		BOMOwnerCustomerID: input.BOMOwnerCustomerID, BOMVersionLevel: input.BOMVersionLevel,
		ProcessStepIDs: input.ProcessStepIDs,
		Operator:       middleware.GetSafeUsername(c), IP: c.ClientIP(),
	})
	if err != nil {
		if errors.Is(err, services.ErrInvalidProductionMBOMBranchProcessSelection) {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save MBOM branch process selection"})
		return
	}
	c.JSON(http.StatusOK, services.ProductionMBOMBranchProcessSelectionResponse{Items: processSteps})
}

func SaveProductionRouteHandler(c *gin.Context) {
	var input services.ProductionRouteDTO
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	route, err := services.SaveProductionRoute(services.SaveProductionRouteRequest{
		Route:    input,
		Operator: middleware.GetSafeUsername(c),
		IP:       c.ClientIP(),
	})
	if err != nil {
		if errors.Is(err, services.ErrProductionRouteRevisionConflict) {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		if errors.Is(err, services.ErrProductionSalesOrderLineRouteModeLocked) {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		if err == services.ErrProductionRouteVersionConflict {
			respondVersionConflict(c)
			return
		}
		if errors.Is(err, services.ErrProductionRouteImmutable) ||
			errors.Is(err, services.ErrInvalidProductionRouteStatus) {
			c.JSON(http.StatusConflict, gin.H{"error": "[CONFLICT] " + err.Error()})
			return
		}
		if errors.Is(err, services.ErrInvalidProductionRoute) {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save production route: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, route)
}

func CreateProductionRouteRevisionHandler(c *gin.Context) {
	route, err := services.CreateProductionRouteRevision(
		c.Param("id"),
		middleware.GetSafeUsername(c),
		c.ClientIP(),
	)
	if err != nil {
		if errors.Is(err, services.ErrProductionRouteRevisionConflict) || errors.Is(err, services.ErrProductionRouteImmutable) {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		if errors.Is(err, services.ErrInvalidProductionRoute) {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Production route revision not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create production route revision"})
		return
	}
	c.JSON(http.StatusOK, route)
}

func PublishProductionRouteHandler(c *gin.Context) {
	var input struct {
		Version int64 `json:"version"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	route, err := services.PublishProductionRoute(
		c.Param("id"),
		input.Version,
		middleware.GetSafeUsername(c),
		c.ClientIP(),
	)
	if err != nil {
		if errors.Is(err, services.ErrProductionRouteRevisionConflict) {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		if err == services.ErrProductionRouteVersionConflict {
			respondVersionConflict(c)
			return
		}
		if errors.Is(err, services.ErrProductionRouteImmutable) ||
			errors.Is(err, services.ErrInvalidProductionRouteStatus) {
			c.JSON(http.StatusConflict, gin.H{"error": "[CONFLICT] " + err.Error()})
			return
		}
		if errors.Is(err, services.ErrInvalidProductionRoute) {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to publish production route"})
		return
	}

	c.JSON(http.StatusOK, route)
}

func DeleteProductionRouteHandler(c *gin.Context) {
	id := c.Param("id")
	if err := services.DeleteProductionRoute(id, middleware.GetSafeUsername(c), c.ClientIP()); err != nil {
		if errors.Is(err, services.ErrProductionRouteImmutable) ||
			errors.Is(err, services.ErrProductionRouteDeleteBlocked) {
			c.JSON(http.StatusConflict, gin.H{"error": "[CONFLICT] " + err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete production route"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Deleted successfully"})
}
