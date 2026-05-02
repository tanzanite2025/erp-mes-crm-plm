package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func setupPrintBatchHandlerTestDB(t *testing.T) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	setupHandlerSQLiteTestDB(t)

	statements := []string{
		`CREATE TABLE print_batches (
			id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			batch_no TEXT NOT NULL UNIQUE,
			template_name TEXT NOT NULL,
			product_id TEXT,
			bom_id TEXT,
			start_sn TEXT,
			full_code TEXT,
			quantity INTEGER NOT NULL,
			activated_count INTEGER DEFAULT 0,
			status TEXT,
			version INTEGER DEFAULT 1
		)`,
		`CREATE TABLE sequences (
			key TEXT PRIMARY KEY NOT NULL,
			value INTEGER DEFAULT 0,
			updated_at DATETIME
		)`,
	}

	for _, statement := range statements {
		require.NoError(t, db.DB.Exec(statement).Error)
	}
}

type atomicPrintResponse struct {
	Batch models.PrintBatch `json:"batch"`
	SN    string            `json:"sn"`
}

func TestAtomicPrintHandlerAllocatesNonOverlappingRangesByQuantity(t *testing.T) {
	setupPrintBatchHandlerTestDB(t)

	productID := uuid.NewString()

	firstRecorder := httptest.NewRecorder()
	firstCtx, _ := gin.CreateTestContext(firstRecorder)
	firstRequest := httptest.NewRequest(http.MethodPost, "/api/v1/print-batches/atomic-print", strings.NewReader(`{"productId":"`+productID+`","templateName":"Batch A","quantity":500}`))
	firstRequest.Header.Set("Content-Type", "application/json")
	firstCtx.Request = firstRequest

	AtomicPrintHandler(firstCtx)
	if firstRecorder.Code != http.StatusOK {
		t.Fatalf("unexpected first atomic print response: %d %s", firstRecorder.Code, firstRecorder.Body.String())
	}

	var firstResponse atomicPrintResponse
	require.NoError(t, json.Unmarshal(firstRecorder.Body.Bytes(), &firstResponse))
	require.Equal(t, toBase36(1), firstResponse.SN)
	require.Equal(t, toBase36(1), firstResponse.Batch.StartSN)
	require.Equal(t, 500, firstResponse.Batch.Quantity)
	require.NotEmpty(t, firstResponse.Batch.BatchNo)

	secondRecorder := httptest.NewRecorder()
	secondCtx, _ := gin.CreateTestContext(secondRecorder)
	secondRequest := httptest.NewRequest(http.MethodPost, "/api/v1/print-batches/atomic-print", strings.NewReader(`{"productId":"`+productID+`","templateName":"Batch B","quantity":200}`))
	secondRequest.Header.Set("Content-Type", "application/json")
	secondCtx.Request = secondRequest

	AtomicPrintHandler(secondCtx)
	if secondRecorder.Code != http.StatusOK {
		t.Fatalf("unexpected second atomic print response: %d %s", secondRecorder.Code, secondRecorder.Body.String())
	}

	var secondResponse atomicPrintResponse
	require.NoError(t, json.Unmarshal(secondRecorder.Body.Bytes(), &secondResponse))
	require.Equal(t, toBase36(501), secondResponse.SN)
	require.Equal(t, toBase36(501), secondResponse.Batch.StartSN)
	require.Equal(t, 200, secondResponse.Batch.Quantity)
	require.NotEqual(t, firstResponse.Batch.BatchNo, secondResponse.Batch.BatchNo)

	var sequence models.Sequence
	require.NoError(t, db.DB.Where("key = ?", "product:"+productID+":dm_sn").First(&sequence).Error)
	require.Equal(t, int64(700), sequence.Value)
}

func TestAtomicPrintHandlerRejectsNonPositiveQuantity(t *testing.T) {
	setupPrintBatchHandlerTestDB(t)

	productID := uuid.NewString()
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(http.MethodPost, "/api/v1/print-batches/atomic-print", strings.NewReader(`{"productId":"`+productID+`","templateName":"Batch A","quantity":0}`))
	request.Header.Set("Content-Type", "application/json")
	ctx.Request = request

	AtomicPrintHandler(ctx)
	require.Equal(t, http.StatusBadRequest, recorder.Code, recorder.Body.String())
	require.Contains(t, recorder.Body.String(), "quantity")

	var count int64
	require.NoError(t, db.DB.Raw(`SELECT COUNT(*) FROM sequences`).Scan(&count).Error)
	require.Equal(t, int64(0), count)
}
