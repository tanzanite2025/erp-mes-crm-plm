package handlers

import (
	"encoding/json"
	"net/http"
	"xdfc-server/db"
	"xdfc-server/middleware"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
)

// --- 生产班组管理 (Production Teams) ---

// GetTeamsHandler 获取班组列表
func GetTeamsHandler(c *gin.Context) {
	var teams []models.Team
	if err := db.DB.Order("step asc, code asc").Find(&teams).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取班组数据失败"})
		return
	}
	c.JSON(http.StatusOK, teams)
}

func buildTeamUpdates(payload map[string]json.RawMessage) (map[string]interface{}, error) {
	updates := make(map[string]interface{})
	for key, raw := range payload {
		switch key {
		case "code", "name", "shortName", "section", "process", "processCommand", "type", "status", "remarks":
			var value string
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		case "step":
			var value int
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		case "isMaintenance":
			var value bool
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates["is_maintenance"] = value
		case "id", "createdAt", "updatedAt", "operator", "operateTime":
			// Skip metadata
		default:
			// IGNORED
		}
	}
	return updates, nil
}

func patchTeamRecord(id string, updates map[string]interface{}) error {
	var existing models.Team
	if err := db.DB.First(&existing, "id = ?", id).Error; err != nil {
		return err
	}
	return db.DB.Model(&existing).Updates(updates).Error
}

// SaveTeamHandler 保存/更新班组
func SaveTeamHandler(c *gin.Context) {
	payload, body, err := decodeJSONBodyMap(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 无效的 JSON 映射"})
		return
	}

	if rawID, ok := payload["id"]; ok && string(rawID) != "null" && string(rawID) != `""` {
		var id string
		if err := json.Unmarshal(rawID, &id); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 无效的 ID 格式"})
			return
		}
		updates, err := buildTeamUpdates(payload)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		updates["operator"] = middleware.GetSafeUsername(c)
		if err := patchTeamRecord(id, updates); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 差分保存班组失败: " + err.Error()})
			return
		}
		var team models.Team
		db.DB.First(&team, "id = ?", id)
		c.JSON(http.StatusOK, team)
		return
	}

	var team models.Team
	if err := json.Unmarshal(body, &team); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 班组格式错误"})
		return
	}

	team.Operator = middleware.GetSafeUsername(c)

	if err := db.DB.Create(&team).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 创建班组失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, team)
}

func DeleteTeamHandler(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID 不能为空"})
		return
	}

	if err := db.DB.Delete(&models.Team{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 删除班组失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "success"})
}

// --- 工价标准管理 (Piecework Rates) ---

// GetPieceworkRatesHandler 获取工价清单
func GetPieceworkRatesHandler(c *gin.Context) {
	var rates []models.PieceworkRate
	if err := db.DB.Preload("Product").Order("created_at desc").Find(&rates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取工价标准失败"})
		return
	}
	c.JSON(http.StatusOK, rates)
}

func buildPieceworkRateUpdates(payload map[string]json.RawMessage) (map[string]interface{}, error) {
	updates := make(map[string]interface{})
	for key, raw := range payload {
		switch key {
		case "productId", "processCode", "processName", "currency", "status":
			var value string
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		case "unitPrice":
			var value float64
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates["unit_price"] = value
		case "id", "createdAt", "updatedAt":
			// Skip metadata
		default:
			// IGNORED
		}
	}
	return updates, nil
}

func patchPieceworkRateRecord(id string, updates map[string]interface{}) error {
	var existing models.PieceworkRate
	if err := db.DB.First(&existing, "id = ?", id).Error; err != nil {
		return err
	}
	return db.DB.Model(&existing).Updates(updates).Error
}

func SavePieceworkRateHandler(c *gin.Context) {
	payload, body, err := decodeJSONBodyMap(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 无效的 JSON 映射"})
		return
	}

	if rawID, ok := payload["id"]; ok && string(rawID) != "null" && string(rawID) != `""` {
		var id string
		if err := json.Unmarshal(rawID, &id); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 无效的 ID 格式"})
			return
		}
		updates, err := buildPieceworkRateUpdates(payload)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err := patchPieceworkRateRecord(id, updates); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 差分保存工价失败: " + err.Error()})
			return
		}
		var rate models.PieceworkRate
		db.DB.First(&rate, "id = ?", id)
		c.JSON(http.StatusOK, rate)
		return
	}

	var rate models.PieceworkRate
	if err := json.Unmarshal(body, &rate); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 工价格式错误"})
		return
	}

	if err := db.DB.Create(&rate).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 创建工价失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, rate)
}
