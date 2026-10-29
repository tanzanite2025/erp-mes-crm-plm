package handlers

import (
	"net/http"
	"strconv"
	"xdfc-server/db"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func GetMoldGroupMasterDirectoryHandler(c *gin.Context) {
	items, err := services.ReadMoldGroupMasterDirectory(db.DB.WithContext(c.Request.Context()))
	if err != nil {
		respondDomainError(c, err, "读取模具分组失败：")
		return
	}
	c.JSON(http.StatusOK, items)
}

func SaveMoldGroupMasterHandler(c *gin.Context) {
	var input services.MoldGroupMasterWriteRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "模具分组数据格式错误"})
		return
	}
	group, err := services.SaveMoldGroupMaster(auditContextFromGin(c), db.DB, c.Param("id"), input)
	if err != nil {
		respondDomainError(c, err, "保存模具分组失败：")
		return
	}
	c.JSON(http.StatusOK, group)
}

func DeleteMoldGroupMasterHandler(c *gin.Context) {
	version, err := strconv.Atoi(c.Query("version"))
	if err != nil || version < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "删除模具分组必须提供有效版本号，请刷新后重试"})
		return
	}
	if err := services.DeleteUnreferencedMoldGroupMaster(auditContextFromGin(c), db.DB, c.Param("id"), version); err != nil {
		respondDomainError(c, err, "删除模具分组失败：")
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}
