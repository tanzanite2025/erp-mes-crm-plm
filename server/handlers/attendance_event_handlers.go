package handlers

import (
	"errors"
	"net/http"
	"strings"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func writeAttendanceEventError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, services.ErrAttendanceIngressUnauthorized):
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
	case errors.Is(err, services.ErrAttendanceEventInvalid):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	case errors.Is(err, services.ErrAttendanceDeviceNotFound),
		errors.Is(err, gorm.ErrRecordNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "考勤设备或员工记录不存在"})
	case errors.Is(err, services.ErrAttendanceAdapterUnsupported),
		errors.Is(err, services.ErrAttendanceAdapterEndpoint),
		errors.Is(err, services.ErrAttendanceAdapterCredentials):
		c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
	}
}

type attendanceEventIngressRequest struct {
	DeviceID   string                          `json:"deviceId"`
	DeviceCode string                          `json:"deviceCode"`
	Events     []services.AttendanceEventInput `json:"events"`
}

func ReportAttendanceDeviceStatusHandler(c *gin.Context) {
	var input services.AttendanceDeviceStatusInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "设备状态格式错误: " + err.Error()})
		return
	}
	token := strings.TrimSpace(c.GetHeader("X-Attendance-Ingress-Token"))
	if token == "" {
		token = strings.TrimSpace(c.GetHeader("X-Device-Token"))
	}
	result, err := services.ReportAttendanceDeviceStatus(token, input)
	if err != nil {
		writeAttendanceEventError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func IngestAttendanceEventsHandler(c *gin.Context) {
	var input attendanceEventIngressRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "考勤事件格式错误: " + err.Error()})
		return
	}
	token := strings.TrimSpace(c.GetHeader("X-Attendance-Ingress-Token"))
	if token == "" {
		token = strings.TrimSpace(c.GetHeader("X-Device-Token"))
	}
	for index := range input.Events {
		if input.Events[index].DeviceID == "" {
			input.Events[index].DeviceID = input.DeviceID
		}
		if input.Events[index].DeviceCode == "" {
			input.Events[index].DeviceCode = input.DeviceCode
		}
	}
	result, err := services.IngestAttendanceEvents(input.DeviceID, input.DeviceCode, token, input.Events)
	if err != nil {
		writeAttendanceEventError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func ListAttendanceEventsHandler(c *gin.Context) {
	result, err := services.ListAttendanceEvents(
		c.Query("deviceId"),
		c.Query("matchStatus"),
		0,
	)
	if err != nil {
		writeAttendanceEventError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func SyncAttendanceDeviceHandler(c *gin.Context) {
	result, err := services.SyncAttendanceDevice(c.Param("id"))
	if err != nil {
		writeAttendanceEventError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func ListAttendanceDeviceMappingsHandler(c *gin.Context) {
	items, err := services.ListAttendanceDeviceMappings(c.Query("deviceId"))
	if err != nil {
		writeAttendanceEventError(c, err)
		return
	}
	c.JSON(http.StatusOK, items)
}

func SaveAttendanceDeviceMappingHandler(c *gin.Context) {
	var input services.AttendanceDeviceMappingInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "设备员工映射格式错误: " + err.Error()})
		return
	}
	item, err := services.SaveAttendanceDeviceMapping(input)
	if err != nil {
		writeAttendanceEventError(c, err)
		return
	}
	c.JSON(http.StatusOK, item)
}

func DeleteAttendanceDeviceMappingHandler(c *gin.Context) {
	if err := services.DeleteAttendanceDeviceMapping(c.Param("id")); err != nil {
		writeAttendanceEventError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

type attendanceIngressTokenRequest struct {
	Token string `json:"token"`
}

func SetAttendanceIngressTokenHandler(c *gin.Context) {
	var input attendanceIngressTokenRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "入站令牌格式错误: " + err.Error()})
		return
	}
	if err := services.SetAttendanceIngressToken(c.Param("id"), input.Token); err != nil {
		writeAttendanceEventError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}
