package services

import (
	"fmt"
	"strings"
	"time"
	"xdfc-server/models"

	"gorm.io/gorm"
)

type ProductionRouteBOMBranchDTO struct {
	ProductID            string           `json:"productId"`
	ProductSKU           string           `json:"productSKU"`
	ProductName          string           `json:"productName"`
	ProductTypeName      string           `json:"productTypeName,omitempty"`
	BOMOwnerType         string           `json:"bomOwnerType"`
	BOMOwnerCustomerID   string           `json:"bomOwnerCustomerId"`
	BOMOwnerCustomerName string           `json:"bomOwnerCustomerName"`
	BOMVersionLevel      string           `json:"bomVersionLevel"`
	Processes            []ProcessStepDTO `gorm:"-" json:"processes"`
}

type ProductionRouteBOMBranchesResponse struct {
	Items []ProductionRouteBOMBranchDTO `json:"items"`
}

type productionRouteBOMBranchIdentity struct {
	ProductID          string
	BOMOwnerType       string
	BOMOwnerCustomerID string
	BOMVersionLevel    string
}

func ListProductionRouteBOMBranches() ([]ProductionRouteBOMBranchDTO, error) {
	return defaultProductionService.ListProductionRouteBOMBranches()
}

func (s *ProductionService) ListProductionRouteBOMBranches() ([]ProductionRouteBOMBranchDTO, error) {
	var branches []ProductionRouteBOMBranchDTO
	err := queryCurrentProductionRouteBOMBranches(s.txManager.DB()).
		Distinct().
		Order("product_name ASC, product_sku ASC, bom_version_level ASC, bom_owner_type ASC, bom_owner_customer_id ASC").
		Scan(&branches).Error
	if err != nil || len(branches) == 0 {
		return branches, err
	}
	if err := attachProductTypeNamesToProductionRouteBOMBranches(s.txManager.DB(), branches); err != nil {
		return nil, err
	}

	productIDs := make([]string, 0, len(branches))
	seenProductIDs := make(map[string]struct{}, len(branches))
	for _, branch := range branches {
		if _, exists := seenProductIDs[branch.ProductID]; exists {
			continue
		}
		seenProductIDs[branch.ProductID] = struct{}{}
		productIDs = append(productIDs, branch.ProductID)
	}

	var associations []models.ProductionMBOMBranchProcessAssociation
	if err := s.txManager.DB().Where("product_id IN ?", productIDs).
		Order("sort_order ASC, created_at ASC, id ASC").
		Find(&associations).Error; err != nil {
		return nil, err
	}
	processStepIDs := make([]string, 0, len(associations))
	for _, association := range associations {
		processStepIDs = append(processStepIDs, association.ProcessStepID)
	}
	var processSteps []models.ProcessStep
	if len(processStepIDs) > 0 {
		if err := s.txManager.DB().Where("id IN ?", processStepIDs).Find(&processSteps).Error; err != nil {
			return nil, err
		}
	}
	processStepsByID := make(map[string]models.ProcessStep, len(processSteps))
	for _, processStep := range processSteps {
		processStepsByID[processStep.ID] = processStep
	}
	processesByBranch := make(map[productionRouteBOMBranchIdentity][]ProcessStepDTO)
	for _, association := range associations {
		processStep, exists := processStepsByID[association.ProcessStepID]
		if !exists {
			return nil, fmt.Errorf("MBOM branch process association references a missing process step")
		}
		processStep.SortOrder = association.SortOrder
		identity := productionRouteBOMBranchIdentity{
			ProductID:          strings.TrimSpace(association.ProductID),
			BOMOwnerType:       strings.ToUpper(strings.TrimSpace(association.BOMOwnerType)),
			BOMOwnerCustomerID: strings.TrimSpace(association.BOMOwnerCustomerID),
			BOMVersionLevel:    strings.TrimSpace(association.BOMVersionLevel),
		}
		processesByBranch[identity] = append(processesByBranch[identity], mapProcessStepToDTO(processStep))
	}
	for index := range branches {
		identity := productionRouteBOMBranchIdentity{
			ProductID:          strings.TrimSpace(branches[index].ProductID),
			BOMOwnerType:       strings.ToUpper(strings.TrimSpace(branches[index].BOMOwnerType)),
			BOMOwnerCustomerID: strings.TrimSpace(branches[index].BOMOwnerCustomerID),
			BOMVersionLevel:    strings.TrimSpace(branches[index].BOMVersionLevel),
		}
		branches[index].Processes = append(
			[]ProcessStepDTO{},
			processesByBranch[identity]...,
		)
	}
	return branches, nil
}

func attachProductTypeNamesToProductionRouteBOMBranches(database *gorm.DB, branches []ProductionRouteBOMBranchDTO) error {
	if database == nil || !database.Migrator().HasTable(&models.ProductType{}) {
		return nil
	}

	productIDs := make([]string, 0, len(branches))
	for _, branch := range branches {
		productIDs = append(productIDs, branch.ProductID)
	}
	type productTypeNameRow struct {
		ProductID       string `gorm:"column:product_id"`
		ProductTypeName string `gorm:"column:product_type_name"`
	}
	var productTypeNames []productTypeNameRow
	if err := database.Table("products AS p").
		Select("p.id AS product_id, COALESCE(pt.name, '') AS product_type_name").
		Joins("LEFT JOIN product_types pt ON pt.id = p.type_id").
		Where("p.id IN ?", productIDs).
		Scan(&productTypeNames).Error; err != nil {
		return fmt.Errorf("failed to load product category names for MBOM branches: %w", err)
	}
	nameByProductID := make(map[string]string, len(productTypeNames))
	for _, row := range productTypeNames {
		nameByProductID[row.ProductID] = strings.TrimSpace(row.ProductTypeName)
	}
	for index := range branches {
		branches[index].ProductTypeName = nameByProductID[branches[index].ProductID]
	}
	return nil
}

func validateProductionRouteBOMBranchIdentity(route models.ProductionRoute) error {
	identity := productionRouteBOMBranchIdentity{
		ProductID:          strings.TrimSpace(route.ProductID),
		BOMOwnerType:       strings.ToUpper(strings.TrimSpace(route.BOMOwnerType)),
		BOMOwnerCustomerID: strings.TrimSpace(route.BOMOwnerCustomerID),
		BOMVersionLevel:    strings.TrimSpace(route.BOMVersionLevel),
	}
	if identity.ProductID == "" {
		return fmt.Errorf("%w: productId is required for a production route", ErrInvalidProductionRoute)
	}
	if identity.BOMOwnerType != "INTERNAL" && identity.BOMOwnerType != "CUSTOMER" {
		return fmt.Errorf("%w: bomOwnerType must be INTERNAL or CUSTOMER", ErrInvalidProductionRoute)
	}
	if identity.BOMOwnerType == "INTERNAL" && identity.BOMOwnerCustomerID != "" {
		return fmt.Errorf("%w: internal BOM branches cannot have an owner customer", ErrInvalidProductionRoute)
	}
	if identity.BOMOwnerType == "CUSTOMER" && identity.BOMOwnerCustomerID == "" {
		return fmt.Errorf("%w: customer BOM branches require an owner customer", ErrInvalidProductionRoute)
	}
	return nil
}

func hydrateProductionRouteBOMBranch(database *gorm.DB, route *models.ProductionRoute) error {
	identity := productionRouteBOMBranchIdentity{
		ProductID:          strings.TrimSpace(route.ProductID),
		BOMOwnerType:       strings.ToUpper(strings.TrimSpace(route.BOMOwnerType)),
		BOMOwnerCustomerID: strings.TrimSpace(route.BOMOwnerCustomerID),
		BOMVersionLevel:    strings.TrimSpace(route.BOMVersionLevel),
	}
	var branch ProductionRouteBOMBranchDTO
	err := queryCurrentProductionRouteBOMBranches(database).
		Where("b.product_id = ? AND UPPER(b.owner_type) = ? AND COALESCE(b.owner_customer_id, '') = ? AND COALESCE(b.version_level, '') = ?",
			identity.ProductID,
			identity.BOMOwnerType,
			identity.BOMOwnerCustomerID,
			identity.BOMVersionLevel,
		).
		Take(&branch).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("%w: no current released MBOM matches the selected product branch", ErrInvalidProductionRoute)
		}
		return fmt.Errorf("%w: failed to validate product BOM branch: %v", ErrInvalidProductionRoute, err)
	}

	route.ProductID = branch.ProductID
	route.ProductSKU = branch.ProductSKU
	route.ProductName = branch.ProductName
	route.BOMOwnerType = branch.BOMOwnerType
	route.BOMOwnerCustomerID = branch.BOMOwnerCustomerID
	route.BOMOwnerCustomerName = branch.BOMOwnerCustomerName
	route.BOMVersionLevel = branch.BOMVersionLevel
	return nil
}

func queryCurrentProductionRouteBOMBranches(database *gorm.DB) *gorm.DB {
	now := time.Now().UTC()
	return database.Table("boms AS b").
		Select(`b.product_id AS product_id,
			p.sku AS product_sku,
			p.name AS product_name,
			UPPER(b.owner_type) AS bom_owner_type,
			COALESCE(b.owner_customer_id, '') AS bom_owner_customer_id,
			COALESCE(c.name, '') AS bom_owner_customer_name,
			COALESCE(b.version_level, '') AS bom_version_level`).
		Joins("JOIN products p ON p.id = b.product_id AND p.deleted_at IS NULL").
		Joins("LEFT JOIN customers c ON CAST(c.id AS TEXT) = b.owner_customer_id AND c.deleted_at IS NULL").
		Where("b.deleted_at IS NULL").
		Where("UPPER(b.bom_type) = ?", models.BOMTypeMBOM).
		Where("UPPER(b.status) = ?", models.BOMStatusReleased).
		Where("UPPER(p.status) = ?", "ACTIVE").
		Where("(b.effective_from IS NULL OR b.effective_from <= ?)", now).
		Where("(b.effective_to IS NULL OR b.effective_to >= ?)", now).
		Where(`((UPPER(b.owner_type) = 'INTERNAL' AND COALESCE(b.owner_customer_id, '') = '')
			OR (UPPER(b.owner_type) = 'CUSTOMER' AND COALESCE(b.owner_customer_id, '') <> '' AND c.id IS NOT NULL))`)
}
