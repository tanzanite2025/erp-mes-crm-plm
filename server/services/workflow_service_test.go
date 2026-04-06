package services

import (
	"testing"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func setupWorkflowServiceTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	testDB, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)

	require.NoError(t, testDB.Exec(`
		CREATE TABLE workflow_definitions (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			code TEXT NOT NULL UNIQUE,
			name TEXT NOT NULL,
			version INTEGER DEFAULT 1,
			module TEXT NOT NULL,
			definition_json TEXT NOT NULL,
			description TEXT,
			is_active BOOLEAN DEFAULT TRUE
		)
	`).Error)
	require.NoError(t, testDB.Exec(`CREATE INDEX idx_workflow_definitions_module ON workflow_definitions(module)`).Error)

	require.NoError(t, testDB.Exec(`
		CREATE TABLE workflow_instances (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			definition_id TEXT NOT NULL,
			business_type TEXT NOT NULL,
			business_ref_id TEXT NOT NULL,
			current_node_id TEXT,
			status TEXT,
			requester_id TEXT,
			started_at DATETIME,
			finished_at DATETIME
		)
	`).Error)
	require.NoError(t, testDB.Exec(`CREATE INDEX idx_workflow_instances_ref ON workflow_instances(business_ref_id)`).Error)

	require.NoError(t, testDB.Exec(`
		CREATE TABLE workflow_tasks (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			instance_id TEXT NOT NULL,
			node_id TEXT,
			assignee_user_id TEXT NOT NULL,
			status TEXT,
			action TEXT,
			comment TEXT,
			action_at DATETIME
		)
	`).Error)
	require.NoError(t, testDB.Exec(`CREATE INDEX idx_workflow_tasks_instance ON workflow_tasks(instance_id)`).Error)

	require.NoError(t, testDB.Exec(`
		CREATE TABLE purchase_orders (
			id TEXT PRIMARY KEY NOT NULL,
			order_no TEXT,
			supplier_id TEXT,
			supplier_name TEXT,
			order_date TEXT,
			expected_date TEXT,
			status TEXT,
			currency TEXT,
			amount REAL,
			exchange_rate REAL,
			purchaser TEXT,
			payment_term TEXT,
			note TEXT,
			workflow_instance_id TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			is_deleted BOOLEAN DEFAULT FALSE,
			version INTEGER DEFAULT 1
		)
	`).Error)

	return testDB
}

func seedWorkflowDefinition(t *testing.T, testDB *gorm.DB, module string, definitionJSON string) models.WorkflowDefinition {
	t.Helper()

	definition := models.WorkflowDefinition{
		BaseModel:      models.BaseModel{ID: uuid.NewString()},
		Code:           "DEF-" + uuid.NewString(),
		Name:           "Test Definition",
		Version:        1,
		Module:         module,
		DefinitionJSON: definitionJSON,
		Description:    "test",
		IsActive:       true,
	}
	require.NoError(t, testDB.Create(&definition).Error)
	return definition
}

func TestCreateWorkflowInstanceForDocumentTx(t *testing.T) {
	originalDB := db.DB
	testDB := setupWorkflowServiceTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	seedWorkflowDefinition(t, testDB, WorkflowModulePurchaseOrder, `{"startNodeId":"n1","nodes":[{"nodeId":"n1","assigneeUserId":"u-approver"}]}`)

	var created *models.WorkflowInstance
	err := testDB.Transaction(func(tx *gorm.DB) error {
		instance, err := CreateWorkflowInstanceForDocumentTx(tx, WorkflowModulePurchaseOrder, "PURCHASE_ORDER", "po-1", "u-requester")
		if err != nil {
			return err
		}
		created = instance
		return nil
	})
	require.NoError(t, err)
	require.NotNil(t, created)
	require.Equal(t, models.WorkflowInstanceStatusRunning, created.Status)
	require.Equal(t, "n1", created.CurrentNodeID)

	var tasks []models.WorkflowTask
	require.NoError(t, testDB.Where("instance_id = ?", created.ID).Find(&tasks).Error)
	require.Len(t, tasks, 1)
	require.Equal(t, "u-approver", tasks[0].AssigneeUserID)
	require.Equal(t, models.WorkflowTaskStatusTodo, tasks[0].Status)
}

func TestApproveWorkflowTaskProgressAndFinalize(t *testing.T) {
	originalDB := db.DB
	testDB := setupWorkflowServiceTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	seedWorkflowDefinition(t, testDB, WorkflowModuleSalesOrder, `{"startNodeId":"n1","nodes":[{"nodeId":"n1","assigneeUserId":"u-1","nextNodeId":"n2"},{"nodeId":"n2","assigneeUserId":"u-2"}]}`)

	var instance *models.WorkflowInstance
	require.NoError(t, testDB.Transaction(func(tx *gorm.DB) error {
		created, err := CreateWorkflowInstanceForDocumentTx(tx, WorkflowModuleSalesOrder, "SALES_ORDER", "so-1", "u-requester")
		if err != nil {
			return err
		}
		instance = created
		return nil
	}))

	var firstTask models.WorkflowTask
	require.NoError(t, testDB.Where("instance_id = ?", instance.ID).First(&firstTask).Error)

	progressed, err := ApproveWorkflowTask(firstTask.ID, "u-1", "ok")
	require.NoError(t, err)
	require.Equal(t, models.WorkflowInstanceStatusRunning, progressed.Status)
	require.Equal(t, "n2", progressed.CurrentNodeID)

	var todoTasks []models.WorkflowTask
	require.NoError(t, testDB.Where("instance_id = ? AND status = ?", instance.ID, models.WorkflowTaskStatusTodo).Find(&todoTasks).Error)
	require.Len(t, todoTasks, 1)
	require.Equal(t, "u-2", todoTasks[0].AssigneeUserID)

	finalized, err := ApproveWorkflowTask(todoTasks[0].ID, "u-2", "approved")
	require.NoError(t, err)
	require.Equal(t, models.WorkflowInstanceStatusApproved, finalized.Status)
	require.NotNil(t, finalized.FinishedAt)
}

func TestApproveWorkflowTaskFinalizedPurchaseOrderTransitionsToSent(t *testing.T) {
	originalDB := db.DB
	testDB := setupWorkflowServiceTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	seedWorkflowDefinition(t, testDB, WorkflowModulePurchaseOrder, `{"startNodeId":"n1","nodes":[{"nodeId":"n1","assigneeUserId":"u-approver"}]}`)
	require.NoError(t, testDB.Exec(`
		INSERT INTO purchase_orders (id, order_no, status, currency, amount, exchange_rate, created_at, updated_at, is_deleted, version)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, "po-approved-1", "PO-APP-001", "Draft", "CNY", 120.5, 1.0, time.Now(), time.Now(), false, 1).Error)

	var instance *models.WorkflowInstance
	require.NoError(t, testDB.Transaction(func(tx *gorm.DB) error {
		created, err := CreateWorkflowInstanceForDocumentTx(tx, WorkflowModulePurchaseOrder, "PURCHASE_ORDER", "po-approved-1", "u-requester")
		if err != nil {
			return err
		}
		instance = created
		return tx.Model(&models.PurchaseOrder{}).Where("id = ?", "po-approved-1").Update("workflow_instance_id", created.ID).Error
	}))

	var task models.WorkflowTask
	require.NoError(t, testDB.Where("instance_id = ?", instance.ID).First(&task).Error)

	approved, err := ApproveWorkflowTask(task.ID, "u-approver", "approved")
	require.NoError(t, err)
	require.Equal(t, models.WorkflowInstanceStatusApproved, approved.Status)

	var purchaseOrder models.PurchaseOrder
	require.NoError(t, testDB.Where("id = ?", "po-approved-1").First(&purchaseOrder).Error)
	require.Equal(t, "Sent", purchaseOrder.Status)
}

func TestRejectWorkflowTask(t *testing.T) {
	originalDB := db.DB
	testDB := setupWorkflowServiceTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	seedWorkflowDefinition(t, testDB, WorkflowModulePurchaseOrder, `{"startNodeId":"n1","nodes":[{"nodeId":"n1","assigneeUserId":"u-approver"}]}`)

	var instance *models.WorkflowInstance
	require.NoError(t, testDB.Transaction(func(tx *gorm.DB) error {
		created, err := CreateWorkflowInstanceForDocumentTx(tx, WorkflowModulePurchaseOrder, "PURCHASE_ORDER", "po-2", "u-requester")
		if err != nil {
			return err
		}
		instance = created
		return nil
	}))

	var task models.WorkflowTask
	require.NoError(t, testDB.Where("instance_id = ?", instance.ID).First(&task).Error)

	rejected, err := RejectWorkflowTask(task.ID, "u-approver", "reject")
	require.NoError(t, err)
	require.Equal(t, models.WorkflowInstanceStatusRejected, rejected.Status)
	require.NotNil(t, rejected.FinishedAt)

	var updatedTask models.WorkflowTask
	require.NoError(t, testDB.Where("id = ?", task.ID).First(&updatedTask).Error)
	require.Equal(t, models.WorkflowTaskStatusRejected, updatedTask.Status)
}

func TestApproveWorkflowTaskRejectsAssigneeMismatch(t *testing.T) {
	originalDB := db.DB
	testDB := setupWorkflowServiceTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	seedWorkflowDefinition(t, testDB, WorkflowModulePurchaseOrder, `{"startNodeId":"n1","nodes":[{"nodeId":"n1","assigneeUserId":"u-approver"}]}`)

	var instance *models.WorkflowInstance
	require.NoError(t, testDB.Transaction(func(tx *gorm.DB) error {
		created, err := CreateWorkflowInstanceForDocumentTx(tx, WorkflowModulePurchaseOrder, "PURCHASE_ORDER", "po-3", "u-requester")
		if err != nil {
			return err
		}
		instance = created
		return nil
	}))

	var task models.WorkflowTask
	require.NoError(t, testDB.Where("instance_id = ?", instance.ID).First(&task).Error)

	_, err := ApproveWorkflowTask(task.ID, "u-other", "invalid")
	require.Error(t, err)
	require.ErrorIs(t, err, ErrWorkflowTaskAssigneeMismatch)
}

func TestCreateWorkflowInstanceFailsWhenDefinitionMissing(t *testing.T) {
	originalDB := db.DB
	testDB := setupWorkflowServiceTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	err := testDB.Transaction(func(tx *gorm.DB) error {
		_, err := CreateWorkflowInstanceForDocumentTx(tx, WorkflowModulePurchaseOrder, "PURCHASE_ORDER", "po-missing", "u-requester")
		return err
	})
	require.Error(t, err)
	require.ErrorIs(t, err, ErrWorkflowDefinitionMissing)
}

func TestValidateWorkflowDefinitionJSON(t *testing.T) {
	err := ValidateWorkflowDefinitionJSON(`{"startNodeId":"n1","nodes":[{"nodeId":"n1","nextNodeId":"n2"}]}`)
	require.Error(t, err)
	require.Contains(t, err.Error(), "nextNodeId not found")

	err = ValidateWorkflowDefinitionJSON(`{"startNodeId":"n1","nodes":[{"nodeId":"n1"}]}`)
	require.NoError(t, err)

	err = ValidateWorkflowDefinitionJSON(" ")
	require.Error(t, err)
}

func TestWorkflowInstanceFinishTimeMonotonic(t *testing.T) {
	originalDB := db.DB
	testDB := setupWorkflowServiceTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	seedWorkflowDefinition(t, testDB, WorkflowModulePurchaseOrder, `{"startNodeId":"n1","nodes":[{"nodeId":"n1","assigneeUserId":"u-approver"}]}`)

	var instance *models.WorkflowInstance
	require.NoError(t, testDB.Transaction(func(tx *gorm.DB) error {
		created, err := CreateWorkflowInstanceForDocumentTx(tx, WorkflowModulePurchaseOrder, "PURCHASE_ORDER", "po-4", "u-requester")
		if err != nil {
			return err
		}
		instance = created
		return nil
	}))

	var task models.WorkflowTask
	require.NoError(t, testDB.Where("instance_id = ?", instance.ID).First(&task).Error)

	before := time.Now()
	rejected, err := RejectWorkflowTask(task.ID, "u-approver", "reject")
	require.NoError(t, err)
	require.NotNil(t, rejected.FinishedAt)
	require.True(t, rejected.FinishedAt.After(before) || rejected.FinishedAt.Equal(before))
}
