package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestProductionBOMBranchOperationPostgresHTTPDeactivationReferenceConflictPreservesOperation(t *testing.T) {
	database := createProductionPlanMBOMBranchHTTPPostgresDatabase(t)
	require.NoError(t, database.AutoMigrate(&models.ProcessStep{}, &models.ProductionBOMBranchOperation{},
		&models.ProductionBOMBranchOperationProcessLibrarySelection{}, &models.ProductionRouteFamily{}, &models.ProductionRoute{}, &models.ProductionRouteStep{}))
	productID := uuid.NewString()
	require.NoError(t, database.Exec(`INSERT INTO products (id, sku, name, status) VALUES (?, 'PROTECTED-OPERATION', '引用保护测试产品', 'ACTIVE')`, productID).Error)
	require.NoError(t, database.Exec(`INSERT INTO boms (id, product_id, bom_type, status, owner_type, version_level)
		VALUES (?, ?, 'MBOM', 'RELEASED', 'INTERNAL', 'standard')`, uuid.NewString(), productID).Error)
	operation := models.ProductionBOMBranchOperation{ProductID: productID, BOMOwnerType: "INTERNAL", BOMVersionLevel: "standard", Name: "成型", IsActive: true}
	require.NoError(t, database.Create(&operation).Error)
	processLibrary := models.ProcessStep{Code: "PROTECTED-OPERATION-FORM", Name: operation.Name, IsActive: true}
	require.NoError(t, database.Create(&processLibrary).Error)
	require.NoError(t, database.Create(&models.ProductionBOMBranchOperationProcessLibrarySelection{
		ProductID: productID, BOMOwnerType: "INTERNAL", BOMVersionLevel: "standard",
		BranchOperationID: operation.ID, ProcessLibraryID: processLibrary.ID,
	}).Error)
	routeFamily := models.ProductionRouteFamily{
		BaseModel: models.BaseModel{ID: uuid.NewString()}, Code: "PROTECTED-OPERATION-ROUTE",
		ProductID: productID, BOMOwnerType: "INTERNAL", BOMVersionLevel: "standard",
	}
	require.NoError(t, database.Create(&routeFamily).Error)
	route := models.ProductionRoute{
		BaseModel: models.BaseModel{ID: uuid.NewString()}, RouteFamilyID: routeFamily.ID, RevisionNo: 1,
		Code: routeFamily.Code, Name: "引用保护测试路线", ProductID: productID,
		BOMOwnerType: "INTERNAL", BOMVersionLevel: "standard", Status: "PUBLISHED",
	}
	require.NoError(t, database.Create(&route).Error)
	require.NoError(t, database.Create(&models.ProductionRouteStep{RouteID: route.ID, BranchOperationID: operation.ID, Sequence: 1}).Error)
	require.NoError(t, database.Model(&routeFamily).Update("current_revision_id", route.ID).Error)
	operation.IsActive, operation.Name = false, "失败请求不得写入的名称"
	body, err := json.Marshal(operation)
	require.NoError(t, err)
	previousGinMode := gin.Mode()
	gin.SetMode(gin.TestMode)
	t.Cleanup(func() { gin.SetMode(previousGinMode) })
	router := gin.New()
	router.POST("/production/branch-operations", SaveProductionBOMBranchOperationHandler)
	request := httptest.NewRequest(http.MethodPost, "/production/branch-operations", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	require.Equal(t, http.StatusConflict, response.Code, response.Body.String())
	require.Contains(t, response.Body.String(), "已发布生产路线")
	var saved models.ProductionBOMBranchOperation
	require.NoError(t, database.First(&saved, "id = ?", operation.ID).Error)
	require.True(t, saved.IsActive)
	require.Equal(t, "成型", saved.Name)
}
