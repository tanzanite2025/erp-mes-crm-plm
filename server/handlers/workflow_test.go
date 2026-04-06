package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func setupWorkflowHandlerTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	gin.SetMode(gin.TestMode)

	prevDB := db.DB
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

	db.DB = testDB
	t.Cleanup(func() {
		db.DB = prevDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	return testDB
}

func TestSaveWorkflowDefinitionHandlerRejectsInvalidDefinitionJSON(t *testing.T) {
	setupWorkflowHandlerTestDB(t)

	payload := `{
		"id":"` + uuid.NewString() + `",
		"code":"PO_FLOW_01",
		"name":"PO 审批",
		"module":"` + services.WorkflowModulePurchaseOrder + `",
		"version":1,
		"definitionJson":"{\"startNodeId\":\"n1\",\"nodes\":[{\"nodeId\":\"n1\",\"nextNodeId\":\"n2\"}]}",
		"isActive":true
	}`

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/workflows/definitions", strings.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	c.Request = req

	SaveWorkflowDefinitionHandler(c)

	require.Equal(t, http.StatusBadRequest, w.Code)
	require.Contains(t, w.Body.String(), "nextNodeId not found")
}

func TestCreateWorkflowInstanceHandlerReturnsNotFoundWhenDefinitionMissing(t *testing.T) {
	setupWorkflowHandlerTestDB(t)

	payload := `{
		"module":"` + services.WorkflowModulePurchaseOrder + `",
		"businessType":"PURCHASE_ORDER",
		"businessRefId":"po-001"
	}`

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/workflows/instances", strings.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	c.Request = req
	c.Set("userId", "u-requester")

	CreateWorkflowInstanceHandler(c)

	require.Equal(t, http.StatusNotFound, w.Code)
	require.Contains(t, w.Body.String(), "未找到可用流程定义")
}

func TestApproveWorkflowTaskHandlerRejectsAssigneeMismatch(t *testing.T) {
	testDB := setupWorkflowHandlerTestDB(t)

	definition := models.WorkflowDefinition{
		BaseModel:      models.BaseModel{ID: uuid.NewString()},
		Code:           "SO_FLOW_01",
		Name:           "SO 审批",
		Version:        1,
		Module:         services.WorkflowModuleSalesOrder,
		DefinitionJSON: `{"startNodeId":"n1","nodes":[{"nodeId":"n1","assigneeUserId":"u-approver"}]}`,
		IsActive:       true,
	}
	require.NoError(t, testDB.Create(&definition).Error)

	var created *models.WorkflowInstance
	require.NoError(t, testDB.Transaction(func(tx *gorm.DB) error {
		instance, err := services.CreateWorkflowInstanceForDocumentTx(tx, services.WorkflowModuleSalesOrder, "SALES_ORDER", "so-001", "u-requester")
		if err != nil {
			return err
		}
		created = instance
		return nil
	}))

	var task models.WorkflowTask
	require.NoError(t, db.DB.Where("instance_id = ?", created.ID).First(&task).Error)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(http.MethodPatch, "/api/v1/workflows/tasks/"+task.ID+"/approve", strings.NewReader(`{"comment":"ok"}`))
	req.Header.Set("Content-Type", "application/json")
	c.Request = req
	c.Params = gin.Params{{Key: "id", Value: task.ID}}
	c.Set("userId", "u-other")

	ApproveWorkflowTaskHandler(c)

	require.Equal(t, http.StatusForbidden, w.Code)
	require.Contains(t, w.Body.String(), "当前用户不是该任务审批人")
}
