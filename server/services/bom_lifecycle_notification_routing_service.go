package services

import (
	"context"
	"fmt"
	"gorm.io/gorm"
	"strings"
	"time"
	"xdfc-server/audit"
	"xdfc-server/models"
)

// BOM write operations call the shared notification router inside their own
// transaction. The actual persisted status is preserved, including draft MBOMs.
func dispatchBOMLifecycleNotificationsWithinTransaction(ctx context.Context, tx *gorm.DB, bom models.BOM, previousStatus, actionCode, occurrenceID string, extra map[string]any) error {
	source := "BOM_ENGINEERING"
	status := bom.Status
	if bom.BOMType == models.BOMTypeMBOM {
		source = "BOM_MANUFACTURING"
		if status == models.BOMStatusReleased {
			status = "EFFECTIVE"
		}
		if previousStatus == models.BOMStatusReleased {
			previousStatus = "EFFECTIVE"
		}
	}
	actor, _ := audit.ActorFromContext(ctx)
	metadata := map[string]any{"bomId": bom.ID, "bomNo": bom.BOMNo, "bomVersion": bom.VersionText, "productId": bom.ProductID, "bomType": bom.BOMType, "createdBy": actor.UserID, "operator": actor.Username}
	if bom.Product != nil {
		metadata["productName"] = bom.Product.Name
	}
	if bom.SourceEBOMID != nil {
		metadata["sourceEbomId"] = *bom.SourceEBOMID
	}
	for key, value := range extra {
		metadata[key] = value
	}
	templates := map[string]string{"BomId": bom.ID, "BomNo": bom.BOMNo, "BomVersion": bom.VersionText, "ProductId": bom.ProductID, "Operator": actor.Username}
	for key, value := range metadata {
		templates[key] = fmt.Sprint(value)
		if len(key) > 0 {
			templates[strings.ToUpper(key[:1])+key[1:]] = fmt.Sprint(value)
		}
	}
	return DispatchBusinessStatusChangedTx(tx, BusinessStatusChangedEvent{
		EventKey:   fmt.Sprintf("%s:%s:v%d:%s:%s", source, bom.ID, bom.Version, actionCode, occurrenceID),
		ActionCode: actionCode, Entity: "BOM", SourceCode: source, TargetID: bom.ID, PreviousStatus: previousStatus, NextStatus: status,
		ActorID: actor.UserID, Operator: actor.Username, ActionURL: "/product-structure/bom?bomId=" + bom.ID + "&bomType=" + bom.BOMType,
		Metadata: metadata, TemplateValues: templates, TriggeredAt: time.Now().UTC(),
	})
}
