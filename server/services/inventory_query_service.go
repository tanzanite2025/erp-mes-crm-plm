package services

import (
	"xdfc-server/db"
	"xdfc-server/models"
)

func ListInventory(page, pageSize int) ([]models.Inventory, int64, error) {
	var total int64
	query := db.DB.Model(&models.Inventory{})
	query.Count(&total)

	var items []models.Inventory
	if err := query.Limit(pageSize).Offset((page - 1) * pageSize).Find(&items).Error; err != nil {
		return nil, 0, err
	}

	return items, total, nil
}

func ListInboundHistory(page, pageSize int) ([]models.InboundRecord, int64) {
	var total int64
	query := db.DB.Model(&models.InboundRecord{})
	query.Count(&total)

	var items []models.InboundRecord
	query.Order("created_at desc").Limit(pageSize).Offset((page - 1) * pageSize).Find(&items)

	return items, total
}

func ListShipmentHistory(page, pageSize int) ([]models.ShipmentRecord, int64) {
	var total int64
	query := db.DB.Model(&models.ShipmentRecord{})
	query.Count(&total)

	var items []models.ShipmentRecord
	query.Order("created_at desc").Limit(pageSize).Offset((page - 1) * pageSize).Find(&items)

	return items, total
}
