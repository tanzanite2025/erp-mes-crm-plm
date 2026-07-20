package services

import (
	"errors"
	"math"
	"sort"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"
)

type shippingVehicleMatchPackagingCandidate struct {
	Target  models.PackagingProfileTarget
	Profile models.PackagingProfile
}

type shippingVehicleMatchMetrics struct {
	BoxCount int
	VolumeM3 float64
	WeightKg float64
}

func normalizeShippingVehicleMatchUnitCode(code string) string {
	return strings.ToLower(strings.TrimSpace(code))
}

func shippingVehicleMatchLengthToMillimeters(value float64, unitCode string) (float64, bool) {
	switch normalizeShippingVehicleMatchUnitCode(unitCode) {
	case "mm", "毫米":
		return value, true
	case "cm", "厘米":
		return value * 10, true
	case "m", "米":
		return value * 1000, true
	default:
		return 0, false
	}
}

func shippingVehicleMatchWeightToKilograms(value float64, unitCode string) (float64, bool) {
	switch normalizeShippingVehicleMatchUnitCode(unitCode) {
	case "kg", "千克":
		return value, true
	case "g", "克":
		return value / 1000, true
	default:
		return 0, false
	}
}

func deriveShippingVehicleMatchMetrics(quantity float64, profile models.PackagingProfile) (*shippingVehicleMatchMetrics, bool) {
	if quantity <= 0 || profile.Capacity <= 0 {
		return nil, false
	}

	lengthMm, ok := shippingVehicleMatchLengthToMillimeters(profile.Length, profile.DimensionUnitCode)
	if !ok || lengthMm <= 0 {
		return nil, false
	}
	widthMm, ok := shippingVehicleMatchLengthToMillimeters(profile.Width, profile.DimensionUnitCode)
	if !ok || widthMm <= 0 {
		return nil, false
	}
	heightMm, ok := shippingVehicleMatchLengthToMillimeters(profile.Height, profile.DimensionUnitCode)
	if !ok || heightMm <= 0 {
		return nil, false
	}

	unitWeightBase := profile.GrossWeight
	if unitWeightBase <= 0 {
		unitWeightBase = profile.NetWeight
	}
	unitWeightKg, ok := shippingVehicleMatchWeightToKilograms(unitWeightBase, profile.WeightUnitCode)
	if !ok || unitWeightKg <= 0 {
		return nil, false
	}

	boxCount := int(math.Ceil(quantity / profile.Capacity))
	if boxCount <= 0 {
		return nil, false
	}

	boxVolumeM3 := (lengthMm * widthMm * heightMm) / 1_000_000_000
	metrics := &shippingVehicleMatchMetrics{
		BoxCount: boxCount,
		VolumeM3: boxVolumeM3 * float64(boxCount),
		WeightKg: unitWeightKg * float64(boxCount),
	}
	return metrics, true
}

func resolveShippingVehicleMatchStatus(shipmentStatus string, hasLogistics bool) string {
	switch strings.ToUpper(strings.TrimSpace(shipmentStatus)) {
	case "COMMITTED":
		if hasLogistics {
			return "已锁定"
		}
		return "待联系"
	default:
		return "待匹配"
	}
}

func loadShippingVehicleMatchOrders(shipments []models.ShipmentRecord) (map[string]models.SalesOrder, map[string]models.SalesOrder, error) {
	salesOrderIDs := make([]string, 0)
	orderNos := make([]string, 0)
	seenIDs := make(map[string]struct{})
	seenOrderNos := make(map[string]struct{})
	for _, shipment := range shipments {
		if id := strings.TrimSpace(shipment.SalesOrderID); id != "" {
			if _, exists := seenIDs[id]; !exists {
				seenIDs[id] = struct{}{}
				salesOrderIDs = append(salesOrderIDs, id)
			}
		}
		if orderNo := strings.TrimSpace(shipment.OrderNo); orderNo != "" {
			if _, exists := seenOrderNos[orderNo]; !exists {
				seenOrderNos[orderNo] = struct{}{}
				orderNos = append(orderNos, orderNo)
			}
		}
	}

	if len(salesOrderIDs) == 0 && len(orderNos) == 0 {
		return map[string]models.SalesOrder{}, map[string]models.SalesOrder{}, nil
	}

	query := applySalesOrderRecordScope(db.DB.Model(&models.SalesOrder{}))
	switch {
	case len(salesOrderIDs) > 0 && len(orderNos) > 0:
		query = query.Where("id IN ? OR order_no IN ?", salesOrderIDs, orderNos)
	case len(salesOrderIDs) > 0:
		query = query.Where("id IN ?", salesOrderIDs)
	default:
		query = query.Where("order_no IN ?", orderNos)
	}

	var orders []models.SalesOrder
	if err := query.Find(&orders).Error; err != nil {
		return nil, nil, err
	}

	orderByID := make(map[string]models.SalesOrder, len(orders))
	orderByNo := make(map[string]models.SalesOrder, len(orders))
	for _, order := range orders {
		if id := strings.TrimSpace(order.ID); id != "" {
			orderByID[id] = order
		}
		if orderNo := strings.TrimSpace(order.OrderNo); orderNo != "" {
			orderByNo[orderNo] = order
		}
	}
	return orderByID, orderByNo, nil
}

func loadShippingVehicleMatchWarehouseNames(shipments []models.ShipmentRecord) (map[string]string, error) {
	codes := make([]string, 0)
	seenCodes := make(map[string]struct{})
	for _, shipment := range shipments {
		code := strings.TrimSpace(shipment.SourceCategory)
		if code == "" {
			continue
		}
		if _, exists := seenCodes[code]; exists {
			continue
		}
		seenCodes[code] = struct{}{}
		codes = append(codes, code)
	}
	if len(codes) == 0 {
		return map[string]string{}, nil
	}

	var categories []models.WarehouseCategory
	if err := db.DB.Where("code IN ?", codes).Find(&categories).Error; err != nil {
		return nil, err
	}

	nameMap := make(map[string]string, len(categories))
	for _, category := range categories {
		nameMap[strings.TrimSpace(category.Code)] = strings.TrimSpace(category.Name)
	}
	return nameMap, nil
}

func loadShippingVehicleMatchLogistics(shipments []models.ShipmentRecord) (map[string]models.LogisticsRecord, error) {
	shipmentIDs := make([]string, 0)
	seenIDs := make(map[string]struct{})
	for _, shipment := range shipments {
		if id := strings.TrimSpace(shipment.ID); id != "" {
			if _, exists := seenIDs[id]; !exists {
				seenIDs[id] = struct{}{}
				shipmentIDs = append(shipmentIDs, id)
			}
		}
	}
	if len(shipmentIDs) == 0 {
		return map[string]models.LogisticsRecord{}, nil
	}

	var records []models.LogisticsRecord
	if err := db.DB.Where("shipment_id IN ? AND COALESCE(is_deleted, ?) = ?", shipmentIDs, false, false).
		Order("updated_at desc, created_at desc, id asc").
		Find(&records).Error; err != nil {
		return nil, err
	}

	result := make(map[string]models.LogisticsRecord, len(records))
	for _, record := range records {
		shipmentID := strings.TrimSpace(record.ShipmentID)
		if shipmentID == "" {
			continue
		}
		if _, exists := result[shipmentID]; exists {
			continue
		}
		result[shipmentID] = record
	}
	return result, nil
}

func loadShippingVehicleMatchPackagingProfiles(shipments []models.ShipmentRecord) (map[string]models.PackagingProfile, error) {
	materialIDs := make([]string, 0)
	seenMaterialIDs := make(map[string]struct{})
	for _, shipment := range shipments {
		materialID := strings.TrimSpace(shipment.MaterialID)
		if materialID == "" {
			continue
		}
		if _, exists := seenMaterialIDs[materialID]; exists {
			continue
		}
		seenMaterialIDs[materialID] = struct{}{}
		materialIDs = append(materialIDs, materialID)
	}
	if len(materialIDs) == 0 {
		return map[string]models.PackagingProfile{}, nil
	}

	var targets []models.PackagingProfileTarget
	if err := db.DB.Where("entity_id IN ?", materialIDs).
		Where("LOWER(entity_type) IN ?", []string{"product", "material"}).
		Order("is_default desc, sort_order asc, created_at asc").
		Find(&targets).Error; err != nil {
		return nil, err
	}
	if len(targets) == 0 {
		return map[string]models.PackagingProfile{}, nil
	}

	profileIDs := make([]string, 0)
	seenProfileIDs := make(map[string]struct{})
	for _, target := range targets {
		profileID := strings.TrimSpace(target.PackagingProfileID)
		if profileID == "" {
			continue
		}
		if _, exists := seenProfileIDs[profileID]; exists {
			continue
		}
		seenProfileIDs[profileID] = struct{}{}
		profileIDs = append(profileIDs, profileID)
	}
	if len(profileIDs) == 0 {
		return map[string]models.PackagingProfile{}, nil
	}

	var profiles []models.PackagingProfile
	if err := db.DB.Where("id IN ? AND is_active = ?", profileIDs, true).Find(&profiles).Error; err != nil {
		return nil, err
	}

	profileMap := make(map[string]models.PackagingProfile, len(profiles))
	for _, profile := range profiles {
		profileMap[strings.TrimSpace(profile.ID)] = profile
	}

	candidates := make([]shippingVehicleMatchPackagingCandidate, 0, len(targets))
	for _, target := range targets {
		profile, exists := profileMap[strings.TrimSpace(target.PackagingProfileID)]
		if !exists {
			continue
		}
		candidates = append(candidates, shippingVehicleMatchPackagingCandidate{Target: target, Profile: profile})
	}

	sort.SliceStable(candidates, func(i, j int) bool {
		left := candidates[i]
		right := candidates[j]
		if left.Target.IsDefault != right.Target.IsDefault {
			return left.Target.IsDefault
		}
		if left.Target.SortOrder != right.Target.SortOrder {
			return left.Target.SortOrder < right.Target.SortOrder
		}
		if !left.Profile.UpdatedAt.Equal(right.Profile.UpdatedAt) {
			return left.Profile.UpdatedAt.After(right.Profile.UpdatedAt)
		}
		if !left.Profile.CreatedAt.Equal(right.Profile.CreatedAt) {
			return left.Profile.CreatedAt.After(right.Profile.CreatedAt)
		}
		return strings.TrimSpace(left.Profile.ID) < strings.TrimSpace(right.Profile.ID)
	})

	resolved := make(map[string]models.PackagingProfile, len(materialIDs))
	for _, candidate := range candidates {
		entityID := strings.TrimSpace(candidate.Target.EntityID)
		if entityID == "" {
			continue
		}
		if _, exists := resolved[entityID]; exists {
			continue
		}
		resolved[entityID] = candidate.Profile
	}
	return resolved, nil
}

func ListShippingVehicleMatchItems() ([]ShippingVehicleMatchItemResponse, error) {
	if db.DB == nil {
		return nil, errors.New("database not initialized")
	}

	var shipments []models.ShipmentRecord
	if err := db.DB.Model(&models.ShipmentRecord{}).
		Where("source_category = ?", "SHIPPING_VIRTUAL").
		Where("status IN ?", []string{"DRAFT", "COMMITTED"}).
		Order("shipment_date desc, created_at desc, id asc").
		Find(&shipments).Error; err != nil {
		return nil, err
	}
	if len(shipments) == 0 {
		return []ShippingVehicleMatchItemResponse{}, nil
	}

	ordersByID, ordersByNo, err := loadShippingVehicleMatchOrders(shipments)
	if err != nil {
		return nil, err
	}
	warehouseNames, err := loadShippingVehicleMatchWarehouseNames(shipments)
	if err != nil {
		return nil, err
	}
	logisticsByShipmentID, err := loadShippingVehicleMatchLogistics(shipments)
	if err != nil {
		return nil, err
	}
	packagingProfilesByMaterialID, err := loadShippingVehicleMatchPackagingProfiles(shipments)
	if err != nil {
		return nil, err
	}

	items := make([]ShippingVehicleMatchItemResponse, 0, len(shipments))
	for _, shipment := range shipments {
		order := ordersByID[strings.TrimSpace(shipment.SalesOrderID)]
		if strings.TrimSpace(order.ID) == "" {
			order = ordersByNo[strings.TrimSpace(shipment.OrderNo)]
		}

		warehouseName := strings.TrimSpace(warehouseNames[strings.TrimSpace(shipment.SourceCategory)])
		if warehouseName == "" {
			warehouseName = strings.TrimSpace(shipment.SourceCategory)
		}

		logisticsRecord, hasLogistics := logisticsByShipmentID[strings.TrimSpace(shipment.ID)]
		profile := packagingProfilesByMaterialID[strings.TrimSpace(shipment.MaterialID)]
		var boxCount *int
		var volumeM3 *float64
		var weightKg *float64
		packageProfileID := strings.TrimSpace(profile.ID)
		packageProfileName := strings.TrimSpace(profile.Name)
		if packageProfileID != "" {
			if metrics, ok := deriveShippingVehicleMatchMetrics(shipment.Quantity, profile); ok {
				boxCount = &metrics.BoxCount
				volumeM3 = &metrics.VolumeM3
				weightKg = &metrics.WeightKg
			}
		}

		items = append(items, ShippingVehicleMatchItemResponse{
			ID:                 strings.TrimSpace(shipment.ID),
			ShipmentID:         strings.TrimSpace(shipment.ID),
			OrderNo:            strings.TrimSpace(shipment.OrderNo),
			CustomerName:       strings.TrimSpace(order.CustomerName),
			WarehouseName:      warehouseName,
			MaterialName:       strings.TrimSpace(shipment.MaterialName),
			MaterialCode:       strings.TrimSpace(shipment.MaterialCode),
			Quantity:           shipment.Quantity,
			BoxCount:           boxCount,
			VolumeM3:           volumeM3,
			WeightKg:           weightKg,
			Status:             resolveShippingVehicleMatchStatus(shipment.Status, hasLogistics),
			ShipmentStatus:     strings.TrimSpace(shipment.Status),
			LogisticsStatus:    strings.TrimSpace(logisticsRecord.Status),
			PackageProfileID:   packageProfileID,
			PackageProfileName: packageProfileName,
		})
	}
	return items, nil
}
