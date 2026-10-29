package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"sync"
	"testing"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func createMoldGroupMasterPostgresHTTPFixture(t *testing.T) (*gorm.DB, *gin.Engine, string) {
	t.Helper()
	database, router := createIsolatedProductAttributeCatalogPostgresHTTPFixture(t)
	require.NoError(t, database.AutoMigrate(&models.MoldGroup{}, &models.Mold{}, &models.ProductTemplate{}, &models.ProductType{}, &models.Product{}, &models.AuditLog{}))
	router.GET("/mold-groups", GetMoldGroupMasterDirectoryHandler)
	router.POST("/mold-groups", SaveMoldGroupMasterHandler)
	router.PUT("/mold-groups/:id", SaveMoldGroupMasterHandler)
	router.DELETE("/mold-groups/:id", DeleteMoldGroupMasterHandler)
	router.POST("/molds", SaveMoldHandler)
	router.PATCH("/molds/:id", PatchMoldHandler)
	router.GET("/molds/:id", GetMoldHandler)
	router.POST("/products", SaveProductHandler)
	router.PATCH("/products/:id", PatchProductHandler)
	router.GET("/products/:id", GetProductHandler)
	template := models.ProductTemplate{Name: "模具关联测试模板", Code: uuid.NewString(), ComponentKey: "RIM", Active: true, Version: 1}
	require.NoError(t, database.Create(&template).Error)
	productType := models.ProductType{Name: "分组测试产品", Code: "MOLDTEST", TemplateID: &template.ID, Active: true, Version: 1}
	require.NoError(t, database.Create(&productType).Error)
	return database, router, productType.ID
}

func TestMoldGroupMasterHTTPProductBindingsSurviveRenameAndDisabledGroupsRejectNewAssignments(t *testing.T) {
	database, router, typeID := createMoldGroupMasterPostgresHTTPFixture(t)
	require.NoError(t, db.BackfillMoldGroupMasterIdentities(database))
	response := submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPost, "/mold-groups", map[string]any{"name": "R50 原分组"})
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var group models.MoldGroup
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &group))
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodGet, "/mold-groups", nil)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var directory []services.MoldGroupMasterDirectoryRecord
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &directory))
	require.Len(t, directory, 1)
	require.Zero(t, directory[0].MoldCount)
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPost, "/products", map[string]any{"name": "R50 产品", "typeId": typeID, "modelCode": "01", "moldGroupId": group.ID})
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var product ProductApiDTO
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &product))
	require.Equal(t, group.ID, product.MoldGroupID)
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPost, "/molds", map[string]any{"sn": "M-ID-01", "name": "ID 绑定模具", "groupId": group.ID, "groupName": "旧客户端的过期显示名"})
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var mold models.Mold
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &mold))
	require.Equal(t, group.Name, mold.GroupName)
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPut, "/mold-groups/"+group.ID, map[string]any{"name": "R50 正式分组", "active": true, "version": 1})
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodGet, "/products/"+product.ID, nil)
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &product))
	require.Equal(t, group.ID, product.MoldGroupID)
	require.Equal(t, "R50 正式分组", product.MoldGroup)
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodGet, "/molds/"+mold.ID, nil)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &mold))
	require.Equal(t, group.ID, services.MoldGroupIDString(mold.GroupID))
	require.Equal(t, "R50 正式分组", mold.GroupName)
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodDelete, "/mold-groups/"+group.ID+"?version=2", nil)
	require.Equal(t, http.StatusConflict, response.Code, response.Body.String())
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPut, "/mold-groups/"+group.ID, map[string]any{"name": "R50 正式分组", "active": false, "version": 2})
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPatch, "/products/"+product.ID, buildProductAttributeCatalogPatchRequest(product.ID, product.Version, map[string]any{"description": map[string]any{"o": "", "n": "保留停用组的已有绑定"}}))
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &product))
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPost, "/products", map[string]any{"name": "不得绑定停用组", "typeId": typeID, "modelCode": "02", "moldGroupId": group.ID})
	require.Equal(t, http.StatusBadRequest, response.Code, response.Body.String())
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPatch, "/products/"+product.ID, buildProductAttributeCatalogPatchRequest(product.ID, product.Version, map[string]any{"moldGroupId": map[string]any{"o": group.ID, "n": ""}}))
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var cleared models.Product
	require.NoError(t, database.First(&cleared, "id = ?", product.ID).Error)
	require.Nil(t, cleared.MoldGroupID)
	require.Empty(t, cleared.MoldGroup)
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPost, "/products", map[string]any{"name": "未知分组", "typeId": typeID, "modelCode": "02", "moldGroupId": uuid.NewString()})
	require.Equal(t, http.StatusBadRequest, response.Code, response.Body.String())
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPost, "/molds", map[string]any{"sn": "M-UNKNOWN", "name": "不得隐式建组", "groupName": "随手输入的未知名称"})
	require.Equal(t, http.StatusBadRequest, response.Code, response.Body.String())
}

func TestMoldGroupMasterMigrationPreservesProductOnlyAndArchivedNamesAndEnforcesForeignKeys(t *testing.T) {
	database, _, typeID := createMoldGroupMasterPostgresHTTPFixture(t)
	mold := models.Mold{SN: "LEGACY-MOLD", Name: "历史模具", GroupName: "  共用分组  "}
	require.NoError(t, database.Create(&mold).Error)
	shared := models.Product{SKU: "MOLDTEST-01", Name: "共用产品", TypeID: typeID, MoldGroup: "共用分组"}
	orphan := models.Product{SKU: "MOLDTEST-02", Name: "仅历史产品有的分组", TypeID: typeID, MoldGroup: "历史产品独立分组"}
	require.NoError(t, database.Omit("EngineeringSpecID").Create(&shared).Error)
	require.NoError(t, database.Omit("EngineeringSpecID").Create(&orphan).Error)
	require.NoError(t, database.Delete(&mold).Error)
	require.NoError(t, db.BackfillMoldGroupMasterIdentities(database))
	require.NoError(t, db.BackfillMoldGroupMasterIdentities(database))
	var groups []models.MoldGroup
	require.NoError(t, database.Order("name").Find(&groups).Error)
	require.Len(t, groups, 2)
	var migratedMold models.Mold
	var migratedShared, migratedOrphan models.Product
	require.NoError(t, database.Unscoped().First(&migratedMold, "id = ?", mold.ID).Error)
	require.NoError(t, database.First(&migratedShared, "id = ?", shared.ID).Error)
	require.NoError(t, database.First(&migratedOrphan, "id = ?", orphan.ID).Error)
	require.Equal(t, services.MoldGroupIDString(migratedMold.GroupID), services.MoldGroupIDString(migratedShared.MoldGroupID))
	require.NotNil(t, migratedOrphan.MoldGroupID)
	require.Equal(t, "共用分组", migratedMold.GroupName)
	require.Error(t, database.Exec("UPDATE products SET mold_group_id = ? WHERE id = ?", uuid.NewString(), shared.ID).Error)
	require.Error(t, database.Exec("DELETE FROM mold_groups WHERE id = ?", migratedShared.MoldGroupID).Error)
}

func TestMoldGroupMasterConcurrentDeleteAndMoldAssignmentCannotCreateDanglingReferences(t *testing.T) {
	database, _, _ := createMoldGroupMasterPostgresHTTPFixture(t)
	require.NoError(t, db.BackfillMoldGroupMasterIdentities(database))
	group, err := services.SaveMoldGroupMaster(context.Background(), database, "", services.MoldGroupMasterWriteRequest{Name: "并发引用保护"})
	require.NoError(t, err)
	var assignmentError, deletionError error
	start := make(chan struct{})
	var workers sync.WaitGroup
	workers.Add(2)
	go func() {
		defer workers.Done()
		<-start
		_, assignmentError = services.NewEquipmentAssetService(database).SaveMold(context.Background(), services.SaveMoldRequest{SN: "CONCURRENT-MOLD", Name: "并发绑定", GroupID: group.ID})
	}()
	go func() {
		defer workers.Done()
		<-start
		deletionError = services.DeleteUnreferencedMoldGroupMaster(context.Background(), database, group.ID, group.Version)
	}()
	close(start)
	workers.Wait()
	require.NotEqual(t, assignmentError == nil, deletionError == nil, "only assignment or deletion may succeed")
	var dangling int64
	require.NoError(t, database.Raw("SELECT COUNT(*) FROM molds m LEFT JOIN mold_groups g ON m.group_id = g.id WHERE m.group_id IS NOT NULL AND (g.id IS NULL OR g.deleted_at IS NOT NULL)").Scan(&dangling).Error)
	require.Zero(t, dangling)
}
