package services

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func GeneratePrintBatchNoTx(tx *gorm.DB, now time.Time) (string, error) {
	dateValue := now.Format("20060102")
	batchPrefix := "P" + dateValue
	sequenceKey := "print_batch:" + dateValue

	var sequence models.Sequence
	err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("key = ?", sequenceKey).First(&sequence).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		var existingBatchNumbers []string
		if err := tx.Unscoped().Model(&models.PrintBatch{}).
			Where("batch_no LIKE ?", batchPrefix+"-%").
			Pluck("batch_no", &existingBatchNumbers).Error; err != nil {
			return "", err
		}
		var initialValue int64
		for _, batchNo := range existingBatchNumbers {
			suffix := strings.TrimPrefix(batchNo, batchPrefix+"-")
			value, parseErr := strconv.ParseInt(suffix, 10, 64)
			if parseErr == nil && value > initialValue {
				initialValue = value
			}
		}
		if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&models.Sequence{Key: sequenceKey, Value: initialValue}).Error; err != nil {
			return "", err
		}
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("key = ?", sequenceKey).First(&sequence).Error; err != nil {
			return "", err
		}
	} else if err != nil {
		return "", err
	}

	nextValue := sequence.Value + 1
	if err := tx.Model(&models.Sequence{}).Where("key = ?", sequenceKey).Update("value", nextValue).Error; err != nil {
		return "", err
	}

	return fmt.Sprintf("%s-%03d", batchPrefix, nextValue), nil
}
