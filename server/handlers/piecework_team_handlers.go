package handlers

import (
	"encoding/json"
	"net/http"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

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
		case "code", "name", "section", "process", "type", "status", "remarks":
			var value string
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		case "shortName":
			var value string
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates["short_name"] = value
		case "processCommand":
			var value string
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates["process_command"] = value
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
		team, err := services.PatchTeam(auditContextFromGin(c), id, updates)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 差分保存班组失败: " + err.Error()})
			return
		}
		c.JSON(http.StatusOK, team)
		return
	}

	var team models.Team
	if err := json.Unmarshal(body, &team); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 班组格式错误"})
		return
	}

	if err := services.SaveTeam(auditContextFromGin(c), &team); err != nil {
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

	if err := services.DeleteTeam(auditContextFromGin(c), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 删除班组失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "success"})
}
