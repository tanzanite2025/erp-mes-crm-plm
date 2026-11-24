package services

import (
	"fmt"
	"strings"

	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func validateProductionLineSegmentOwnership(transaction *gorm.DB, line *models.ProductionLine) error {
	seenIDs := make(map[string]struct{}, len(line.Segments))
	persistentIDs := make([]string, 0, len(line.Segments))
	for index := range line.Segments {
		segment := &line.Segments[index]
		segment.ID = strings.TrimSpace(segment.ID)
		if segment.LineID != "" && segment.LineID != line.ID {
			return fmt.Errorf("%w: L2 的 lineId 必须与当前 L1 一致", ErrInvalidProductionLineSegmentOwnership)
		}
		isTemporary := strings.HasPrefix(segment.ID, "temp-")
		if segment.ID != "" && !isTemporary {
			parsedID, err := uuid.Parse(segment.ID)
			if err != nil {
				return fmt.Errorf("%w: L2 ID 必须为 UUID 或临时 ID", ErrInvalidProductionLineSegmentOwnership)
			}
			segment.ID = parsedID.String()
			persistentIDs = append(persistentIDs, segment.ID)
		}
		if segment.ID != "" {
			if _, duplicate := seenIDs[segment.ID]; duplicate {
				return fmt.Errorf("%w: 同一次保存不能重复提交 L2 ID %s", ErrInvalidProductionLineSegmentOwnership, segment.ID)
			}
			seenIDs[segment.ID] = struct{}{}
		}
		if segment.ID == "" || isTemporary {
			segment.ID = uuid.NewString()
		}
	}
	if len(persistentIDs) == 0 {
		return nil
	}
	var persistedSegments []models.LineSegment
	// Include tombstones: a removed association cannot be reused or moved to another L1.
	if err := transaction.Unscoped().Where("id IN ?", persistentIDs).Find(&persistedSegments).Error; err != nil {
		return err
	}
	for _, persisted := range persistedSegments {
		if persisted.DeletedAt.Valid {
			return fmt.Errorf("%w: L2 %s 已删除，请重新添加分支关联", ErrInvalidProductionLineSegmentOwnership, persisted.ID)
		}
		if persisted.LineID != line.ID {
			return fmt.Errorf("%w: L2 %s 属于其他 L1，不能转移归属", ErrInvalidProductionLineSegmentOwnership, persisted.ID)
		}
	}
	return nil
}
