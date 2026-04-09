package handlers

import (
	"errors"
	"net/http"
	"strings"
	"time"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

type leavePreviewRequest struct {
	LeaveType string `json:"leaveType"`
	StartTime string `json:"startTime"`
	EndTime   string `json:"endTime"`
}

type createLeaveRequest struct {
	LeaveType string `json:"leaveType"`
	StartTime string `json:"startTime"`
	EndTime   string `json:"endTime"`
	Reason    string `json:"reason"`
}

func parseLeaveTimeRange(startRaw, endRaw string) (time.Time, time.Time, error) {
	startTime, err := time.Parse(time.RFC3339, strings.TrimSpace(startRaw))
	if err != nil {
		return time.Time{}, time.Time{}, err
	}
	endTime, err := time.Parse(time.RFC3339, strings.TrimSpace(endRaw))
	if err != nil {
		return time.Time{}, time.Time{}, err
	}
	return startTime, endTime, nil
}

func currentUserIDFromContext(c *gin.Context) string {
	userID, _ := c.Get("userId")
	if value, ok := userID.(string); ok {
		return strings.TrimSpace(value)
	}
	return ""
}

func writeLeaveServiceError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, services.ErrLeaveUnauthorized):
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
	case errors.Is(err, services.ErrLeaveEmployeeUnbound),
		errors.Is(err, services.ErrLeaveEmployeeNotFound),
		errors.Is(err, services.ErrLeaveInvalidTimeRange),
		errors.Is(err, services.ErrLeaveInvalidLeaveType),
		errors.Is(err, services.ErrLeaveReasonRequired),
		errors.Is(err, services.ErrLeaveCancelInvalidState):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	case errors.Is(err, services.ErrLeaveRequestNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
	case errors.Is(err, services.ErrLeaveCancelForbidden):
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process leave request"})
	}
}

func GetMyLeaveRequestsHandler(c *gin.Context) {
	leaves, err := services.ListMyLeaveRequests(currentUserIDFromContext(c))
	if err != nil {
		writeLeaveServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, leaves)
}

func GetMyLeaveStatsHandler(c *gin.Context) {
	stats, err := services.GetMyLeaveStats(currentUserIDFromContext(c))
	if err != nil {
		writeLeaveServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, stats)
}

func PreviewMyLeaveRequestHandler(c *gin.Context) {
	var input leavePreviewRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid leave preview payload: " + err.Error()})
		return
	}

	startTime, endTime, err := parseLeaveTimeRange(input.StartTime, input.EndTime)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid leave time range: " + err.Error()})
		return
	}

	preview, err := services.PreviewMyLeaveRequest(currentUserIDFromContext(c), services.LeavePreviewInput{
		LeaveType: input.LeaveType,
		StartTime: startTime,
		EndTime:   endTime,
	})
	if err != nil {
		writeLeaveServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, preview)
}

func CreateMyLeaveRequestHandler(c *gin.Context) {
	var input createLeaveRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid leave create payload: " + err.Error()})
		return
	}

	startTime, endTime, err := parseLeaveTimeRange(input.StartTime, input.EndTime)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid leave time range: " + err.Error()})
		return
	}

	leave, err := services.CreateMyLeaveRequest(currentUserIDFromContext(c), services.CreateLeaveInput{
		LeaveType: input.LeaveType,
		StartTime: startTime,
		EndTime:   endTime,
		Reason:    input.Reason,
	})
	if err != nil {
		writeLeaveServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, leave)
}

func CancelMyLeaveRequestHandler(c *gin.Context) {
	if err := services.CancelMyLeaveRequest(currentUserIDFromContext(c), c.Param("id")); err != nil {
		writeLeaveServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}
