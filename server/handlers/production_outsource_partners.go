package handlers

import (
	"errors"
	"net/http"
	"xdfc-server/middleware"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func GetOutsourcePartnersHandler(c *gin.Context) {
	response, err := services.ListOutsourcePartners(services.OutsourcePartnerListQuery{
		Search: c.Query("search"),
		Status: c.Query("status"),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch outsource partners"})
		return
	}
	c.JSON(http.StatusOK, response)
}

func CreateOutsourcePartnerHandler(c *gin.Context) {
	var input services.OutsourcePartnerDTO
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	partner, err := services.CreateOutsourcePartner(services.SaveOutsourcePartnerRequest{
		Partner:  input,
		ActorID:  middleware.GetSafeUserID(c),
		Operator: middleware.GetSafeUsername(c),
		IP:       c.ClientIP(),
	})
	if err != nil {
		respondOutsourcePartnerError(c, err, "Failed to create outsource partner")
		return
	}

	c.JSON(http.StatusOK, partner)
}

func UpdateOutsourcePartnerHandler(c *gin.Context) {
	var input services.OutsourcePartnerDTO
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	partner, err := services.UpdateOutsourcePartner(services.UpdateOutsourcePartnerRequest{
		ID:       c.Param("id"),
		Partner:  input,
		ActorID:  middleware.GetSafeUserID(c),
		Operator: middleware.GetSafeUsername(c),
		IP:       c.ClientIP(),
	})
	if err != nil {
		respondOutsourcePartnerError(c, err, "Failed to update outsource partner")
		return
	}

	c.JSON(http.StatusOK, partner)
}

func DeleteOutsourcePartnerHandler(c *gin.Context) {
	err := services.DeleteOutsourcePartner(services.DeleteOutsourcePartnerRequest{
		ID:       c.Param("id"),
		ActorID:  middleware.GetSafeUserID(c),
		Operator: middleware.GetSafeUsername(c),
		IP:       c.ClientIP(),
	})
	if err != nil {
		respondOutsourcePartnerError(c, err, "Failed to delete outsource partner")
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Deleted successfully"})
}

func respondOutsourcePartnerError(c *gin.Context, err error, fallback string) {
	switch {
	case errors.Is(err, services.ErrInvalidOutsourcePartner):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	case errors.Is(err, services.ErrOutsourcePartnerDuplicateCode):
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
	case errors.Is(err, services.ErrOutsourcePartnerVersionConflict):
		respondVersionConflict(c)
	case errors.Is(err, services.ErrOutsourcePartnerNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": fallback + ": " + err.Error()})
	}
}
