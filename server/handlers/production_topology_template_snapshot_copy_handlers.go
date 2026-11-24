package handlers

import (
	"errors"
	"net/http"

	"xdfc-server/middleware"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func respondProductionTopologyTemplateRequestError(context *gin.Context, err error) {
	status := http.StatusInternalServerError
	switch {
	case errors.Is(err, gorm.ErrRecordNotFound):
		status = http.StatusNotFound
	case errors.Is(err, services.ErrProductionLineVersionConflict), errors.Is(err, services.ErrProductionTopologyTemplateVersionConflict), errors.Is(err, services.ErrProductionTopologyTemplateLineCodeConflict):
		status = http.StatusConflict
	case errors.Is(err, services.ErrInvalidProductionTopologyTemplate), errors.Is(err, services.ErrInvalidProductionLineTemplate), errors.Is(err, services.ErrInvalidProductionLineBOMBranch):
		status = http.StatusBadRequest
	}
	context.JSON(status, gin.H{"error": err.Error()})
}

func validateProductionTopologyTemplatePathID(context *gin.Context) bool {
	if _, err := uuid.Parse(context.Param("id")); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"error": "拓扑模板 ID 无效"})
		return false
	}
	return true
}

func ListProductionTopologyTemplateSnapshotsHandler(context *gin.Context) {
	items, err := services.DefaultProductionTopologyTemplateSnapshotService().ListProductionTopologyTemplateSnapshots()
	if err != nil {
		respondProductionTopologyTemplateRequestError(context, err)
		return
	}
	context.JSON(http.StatusOK, gin.H{"items": items})
}

func CaptureProductionTopologyTemplateFromLineHandler(context *gin.Context) {
	var request services.CaptureProductionTopologyTemplateFromLineRequest
	if err := context.ShouldBindJSON(&request); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	item, err := services.DefaultProductionTopologyTemplateSnapshotService().CaptureProductionTopologyTemplateFromLine(request, middleware.GetSafeUsername(context), context.ClientIP())
	if err != nil {
		respondProductionTopologyTemplateRequestError(context, err)
		return
	}
	context.JSON(http.StatusOK, item)
}

func SaveProductionTopologyTemplateSnapshotHandler(context *gin.Context) {
	if !validateProductionTopologyTemplatePathID(context) {
		return
	}
	var request services.SaveProductionTopologyTemplateSnapshotRequest
	if err := context.ShouldBindJSON(&request); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	item, err := services.DefaultProductionTopologyTemplateSnapshotService().SaveProductionTopologyTemplateSnapshot(context.Param("id"), request, middleware.GetSafeUsername(context), context.ClientIP())
	if err != nil {
		respondProductionTopologyTemplateRequestError(context, err)
		return
	}
	context.JSON(http.StatusOK, item)
}

func ApplyProductionTopologyTemplateToNewLineHandler(context *gin.Context) {
	if !validateProductionTopologyTemplatePathID(context) {
		return
	}
	var request services.ApplyProductionTopologyTemplateToNewLineRequest
	if err := context.ShouldBindJSON(&request); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	line, err := services.DefaultProductionTopologyTemplateSnapshotService().ApplyProductionTopologyTemplateToNewLine(context.Param("id"), request, middleware.GetSafeUsername(context), context.ClientIP())
	if err != nil {
		respondProductionTopologyTemplateRequestError(context, err)
		return
	}
	context.JSON(http.StatusOK, line)
}

func DeleteProductionTopologyTemplateSnapshotHandler(context *gin.Context) {
	if !validateProductionTopologyTemplatePathID(context) {
		return
	}
	var request struct {
		Version int64 `json:"version" binding:"required,min=1"`
	}
	if err := context.ShouldBindJSON(&request); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := services.DefaultProductionTopologyTemplateSnapshotService().DeleteProductionTopologyTemplateSnapshot(context.Param("id"), request.Version, middleware.GetSafeUsername(context), context.ClientIP()); err != nil {
		respondProductionTopologyTemplateRequestError(context, err)
		return
	}
	context.JSON(http.StatusOK, gin.H{"message": "拓扑模板已删除"})
}
