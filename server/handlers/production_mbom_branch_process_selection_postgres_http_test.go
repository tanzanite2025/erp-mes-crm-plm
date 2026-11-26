package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestProductionMBOMBranchProcessSelectionHTTPStoresProcessLibraryIDs(t *testing.T) {
	database := createProductionPlanMBOMBranchHTTPPostgresDatabase(t)
	productID := uuid.NewString()
	processStep := models.ProcessStep{Code: "HTTP-CUT-" + uuid.NewString(), Name: "裁切", IsActive: true}
	require.NoError(t, database.Create(&processStep).Error)
	require.NoError(t, database.Exec(`INSERT INTO products (id, sku, name, status) VALUES (?, 'PROCESS-HTTP', '选配测试产品', 'ACTIVE')`, productID).Error)
	require.NoError(t, database.Exec(`INSERT INTO boms (id, product_id, bom_type, status, owner_type, version_level)
		VALUES (?, ?, 'MBOM', 'RELEASED', 'INTERNAL', 'standard')`, uuid.NewString(), productID).Error)

	previousGinMode := gin.Mode()
	gin.SetMode(gin.TestMode)
	t.Cleanup(func() { gin.SetMode(previousGinMode) })
	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("username", "mbom-branch-process-http-test")
		c.Next()
	})
	router.POST("/production/mbom-branch-processes/selection", SaveProductionMBOMBranchProcessSelectionHandler)
	body, err := json.Marshal(services.SaveProductionMBOMBranchProcessSelectionHandlerRequest{
		ProductID: productID, BOMOwnerType: "INTERNAL", BOMVersionLevel: "standard",
		ProcessStepIDs: []string{processStep.ID},
	})
	require.NoError(t, err)
	request := httptest.NewRequest(http.MethodPost, "/production/mbom-branch-processes/selection", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var selection services.ProductionMBOMBranchProcessSelectionResponse
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &selection))
	require.Len(t, selection.Items, 1)
	require.Equal(t, processStep.ID, selection.Items[0].ID)
	require.Equal(t, processStep.Name, selection.Items[0].Name)

	var association models.ProductionMBOMBranchProcessAssociation
	require.NoError(t, database.Where("product_id = ? AND process_step_id = ?", productID, processStep.ID).First(&association).Error)
	var oldBranchProcessTableCount int64
	require.NoError(t, database.Raw("SELECT count(*) FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'production_bom_branch_operations'").Scan(&oldBranchProcessTableCount).Error)
	require.Zero(t, oldBranchProcessTableCount)
}
