package handlers

import (
	"errors"
	"net/http"
	"xdfc-server/db"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func GetAIRuntimePolicyHandler(c *gin.Context) {
	policy, err := services.LoadAIPolicy(db.DB)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":  "AI_POLICY_LOAD_FAILED",
			"error": "AI policy load failed",
		})
		return
	}
	c.JSON(http.StatusOK, services.BuildAIRuntimePolicy(policy))
}

func GetAIAdminPolicyHandler(c *gin.Context) {
	policy, err := services.LoadAIPolicy(db.DB)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":  "AI_POLICY_LOAD_FAILED",
			"error": "Failed to load AI policy",
		})
		return
	}
	policy.API.APIKey = ""
	c.JSON(http.StatusOK, policy)
}

func UpdateAIAdminPolicyHandler(c *gin.Context) {
	var input services.AIPolicy
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":  "AI_POLICY_BAD_REQUEST",
			"error": "Invalid AI policy payload",
		})
		return
	}

	saved, err := services.SaveAIPolicy(db.DB, input)
	if err != nil {
		if errors.Is(err, services.ErrAIPolicyInvalidPayload) {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":  "AI_POLICY_INVALID_PAYLOAD",
				"error": err.Error(),
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":  "AI_POLICY_SAVE_FAILED",
			"error": "Failed to save AI policy",
		})
		return
	}
	saved.API.APIKey = ""
	c.JSON(http.StatusOK, saved)
}
