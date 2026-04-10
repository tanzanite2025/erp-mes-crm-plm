package handlers

import (
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
)

func mapEquipmentPartnerResponse(partner models.EquipmentPartner) gin.H {
	return gin.H{
		"id":            partner.ID,
		"name":          partner.Name,
		"type":          partner.Type,
		"contactPerson": partner.ContactPerson,
		"phone":         partner.Phone,
		"address":       partner.Address,
		"createdAt":     partner.CreatedAt,
		"updatedAt":     partner.UpdatedAt,
		"version":       optimisticVersionForResponse(partner.UpdatedAt, partner.CreatedAt),
	}
}

func mapEquipmentPartnerResponses(partners []models.EquipmentPartner) []gin.H {
	items := make([]gin.H, 0, len(partners))
	for _, partner := range partners {
		items = append(items, mapEquipmentPartnerResponse(partner))
	}
	return items
}
