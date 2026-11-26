package db

import (
	"fmt"
	"strings"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type legacyBranchProcessDefinition struct {
	ID                 string
	ProductID          string
	BOMOwnerType       string
	BOMOwnerCustomerID string
	BOMVersionLevel    string
	SortOrder          int
	ProcessStepID      string `gorm:"column:process_library_id"`
}

type legacyBranchProcessSelection struct {
	BranchOperationID string
	ProcessStepID     string `gorm:"column:process_library_id"`
	SortOrder         int
	DeletedAt         gorm.DeletedAt
}

type legacyProcessReference struct {
	ID       string
	OldID    string
	TargetID string
}

func EnsureProductionMBOMBranchProcessIdentityCutover(database *gorm.DB) error {
	if database == nil {
		return nil
	}
	return database.Transaction(func(tx *gorm.DB) error {
		if tx.Dialector.Name() == "postgres" {
			if err := tx.Exec("SELECT pg_advisory_xact_lock(2026112604)").Error; err != nil {
				return err
			}
		}
		if !tx.Migrator().HasTable("production_bom_branch_operations") {
			return nil
		}
		if !tx.Migrator().HasTable("production_mbom_branch_process_associations") ||
			!tx.Migrator().HasTable("process_steps") {
			return fmt.Errorf("production MBOM branch process target tables are missing")
		}

		processIDByOldOperationID, definitions, err := loadLegacyBranchProcessIdentityMap(tx)
		if err != nil {
			return err
		}
		if err := persistMigratedMBOMBranchProcessAssociations(tx, definitions); err != nil {
			return err
		}

		references := []struct {
			table        string
			oldColumn    string
			targetColumn string
		}{
			{"production_route_steps", "branch_operation_id", "process_step_id"},
			{"product_barcode_states", "current_branch_operation_id", "current_process_step_id"},
			{"product_barcode_state_events", "from_branch_operation_id", "from_process_step_id"},
			{"product_barcode_state_events", "to_branch_operation_id", "to_process_step_id"},
			{"product_barcode_transfer_events", "from_branch_operation_id", "from_process_step_id"},
			{"product_barcode_transfer_events", "to_branch_operation_id", "to_process_step_id"},
			{"production_operation_executions", "branch_operation_id", "process_step_id"},
			{"production_outsource_transfers", "branch_operation_id", "process_step_id"},
			{"production_outsource_inspections", "branch_operation_id", "process_step_id"},
		}
		for _, reference := range references {
			if err := migrateLegacyProcessReferenceColumn(tx, reference.table, reference.oldColumn, reference.targetColumn, processIDByOldOperationID); err != nil {
				return err
			}
		}

		for _, snapshots := range []struct {
			table  string
			old    string
			target string
		}{
			{"production_route_steps", "branch_operation_name_snapshot", "process_name_snapshot"},
			{"production_route_steps", "branch_operation_description_snapshot", "process_description_snapshot"},
		} {
			if tx.Migrator().HasTable(snapshots.table) && tx.Migrator().HasColumn(snapshots.table, snapshots.old) &&
				tx.Migrator().HasColumn(snapshots.table, snapshots.target) {
				statement := fmt.Sprintf("UPDATE %s SET %s = %s WHERE COALESCE(%s, '') = ''", snapshots.table, snapshots.target, snapshots.old, snapshots.target)
				if err := tx.Exec(statement).Error; err != nil {
					return fmt.Errorf("preserve %s route step snapshots: %w", snapshots.old, err)
				}
			}
		}

		for _, reference := range references {
			if tx.Migrator().HasTable(reference.table) && tx.Migrator().HasColumn(reference.table, reference.oldColumn) {
				if err := dropProductionMBOMBranchProcessIdentityColumn(tx, reference.table, reference.oldColumn); err != nil {
					return fmt.Errorf("drop old %s.%s identity: %w", reference.table, reference.oldColumn, err)
				}
			}
		}
		for _, column := range []struct{ table, column string }{
			{"production_route_steps", "branch_operation_name_snapshot"},
			{"production_route_steps", "branch_operation_description_snapshot"},
		} {
			if tx.Migrator().HasTable(column.table) && tx.Migrator().HasColumn(column.table, column.column) {
				if err := dropProductionMBOMBranchProcessIdentityColumn(tx, column.table, column.column); err != nil {
					return fmt.Errorf("drop old %s.%s snapshot: %w", column.table, column.column, err)
				}
			}
		}
		if tx.Migrator().HasTable("production_bom_branch_operation_process_library_selections") {
			if err := tx.Migrator().DropTable("production_bom_branch_operation_process_library_selections"); err != nil {
				return fmt.Errorf("drop old MBOM branch process selection table: %w", err)
			}
		}
		if err := tx.Migrator().DropTable("production_bom_branch_operations"); err != nil {
			return fmt.Errorf("drop old branch process identity table: %w", err)
		}
		return nil
	})
}

func dropProductionMBOMBranchProcessIdentityColumn(tx *gorm.DB, table, column string) error {
	if tx.Dialector.Name() == "sqlite" {
		return tx.Exec(fmt.Sprintf("ALTER TABLE %s DROP COLUMN %s", table, column)).Error
	}
	return tx.Migrator().DropColumn(table, column)
}

func loadLegacyBranchProcessIdentityMap(tx *gorm.DB) (map[string]string, []legacyBranchProcessDefinition, error) {
	operationColumns := []string{"id", "product_id", "bom_owner_type", "bom_owner_customer_id", "bom_version_level", "sort_order"}
	hasOperationProcessStepID := tx.Migrator().HasColumn("production_bom_branch_operations", "process_library_id")
	if hasOperationProcessStepID {
		operationColumns = append(operationColumns, "process_library_id")
	}
	var definitions []legacyBranchProcessDefinition
	if err := tx.Table("production_bom_branch_operations").Select(operationColumns).Order("created_at asc, id asc").Find(&definitions).Error; err != nil {
		return nil, nil, fmt.Errorf("load old MBOM branch process definitions: %w", err)
	}

	selectionTable := "production_bom_branch_operation_process_library_selections"
	var selections []legacyBranchProcessSelection
	if tx.Migrator().HasTable(selectionTable) &&
		tx.Migrator().HasColumn(selectionTable, "branch_operation_id") &&
		tx.Migrator().HasColumn(selectionTable, "process_library_id") {
		selectionColumns := []string{"branch_operation_id", "process_library_id"}
		if tx.Migrator().HasColumn(selectionTable, "sort_order") {
			selectionColumns = append(selectionColumns, "sort_order")
		}
		if tx.Migrator().HasColumn(selectionTable, "deleted_at") {
			selectionColumns = append(selectionColumns, "deleted_at")
		}
		if err := tx.Table(selectionTable).Select(selectionColumns).Where("deleted_at IS NULL").Order("created_at asc, id asc").Find(&selections).Error; err != nil {
			return nil, nil, fmt.Errorf("load old MBOM branch process selections: %w", err)
		}
	}

	processIDByOldOperationID := make(map[string]string, len(definitions))
	selectionSortOrder := make(map[string]int, len(selections))
	for _, selection := range selections {
		operationID := strings.TrimSpace(selection.BranchOperationID)
		processStepID := strings.TrimSpace(selection.ProcessStepID)
		if operationID == "" || processStepID == "" {
			continue
		}
		if prior, exists := processIDByOldOperationID[operationID]; exists && prior != processStepID {
			return nil, nil, fmt.Errorf("old branch operation %s maps to multiple process steps", operationID)
		}
		processIDByOldOperationID[operationID] = processStepID
		selectionSortOrder[operationID] = selection.SortOrder
	}

	for index := range definitions {
		definition := &definitions[index]
		definition.ID = strings.TrimSpace(definition.ID)
		processStepID := strings.TrimSpace(definition.ProcessStepID)
		if processStepID == "" {
			processStepID = processIDByOldOperationID[definition.ID]
		}
		if definition.ID == "" || processStepID == "" {
			return nil, nil, fmt.Errorf("old branch operation %s has no mapped process step", definition.ID)
		}
		var processCount int64
		if err := tx.Unscoped().Model(&models.ProcessStep{}).Where("id = ?", processStepID).Count(&processCount).Error; err != nil {
			return nil, nil, fmt.Errorf("validate process step %s during identity migration: %w", processStepID, err)
		}
		if processCount == 0 {
			return nil, nil, fmt.Errorf("old branch operation %s references missing process step %s", definition.ID, processStepID)
		}
		definition.ProcessStepID = processStepID
		if sortOrder, exists := selectionSortOrder[definition.ID]; exists {
			definition.SortOrder = sortOrder
		}
		processIDByOldOperationID[definition.ID] = processStepID
	}
	return processIDByOldOperationID, definitions, nil
}

func persistMigratedMBOMBranchProcessAssociations(tx *gorm.DB, definitions []legacyBranchProcessDefinition) error {
	for _, definition := range definitions {
		var association models.ProductionMBOMBranchProcessAssociation
		err := tx.Where("product_id = ? AND UPPER(bom_owner_type) = ? AND COALESCE(bom_owner_customer_id, '') = ? AND COALESCE(bom_version_level, '') = ? AND process_step_id = ?",
			definition.ProductID, strings.ToUpper(strings.TrimSpace(definition.BOMOwnerType)),
			strings.TrimSpace(definition.BOMOwnerCustomerID), strings.TrimSpace(definition.BOMVersionLevel), definition.ProcessStepID,
		).First(&association).Error
		if err == nil {
			continue
		}
		if err != gorm.ErrRecordNotFound {
			return fmt.Errorf("look up migrated MBOM branch process association: %w", err)
		}
		association = models.ProductionMBOMBranchProcessAssociation{
			BaseModel:          models.BaseModel{ID: uuid.NewString()},
			ProductID:          definition.ProductID,
			BOMOwnerType:       strings.ToUpper(strings.TrimSpace(definition.BOMOwnerType)),
			BOMOwnerCustomerID: strings.TrimSpace(definition.BOMOwnerCustomerID),
			BOMVersionLevel:    strings.TrimSpace(definition.BOMVersionLevel),
			ProcessStepID:      definition.ProcessStepID,
			SortOrder:          definition.SortOrder,
		}
		if err := tx.Create(&association).Error; err != nil {
			return fmt.Errorf("persist migrated MBOM branch process association: %w", err)
		}
	}
	return nil
}

func migrateLegacyProcessReferenceColumn(tx *gorm.DB, table, oldColumn, targetColumn string, processIDByOldOperationID map[string]string) error {
	if !tx.Migrator().HasTable(table) {
		return nil
	}
	if !tx.Migrator().HasColumn(table, targetColumn) {
		return fmt.Errorf("target process identity column %s.%s is missing", table, targetColumn)
	}
	if !tx.Migrator().HasColumn(table, oldColumn) {
		return nil
	}
	var references []legacyProcessReference
	query := tx.Table(table).Select("id, " + oldColumn + " AS old_id, " + targetColumn + " AS target_id")
	if err := query.Find(&references).Error; err != nil {
		return fmt.Errorf("load old process references from %s: %w", table, err)
	}
	for _, reference := range references {
		oldID := strings.TrimSpace(reference.OldID)
		if oldID == "" {
			continue
		}
		processStepID, exists := processIDByOldOperationID[oldID]
		if !exists {
			return fmt.Errorf("%s row %s references unmapped branch process %s", table, reference.ID, oldID)
		}
		if err := tx.Table(table).Where("id = ?", reference.ID).Update(targetColumn, processStepID).Error; err != nil {
			return fmt.Errorf("migrate %s row %s process identity: %w", table, reference.ID, err)
		}
	}
	return nil
}
