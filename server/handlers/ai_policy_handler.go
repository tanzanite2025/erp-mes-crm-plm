package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"time"
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

func GetAIUsageSummaryHandler(c *gin.Context) {
	windowSeconds, _ := strconv.Atoi(c.DefaultQuery("windowSeconds", "3600"))
	if windowSeconds <= 0 {
		windowSeconds = 3600
	}
	if windowSeconds > 30*24*3600 {
		windowSeconds = 30 * 24 * 3600
	}

	summary, err := services.GetAIUsageSummary(db.DB, time.Duration(windowSeconds)*time.Second)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":  "AI_USAGE_SUMMARY_FAILED",
			"error": "Failed to load AI usage summary",
		})
		return
	}
	c.JSON(http.StatusOK, summary)
}

func ListAIUsageLogsHandler(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	logs, err := services.ListAIUsageLogs(db.DB, services.AIUsageLogListOptions{
		Limit:    limit,
		UserID:   c.Query("userId"),
		Status:   c.Query("status"),
		Provider: c.Query("provider"),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":  "AI_USAGE_LOGS_FAILED",
			"error": "Failed to load AI usage logs",
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": logs})
}
