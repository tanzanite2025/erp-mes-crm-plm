package handlers

import (
	"errors"
	"net/http"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func writeAttendanceDeviceServiceError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, services.ErrAttendanceDeviceRequiredCode),
		errors.Is(err, services.ErrAttendanceDeviceRequiredName),
		errors.Is(err, services.ErrAttendanceDeviceUnsupportedVendor),
		errors.Is(err, services.ErrAttendanceDeviceUnsupportedProto),
		errors.Is(err, services.ErrAttendanceDeviceInvalidEndpoint):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	case errors.Is(err, services.ErrAttendanceDeviceNotFound), errors.Is(err, gorm.ErrRecordNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": services.ErrAttendanceDeviceNotFound.Error()})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "考勤设备配置处理失败"})
	}
}

func GetAttendanceDeviceTemplatesHandler(c *gin.Context) {
	c.JSON(http.StatusOK, services.DefaultAttendanceDeviceTemplates())
}

func GetAttendanceDevicesHandler(c *gin.Context) {
	devices, err := services.ListAttendanceDevices()
	if err != nil {
		writeAttendanceDeviceServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, devices)
}

func SaveAttendanceDeviceHandler(c *gin.Context) {
	var input services.AttendanceDeviceInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "考勤设备配置格式错误: " + err.Error()})
		return
	}

	device, err := services.SaveAttendanceDevice(input)
	if err != nil {
		writeAttendanceDeviceServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, device)
}

func DeleteAttendanceDeviceHandler(c *gin.Context) {
	if err := services.DeleteAttendanceDevice(c.Param("id")); err != nil {
		writeAttendanceDeviceServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

func TestAttendanceDeviceHandler(c *gin.Context) {
	result, err := services.TestAttendanceDevice(c.Param("id"))
	if err != nil {
		writeAttendanceDeviceServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}
