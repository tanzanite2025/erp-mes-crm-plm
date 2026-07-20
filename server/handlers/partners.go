package handlers

import (
	"net/http"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

// GetEquipmentPartnersHandler 获取所有流转单位
func GetEquipmentPartnersHandler(c *gin.Context) {
	var partners []models.EquipmentPartner
	if err := db.DB.Order("created_at desc").Find(&partners).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取流转单位失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, mapEquipmentPartnerResponses(partners))
}

// SaveEquipmentPartnerHandler 保存或创建流转单位
func SaveEquipmentPartnerHandler(c *gin.Context) {
	var input services.SaveEquipmentPartnerRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 无效的流转单位数据"})
		return
	}

	partner, err := services.NewEquipmentAssetService(db.DB).SaveEquipmentPartner(auditContextFromGin(c), input)
	if err != nil {
		respondDomainError(c, err, "[SERVER] 保存流转单位失败: ")
		return
	}
	c.JSON(http.StatusOK, mapEquipmentPartnerResponse(partner))
}

// PatchEquipmentPartnerHandler 差分更新流转单位
func PatchEquipmentPartnerHandler(c *gin.Context) {
	id := c.Param("id")
	var input services.SDRTSDeltaHandlerRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 无效的更新数据"})
		return
	}

	partner, err := services.NewEquipmentAssetService(db.DB).PatchEquipmentPartner(auditContextFromGin(c), id, input.Delta)
	if err != nil {
		respondDomainError(c, err, "[SERVER] 差分保存流转单位失败: ")
		return
	}
	c.JSON(http.StatusOK, mapEquipmentPartnerResponse(partner))
}

// DeleteEquipmentPartnerHandler 删除流转单位
func DeleteEquipmentPartnerHandler(c *gin.Context) {
	id := c.Param("id")
	if err := services.NewEquipmentAssetService(db.DB).DeleteEquipmentPartner(auditContextFromGin(c), id); err != nil {
		respondDomainError(c, err, "[SERVER] 删除流转单位失败: ")
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}
