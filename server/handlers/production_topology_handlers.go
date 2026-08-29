package handlers

import (
	"errors"
	"net/http"
	"xdfc-server/middleware"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func GetProductionLinesHandler(c *gin.Context) {
	lines, err := services.ListProductionLines()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch production lines"})
		return
	}
	c.JSON(http.StatusOK, services.ProductionLinesResponse{Items: lines})
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
		if err == services.ErrProductionTopologyUnauthorized {
			c.JSON(http.StatusForbidden, gin.H{"error": "UNAUTHORIZED", "message": "Topology authorization code is invalid"})
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
		if err == services.ErrProductionTopologyUnauthorized {
			c.JSON(http.StatusForbidden, gin.H{"error": "UNAUTHORIZED", "message": "Topology authorization code is invalid"})
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
