package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func CreatePackagingAssemblyCaptureSessionHandler(c *gin.Context) {
	session, err := services.CreatePackagingAssemblyCaptureSession(auditContextFromGin(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[PACKAGING_ASSEMBLY] failed to create capture session: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, session)
}

func GetPackagingAssemblyCaptureSessionHandler(c *gin.Context) {
	session, err := services.GetPackagingAssemblyCaptureSession(c.Param("sessionId"))
	if err != nil {
		if errors.Is(err, services.ErrPackagingAssemblyCaptureSessionNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "[PACKAGING_ASSEMBLY] capture session not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[PACKAGING_ASSEMBLY] failed to load capture session: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, session)
}

func SubmitPackagingAssemblyCaptureSessionHandler(c *gin.Context) {
	var input services.SubmitPackagingAssemblyCaptureSessionRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid packaging assembly payload: " + err.Error()})
		return
	}
	if input.Token == "" {
		input.Token = c.Query("token")
	}

	session, err := services.SubmitPackagingAssemblyCaptureSession(
		auditContextFromGin(c),
		c.Param("sessionId"),
		input,
		"",
	)
	if err != nil {
		var validationErr *services.ProductBarcodeBindingValidationError
		switch {
		case errors.Is(err, services.ErrPackagingAssemblyCaptureSessionNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "[PACKAGING_ASSEMBLY] capture session not found"})
		case errors.Is(err, services.ErrPackagingAssemblyCaptureSessionExpired):
			c.JSON(http.StatusGone, gin.H{"error": "[PACKAGING_ASSEMBLY] capture session expired"})
		case errors.Is(err, services.ErrPackagingAssemblyCaptureSessionToken):
			c.JSON(http.StatusForbidden, gin.H{"error": "[PACKAGING_ASSEMBLY] invalid capture token"})
		case errors.As(err, &validationErr):
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] " + validationErr.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[PACKAGING_ASSEMBLY] submit failed: " + err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, session)
}

func GetPackagingAssembliesHandler(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	response, err := services.ListPackagingAssemblies(services.PackagingAssemblyListQuery{
		Limit:       limit,
		PackageCode: c.Query("packageCode"),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[PACKAGING_ASSEMBLY] query failed: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, response)
}
