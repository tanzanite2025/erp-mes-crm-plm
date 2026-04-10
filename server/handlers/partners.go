package handlers

import (
	"encoding/json"
	"net/http"
	"time"
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

func buildPartnerUpdates(payload map[string]json.RawMessage) (map[string]interface{}, error) {
	updates := make(map[string]interface{})
	for key, raw := range payload {
		switch key {
		case "name", "type", "contactPerson", "phone", "address":
			var value string
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		case "id", "createdAt", "updatedAt":
			// Skip metadata
		default:
			// IGNORED
		}
	}
	return updates, nil
}

func savePartnerRecord(partner *models.EquipmentPartner) error {
	if partner.ID == "" {
		return db.DB.Create(partner).Error
	}

	var existing models.EquipmentPartner
	if err := db.DB.First(&existing, "id = ?", partner.ID).Error; err != nil {
		return err
	}

	updates := map[string]interface{}{
		"name":           partner.Name,
		"type":           partner.Type,
		"contact_person": partner.ContactPerson,
		"phone":          partner.Phone,
		"address":        partner.Address,
		"updated_at":     time.Now(),
	}

	return db.DB.Model(&existing).Updates(updates).Error
}

func patchPartnerRecord(id string, updates map[string]interface{}) error {
	var existing models.EquipmentPartner
	if err := db.DB.First(&existing, "id = ?", id).Error; err != nil {
		return err
	}
	updates["updated_at"] = time.Now()
	return db.DB.Model(&existing).Updates(updates).Error
}

func buildPartnerPatchUpdates(delta map[string]json.RawMessage) (map[string]interface{}, error) {
	updates := make(map[string]interface{})
	for key, raw := range delta {
		valueRaw, err := extractDeltaNewValue(raw)
		if err != nil {
			return nil, err
		}
		switch key {
		case "name", "type", "contactPerson", "phone", "address":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		}
	}
	return updates, nil
}

// SaveEquipmentPartnerHandler 保存或创建流转单位
func SaveEquipmentPartnerHandler(c *gin.Context) {
	var input services.SaveEquipmentPartnerRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 无效的流转单位数据"})
		return
	}

	partner := models.EquipmentPartner{
		ID:            input.ID,
		Name:          input.Name,
		Type:          input.Type,
		ContactPerson: input.ContactPerson,
		Phone:         input.Phone,
		Address:       input.Address,
	}

	if err := savePartnerRecord(&partner); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 保存流转单位失败: " + err.Error()})
		return
	}
	if err := db.DB.First(&partner, "id = ?", partner.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 鑾峰彇淇濆瓨鍚庣殑娴佽浆鍗曚綅澶辫触: " + err.Error()})
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

	updates, err := buildPartnerPatchUpdates(input.Delta)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 无效的流转单位差量数据"})
		return
	}

	if err := patchPartnerRecord(id, updates); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 差分保存流转单位失败: " + err.Error()})
		return
	}

	var partner models.EquipmentPartner
	if err := db.DB.First(&partner, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取更新后的流转单位失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, mapEquipmentPartnerResponse(partner))
}

// DeleteEquipmentPartnerHandler 删除流转单位
func DeleteEquipmentPartnerHandler(c *gin.Context) {
	id := c.Param("id")
	if err := db.DB.Delete(&models.EquipmentPartner{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 删除流转单位失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}
