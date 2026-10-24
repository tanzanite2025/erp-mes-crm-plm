package services

import (
	"encoding/json"
	"fmt"
	"strings"
	"xdfc-server/models"

	"github.com/google/uuid"
)

// Clone database rows with fresh IDs while preserving the recipe's local node
// identities and nested parent/children structure. ItemID links each leaf to its
// own BOM's cloned row rather than to the source EBOM or previous MBOM revision.
func cloneBOMRecipeItemsAndRemapRelationSidecarItemReferences(sourceItems []models.BOMItem, rawSidecar json.RawMessage) ([]models.BOMItem, json.RawMessage, error) {
	clonedItems := make([]models.BOMItem, len(sourceItems))
	clonedItemIDBySourceItemID := make(map[string]string, len(sourceItems))
	for index, item := range sourceItems {
		clonedItems[index] = item
		clonedItems[index].ID = uuid.NewString()
		clonedItems[index].BOMID = ""
		clonedItemIDBySourceItemID[item.ID] = clonedItems[index].ID
	}
	sidecar, err := parseBOMRelationSidecar(rawSidecar)
	if err != nil {
		return nil, nil, err
	}
	if sidecar == nil {
		return clonedItems, nil, nil
	}
	for index := range sidecar.ProtocolDraft.ItemNodes {
		itemNode := &sidecar.ProtocolDraft.ItemNodes[index]
		sourceItemID := itemNode.ItemID
		if sourceItemID == "" && strings.HasPrefix(itemNode.ID, "item:") {
			sourceItemID = strings.TrimPrefix(itemNode.ID, "item:")
		}
		if sourceItemID == "" {
			continue // Legacy field-only nodes have no persisted row reference to remap.
		}
		clonedItemID, exists := clonedItemIDBySourceItemID[sourceItemID]
		if !exists {
			return nil, nil, fmt.Errorf("%w: recipe node %s references missing source item %s", ErrBOMRelationSidecarInvalid, itemNode.ID, sourceItemID)
		}
		itemNode.ItemID = clonedItemID
	}
	clonedSidecar, err := json.Marshal(sidecar)
	if err != nil {
		return nil, nil, fmt.Errorf("%w: encode cloned recipe relationships: %v", ErrBOMRelationSidecarInvalid, err)
	}
	return clonedItems, clonedSidecar, nil
}
