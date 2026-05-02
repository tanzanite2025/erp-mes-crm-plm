package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func setupKnowledgeBaseHandlerTestRouter(t *testing.T) *gin.Engine {
	t.Helper()
	gin.SetMode(gin.TestMode)
	setupHandlerSQLiteTestDB(t)
	for _, statement := range []string{
		`CREATE TABLE knowledge_base_entries (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			title TEXT NOT NULL,
			category TEXT NOT NULL,
			summary TEXT NOT NULL,
			content_html TEXT NOT NULL,
			content_text TEXT NOT NULL,
			keywords TEXT NOT NULL DEFAULT '[]',
			route_path TEXT,
			has_image BOOLEAN NOT NULL DEFAULT 0,
			has_video BOOLEAN NOT NULL DEFAULT 0,
			view_count INTEGER NOT NULL DEFAULT 0,
			last_viewed_at DATETIME,
			version INTEGER NOT NULL DEFAULT 1,
			created_by TEXT,
			updated_by TEXT
		)`,
		`CREATE TABLE system_configs (
			key TEXT PRIMARY KEY NOT NULL,
			value TEXT,
			label TEXT,
			description TEXT
		)`,
	} {
		require.NoError(t, db.DB.Exec(statement).Error)
	}

	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("userId", "11111111-1111-1111-1111-111111111111")
		c.Set("permissions", []string{
			"menu_settings",
			"tab_warehouse_config_packaging_assembly",
			"tab_code_center_linear_barcode_print",
			"tab_a",
			"tab_b",
			"tab_knowledge",
		})
		c.Next()
	})
	router.GET("/knowledge-base/entries", GetKnowledgeBaseEntriesHandler)
	router.GET("/knowledge-base/entries/search", SearchKnowledgeBaseEntriesHandler)
	router.POST("/knowledge-base/entries", CreateKnowledgeBaseEntryHandler)
	router.PUT("/knowledge-base/entries/:id", UpdateKnowledgeBaseEntryHandler)
	router.POST("/knowledge-base/entries/:id/view", RecordKnowledgeBaseEntryViewHandler)
	router.DELETE("/knowledge-base/entries/:id", DeleteKnowledgeBaseEntryHandler)
	return router
}

func TestKnowledgeBaseHandlersSeedFromLegacyConfig(t *testing.T) {
	router := setupKnowledgeBaseHandlerTestRouter(t)
	legacyValue, err := json.Marshal([]map[string]any{
		{
			"id":        "kb-legacy-entry",
			"title":     "Legacy Knowledge",
			"category":  "operation",
			"summary":   "Legacy summary",
			"content":   "<p>Legacy <strong>content</strong></p>",
			"keywords":  []string{"legacy", "knowledge"},
			"routePath": "/basic-settings/knowledge-base",
		},
	})
	require.NoError(t, err)
	require.NoError(t, dbCreateSystemConfigForKnowledgeTest(string(legacyValue)))

	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/knowledge-base/entries", nil))
	require.Equal(t, http.StatusOK, recorder.Code)

	var entries []models.KnowledgeBaseEntry
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &entries))
	require.Len(t, entries, 1)
	require.Equal(t, "Legacy Knowledge", entries[0].Title)
	require.NotEqual(t, "kb-legacy-entry", entries[0].ID)
	require.Equal(t, "Legacy content", entries[0].ContentText)
}

func TestKnowledgeBaseHandlersCrudAndVersionConflict(t *testing.T) {
	router := setupKnowledgeBaseHandlerTestRouter(t)

	createBody := `{
		"title":"Image Knowledge",
		"category":"operation",
		"summary":"Summary",
		"content":"<p onclick=\"alert(1)\">Body</p><script>bad()</script><a href=\"javascript:alert(1)\">unsafe</a><img src=\"data:image/png;base64,AA==\" alt=\"demo\">",
		"keywords":["image","demo"],
		"routePath":"/basic-settings/knowledge-base"
	}`
	createRecorder := httptest.NewRecorder()
	router.ServeHTTP(createRecorder, httptest.NewRequest(http.MethodPost, "/knowledge-base/entries", strings.NewReader(createBody)))
	require.Equal(t, http.StatusOK, createRecorder.Code)

	var created models.KnowledgeBaseEntry
	require.NoError(t, json.Unmarshal(createRecorder.Body.Bytes(), &created))
	require.NotEmpty(t, created.ID)
	require.True(t, created.HasImage)
	require.Equal(t, 1, created.Version)
	require.NotContains(t, created.ContentHTML, "script")
	require.NotContains(t, created.ContentHTML, "onclick")
	require.NotContains(t, created.ContentHTML, "javascript:")

	updateBody := `{
		"title":"Updated Knowledge",
		"category":"status",
		"summary":"Updated summary",
		"content":"<h3>Updated</h3><p>Body</p>",
		"keywords":["updated"],
		"routePath":"/basic-settings/knowledge-base",
		"version":1
	}`
	updateRecorder := httptest.NewRecorder()
	router.ServeHTTP(updateRecorder, httptest.NewRequest(http.MethodPut, "/knowledge-base/entries/"+created.ID, strings.NewReader(updateBody)))
	require.Equal(t, http.StatusOK, updateRecorder.Code)

	var updated models.KnowledgeBaseEntry
	require.NoError(t, json.Unmarshal(updateRecorder.Body.Bytes(), &updated))
	require.Equal(t, "Updated Knowledge", updated.Title)
	require.Equal(t, 2, updated.Version)
	require.Equal(t, "Updated\nBody", updated.ContentText)

	conflictRecorder := httptest.NewRecorder()
	router.ServeHTTP(conflictRecorder, httptest.NewRequest(http.MethodPut, "/knowledge-base/entries/"+created.ID, strings.NewReader(updateBody)))
	require.Equal(t, http.StatusConflict, conflictRecorder.Code)

	deleteRecorder := httptest.NewRecorder()
	router.ServeHTTP(deleteRecorder, httptest.NewRequest(http.MethodDelete, "/knowledge-base/entries/"+created.ID, nil))
	require.Equal(t, http.StatusNoContent, deleteRecorder.Code)
}

func TestKnowledgeBaseHandlersSearchRanksByBusinessTerms(t *testing.T) {
	router := setupKnowledgeBaseHandlerTestRouter(t)
	require.NoError(t, db.DB.Create(&models.KnowledgeBaseEntry{
		BaseModel:   models.BaseModel{ID: "11111111-1111-1111-1111-111111111111"},
		Title:       "装箱组装扫码流程",
		Category:    "operation",
		Summary:     "手机扫描装箱码后录入产品一维码",
		ContentHTML: "<p>先扫描纸箱上的装箱码，再绑定内部产品一维码。</p>",
		ContentText: "先扫描纸箱上的装箱码，再绑定内部产品一维码。",
		Keywords:    []byte(`["装箱码","手机扫码","产品一维码"]`),
		RoutePath:   "/warehouse-config/packaging-assembly",
		ViewCount:   0,
		Version:     1,
	}).Error)
	require.NoError(t, db.DB.Create(&models.KnowledgeBaseEntry{
		BaseModel:   models.BaseModel{ID: "22222222-2222-2222-2222-222222222222"},
		Title:       "销售订单状态说明",
		Category:    "status",
		Summary:     "排产中用于一维码打印和 MRP",
		ContentHTML: "<p>销售订单进入排产中后才能打印一维码。</p>",
		ContentText: "销售订单进入排产中后才能打印一维码。",
		Keywords:    []byte(`["销售订单","排产中","状态机"]`),
		RoutePath:   "/code-center/linear-barcode/print",
		ViewCount:   50,
		Version:     1,
	}).Error)

	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/knowledge-base/entries/search?q="+url.QueryEscape("sjsm ywm"), nil))
	require.Equal(t, http.StatusOK, recorder.Code)

	var entries []models.KnowledgeBaseEntry
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &entries))
	require.Len(t, entries, 1)
	require.Equal(t, "装箱组装扫码流程", entries[0].Title)
}

func TestKnowledgeBaseHandlersSearchUsesClickHeatWhenRelevanceTies(t *testing.T) {
	router := setupKnowledgeBaseHandlerTestRouter(t)
	require.NoError(t, db.DB.Create(&models.KnowledgeBaseEntry{
		BaseModel:   models.BaseModel{ID: "33333333-3333-3333-3333-333333333333"},
		Title:       "低频排产说明",
		Category:    "status",
		Summary:     "排产中说明",
		ContentHTML: "<p>排产中说明</p>",
		ContentText: "排产中说明",
		Keywords:    []byte(`["排产中"]`),
		RoutePath:   "/a",
		ViewCount:   0,
		Version:     1,
	}).Error)
	require.NoError(t, db.DB.Create(&models.KnowledgeBaseEntry{
		BaseModel:   models.BaseModel{ID: "44444444-4444-4444-4444-444444444444"},
		Title:       "高频排产说明",
		Category:    "status",
		Summary:     "排产中说明",
		ContentHTML: "<p>排产中说明</p>",
		ContentText: "排产中说明",
		Keywords:    []byte(`["排产中"]`),
		RoutePath:   "/b",
		ViewCount:   80,
		Version:     1,
	}).Error)

	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/knowledge-base/entries/search?q="+url.QueryEscape("paichanzhong"), nil))
	require.Equal(t, http.StatusOK, recorder.Code)

	var entries []models.KnowledgeBaseEntry
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &entries))
	require.Len(t, entries, 2)
	require.Equal(t, "高频排产说明", entries[0].Title)
}

func TestKnowledgeBaseHandlersRecordView(t *testing.T) {
	router := setupKnowledgeBaseHandlerTestRouter(t)
	entryID := "55555555-5555-5555-5555-555555555555"
	require.NoError(t, db.DB.Create(&models.KnowledgeBaseEntry{
		BaseModel:   models.BaseModel{ID: entryID},
		Title:       "浏览统计",
		Category:    "operation",
		Summary:     "统计点击热度",
		ContentHTML: "<p>统计点击热度</p>",
		ContentText: "统计点击热度",
		Keywords:    []byte(`[]`),
		RoutePath:   "/knowledge",
		Version:     1,
	}).Error)

	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, httptest.NewRequest(http.MethodPost, "/knowledge-base/entries/"+entryID+"/view", nil))
	require.Equal(t, http.StatusNoContent, recorder.Code)

	var entry models.KnowledgeBaseEntry
	require.NoError(t, db.DB.First(&entry, "id = ?", entryID).Error)
	require.Equal(t, 1, entry.ViewCount)
	require.NotNil(t, entry.LastViewedAt)
}

func TestKnowledgeBaseHandlersSearchReturnsRouteLinkedKnowledge(t *testing.T) {
	router := setupKnowledgeBaseHandlerTestRouter(t)
	require.NoError(t, db.DB.Create(&models.KnowledgeBaseEntry{
		BaseModel:   models.BaseModel{ID: "66666666-6666-6666-6666-666666666666"},
		Title:       "可见销售订单知识",
		Category:    "status",
		Summary:     "排产中说明",
		ContentHTML: "<p>排产中说明</p>",
		ContentText: "排产中说明",
		Keywords:    []byte(`["排产中"]`),
		RoutePath:   "/code-center/linear-barcode/print",
		Version:     1,
	}).Error)
	require.NoError(t, db.DB.Create(&models.KnowledgeBaseEntry{
		BaseModel:   models.BaseModel{ID: "77777777-7777-7777-7777-777777777777"},
		Title:       "不可见系统管理知识",
		Category:    "operation",
		Summary:     "系统审计说明",
		ContentHTML: "<p>系统审计说明</p>",
		ContentText: "系统审计说明",
		Keywords:    []byte(`["排产中"]`),
		RoutePath:   "/system-management/audit-engine",
		Version:     1,
	}).Error)

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/knowledge-base/entries/search?q="+url.QueryEscape("排产中"), nil)
	router.ServeHTTP(recorder, request)
	require.Equal(t, http.StatusOK, recorder.Code)

	var entries []models.KnowledgeBaseEntry
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &entries))
	require.Len(t, entries, 2)
}

func dbCreateSystemConfigForKnowledgeTest(value string) error {
	return db.DB.Create(&models.SystemConfig{
		Key:   legacyKnowledgeBaseConfigKey,
		Value: value,
		Label: "Knowledge Base",
	}).Error
}
