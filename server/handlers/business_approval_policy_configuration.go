package handlers

import (
	"log"
	"net/http"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func ListBusinessApprovalPolicyConfigurationsHandler(c *gin.Context) {
	policies, err := services.ListBusinessApprovalPolicyConfigurations(c.Request.Context())
	if err != nil {
		log.Printf("[ERROR] List business approval policies: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "读取审批配置失败"})
		return
	}
	c.JSON(http.StatusOK, policies)
}

func SaveBusinessApprovalPolicyConfigurationHandler(c *gin.Context) {
	var input services.BusinessApprovalPolicyConfigurationWriteInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "审批配置参数无效"})
		return
	}
	policy, err := services.SaveBusinessApprovalPolicyConfiguration(auditContextFromGin(c), c.Param("businessType"), input)
	if err != nil {
		status := mapDomainErrorToHTTPStatus(err)
		if status == http.StatusInternalServerError {
			log.Printf("[ERROR] Save business approval policy: %v", err)
			c.JSON(status, gin.H{"error": "保存审批配置失败，事务已回滚"})
			return
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, policy)
}
