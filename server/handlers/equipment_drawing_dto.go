package handlers

import (
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
)

func mapMoldDrawingResponse(drawing models.MoldDrawing) gin.H {
	return gin.H{
		"id":         drawing.ID,
		"moldId":     drawing.MoldID,
		"moldSn":     drawing.MoldSN,
		"name":       drawing.Name,
		"type":       drawing.Type,
		"fileUrl":    drawing.FileURL,
		"version":    drawing.Version,
		"sysVersion": optimisticVersionForResponse(drawing.UpdatedAt, drawing.CreatedAt),
		"status":     drawing.Status,
		"uploadedAt": drawing.UploadedAt,
		"remarks":    drawing.Remarks,
		"createdAt":  drawing.CreatedAt,
		"updatedAt":  drawing.UpdatedAt,
	}
}

func mapMoldDrawingResponses(drawings []models.MoldDrawing) []gin.H {
	items := make([]gin.H, 0, len(drawings))
	for _, drawing := range drawings {
		items = append(items, mapMoldDrawingResponse(drawing))
	}
	return items
}

func mapMoldDrawingLogResponse(log models.MoldDrawingLog) gin.H {
	return gin.H{
		"id":        log.ID,
		"drawingId": log.DrawingID,
		"action":    log.Action,
		"details":   log.Details,
		"operator":  log.Operator,
		"timestamp": log.Timestamp,
	}
}

func mapMoldDrawingLogResponses(logs []models.MoldDrawingLog) []gin.H {
	items := make([]gin.H, 0, len(logs))
	for _, log := range logs {
		items = append(items, mapMoldDrawingLogResponse(log))
	}
	return items
}
