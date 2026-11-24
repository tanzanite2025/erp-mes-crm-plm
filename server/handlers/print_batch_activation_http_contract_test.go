package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func createPrintBatchActivationHTTPContractFixture(t *testing.T) (*gorm.DB, *gin.Engine) {
	t.Helper()
	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	connection, err := database.DB()
	require.NoError(t, err)
	connection.SetMaxOpenConns(1)
	t.Cleanup(func() { require.NoError(t, connection.Close()) })
	require.NoError(t, database.Exec(`CREATE TABLE print_batches (
		id TEXT PRIMARY KEY,
		created_at DATETIME,
		updated_at DATETIME,
		deleted_at DATETIME,
		batch_no TEXT,
		template_name TEXT,
		product_id TEXT,
		bom_id TEXT,
		start_sn TEXT,
		end_sn TEXT,
		full_code TEXT,
		sales_order_id TEXT,
		sales_order_line_no INTEGER,
		quantity INTEGER,
		activated_count INTEGER,
		status TEXT,
		expires_at DATETIME,
		version INTEGER
	)`).Error)
	require.NoError(t, database.Exec(`CREATE TABLE linear_barcode_inventory_items (
		id TEXT PRIMARY KEY,
		batch_id TEXT,
		deleted_at DATETIME
	)`).Error)
	previousDatabase := db.DB
	db.DB = database
	t.Cleanup(func() { db.DB = previousDatabase })
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/print-batches", SavePrintBatchHandler)
	router.POST("/print-batches/:id/activate", ActivateBatchHandler)
	return database, router
}

func sendPrintBatchActivationHTTPRequest(router *gin.Engine, batchID, body string) *httptest.ResponseRecorder {
	request := httptest.NewRequest(http.MethodPost, "/print-batches/"+batchID+"/activate", bytes.NewBufferString(body))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	return response
}

func sendPrintBatchSaveHTTPRequest(router *gin.Engine, body string) *httptest.ResponseRecorder {
	request := httptest.NewRequest(http.MethodPost, "/print-batches", bytes.NewBufferString(body))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	return response
}

func TestPrintBatchActivationRequiresScanForProductCodesAndPreservesLegacyBatchActivation(t *testing.T) {
	database, router := createPrintBatchActivationHTTPContractFixture(t)
	for _, batch := range []models.PrintBatch{
		{BaseModel: models.BaseModel{ID: "product-code-batch"}, BatchNo: "P-CODE", TemplateName: "PRODUCT-CODE", Quantity: 3, Status: "Printed", Version: 1},
		{BaseModel: models.BaseModel{ID: "legacy-batch"}, BatchNo: "P-LEGACY", TemplateName: "LEGACY", Quantity: 3, Status: "Printed", Version: 1},
	} {
		require.NoError(t, database.Create(&batch).Error)
	}
	require.NoError(t, database.Exec(
		"INSERT INTO linear_barcode_inventory_items (id, batch_id) VALUES (?, ?)",
		"product-code-item",
		"product-code-batch",
	).Error)

	response := sendPrintBatchActivationHTTPRequest(router, "product-code-batch", `{"count":2,"_v":1}`)
	require.Equal(t, http.StatusConflict, response.Code, response.Body.String())
	var conflictBody map[string]any
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &conflictBody))
	require.Equal(t, "LINEAR_BARCODE_SCAN_REQUIRED_FOR_ACTIVATION", conflictBody["code"])
	var productCodeBatch models.PrintBatch
	require.NoError(t, database.First(&productCodeBatch, "id = ?", "product-code-batch").Error)
	require.Equal(t, 0, productCodeBatch.ActivatedCount)
	require.Equal(t, "Printed", productCodeBatch.Status)
	require.Equal(t, 1, productCodeBatch.Version)

	response = sendPrintBatchActivationHTTPRequest(router, "legacy-batch", `{"count":2,"_v":1}`)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var activatedLegacyBatch models.PrintBatch
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &activatedLegacyBatch))
	require.Equal(t, 2, activatedLegacyBatch.ActivatedCount)
	require.Equal(t, "PartiallyActivated", activatedLegacyBatch.Status)
	require.Equal(t, 2, activatedLegacyBatch.Version)
}

func TestPrintBatchActivationRejectsInvalidCountsAndTerminalStates(t *testing.T) {
	database, router := createPrintBatchActivationHTTPContractFixture(t)
	for _, batch := range []models.PrintBatch{
		{BaseModel: models.BaseModel{ID: "printed-batch"}, BatchNo: "P-PRINTED", TemplateName: "LEGACY", Quantity: 3, Status: "Printed", Version: 1},
		{BaseModel: models.BaseModel{ID: "large-count-batch"}, BatchNo: "P-LARGE", TemplateName: "LEGACY", Quantity: 5, ActivatedCount: 1, Status: "PartiallyActivated", Version: 1},
		{BaseModel: models.BaseModel{ID: "activated-batch"}, BatchNo: "P-ACTIVATED", TemplateName: "LEGACY", Quantity: 3, ActivatedCount: 3, Status: "Activated", Version: 1},
		{BaseModel: models.BaseModel{ID: "scrapped-batch"}, BatchNo: "P-SCRAPPED", TemplateName: "LEGACY", Quantity: 3, Status: "Scrapped", Version: 1},
	} {
		require.NoError(t, database.Create(&batch).Error)
	}

	for _, requestBody := range []string{`{"count":0,"_v":1}`, `{"count":-1,"_v":1}`} {
		response := sendPrintBatchActivationHTTPRequest(router, "printed-batch", requestBody)
		require.Equal(t, http.StatusBadRequest, response.Code, response.Body.String())
	}
	var unchangedPrintedBatch models.PrintBatch
	require.NoError(t, database.First(&unchangedPrintedBatch, "id = ?", "printed-batch").Error)
	require.Equal(t, 0, unchangedPrintedBatch.ActivatedCount)
	require.Equal(t, 1, unchangedPrintedBatch.Version)

	maxIntActivationCount := strconv.Itoa(int(^uint(0) >> 1))
	response := sendPrintBatchActivationHTTPRequest(
		router,
		"large-count-batch",
		`{"count":`+maxIntActivationCount+`,"_v":1}`,
	)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var saturatedBatch models.PrintBatch
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &saturatedBatch))
	require.Equal(t, 5, saturatedBatch.ActivatedCount)
	require.Equal(t, "Activated", saturatedBatch.Status)

	for _, batchID := range []string{"activated-batch", "scrapped-batch"} {
		response := sendPrintBatchActivationHTTPRequest(router, batchID, `{"count":1,"_v":1}`)
		require.Equal(t, http.StatusConflict, response.Code, response.Body.String())
		var conflictBody map[string]any
		require.NoError(t, json.Unmarshal(response.Body.Bytes(), &conflictBody))
		require.Equal(t, "PRINT_BATCH_NOT_ACTIVATABLE", conflictBody["code"])
		var unchangedBatch models.PrintBatch
		require.NoError(t, database.First(&unchangedBatch, "id = ?", batchID).Error)
		require.Equal(t, 1, unchangedBatch.Version)
	}

	response = sendPrintBatchActivationHTTPRequest(router, "missing-batch", `{"count":1,"_v":1}`)
	require.Equal(t, http.StatusNotFound, response.Code, response.Body.String())
}

func TestPrintBatchSaveRejectsEditsAfterProductCodeInventoryIsIssued(t *testing.T) {
	database, router := createPrintBatchActivationHTTPContractFixture(t)
	batch := models.PrintBatch{
		BaseModel:    models.BaseModel{ID: "issued-product-code-batch"},
		BatchNo:      "P-ISSUED",
		TemplateName: "PRODUCT-CODE",
		Quantity:     3,
		Status:       "Printed",
		Version:      1,
	}
	require.NoError(t, database.Create(&batch).Error)
	require.NoError(t, database.Exec(
		"INSERT INTO linear_barcode_inventory_items (id, batch_id) VALUES (?, ?)",
		"issued-product-code-item",
		batch.ID,
	).Error)

	response := sendPrintBatchSaveHTTPRequest(router, `{"id":"issued-product-code-batch","batchNo":"P-ISSUED","templateName":"PRODUCT-CODE","quantity":9,"activatedCount":2,"status":"Activated","version":1}`)
	require.Equal(t, http.StatusConflict, response.Code, response.Body.String())
	var conflictBody map[string]any
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &conflictBody))
	require.Equal(t, "PRODUCT_CODE_PRINT_BATCH_IS_IMMUTABLE", conflictBody["code"])
	var unchangedBatch models.PrintBatch
	require.NoError(t, database.First(&unchangedBatch, "id = ?", batch.ID).Error)
	require.Equal(t, 3, unchangedBatch.Quantity)
	require.Equal(t, 0, unchangedBatch.ActivatedCount)
	require.Equal(t, "Printed", unchangedBatch.Status)
	require.Equal(t, 1, unchangedBatch.Version)
}

func TestPrintBatchSaveCannotWriteLifecycleStateDirectly(t *testing.T) {
	database, router := createPrintBatchActivationHTTPContractFixture(t)
	activatedBatch := models.PrintBatch{
		BaseModel:      models.BaseModel{ID: "activated-legacy-batch"},
		BatchNo:        "P-ACTIVATED-LEGACY",
		TemplateName:   "LEGACY",
		Quantity:       3,
		ActivatedCount: 1,
		Status:         "PartiallyActivated",
		Version:        1,
	}
	require.NoError(t, database.Create(&activatedBatch).Error)

	response := sendPrintBatchSaveHTTPRequest(router, `{"id":"activated-legacy-batch","batchNo":"P-ACTIVATED-LEGACY","templateName":"LEGACY","quantity":5,"activatedCount":3,"status":"Activated","version":1}`)
	require.Equal(t, http.StatusConflict, response.Code, response.Body.String())
	var unchangedBatch models.PrintBatch
	require.NoError(t, database.First(&unchangedBatch, "id = ?", activatedBatch.ID).Error)
	require.Equal(t, 3, unchangedBatch.Quantity)
	require.Equal(t, 1, unchangedBatch.ActivatedCount)
	require.Equal(t, "PartiallyActivated", unchangedBatch.Status)
	require.Equal(t, 1, unchangedBatch.Version)

	response = sendPrintBatchSaveHTTPRequest(router, `{"batchNo":"P-CLIENT-STATE","templateName":"LEGACY","quantity":3,"activatedCount":2,"status":"Activated"}`)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var newBatch models.PrintBatch
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &newBatch))
	require.Equal(t, 0, newBatch.ActivatedCount)
	require.Equal(t, "Printed", newBatch.Status)
}
