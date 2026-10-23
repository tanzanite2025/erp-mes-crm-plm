package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"testing"
	"xdfc-server/audit"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
)

func TestMoldMasterLibraryGroupSelectionReadsAllMoldsAndNewGroupProductAssociation(t *testing.T) {
	database, router := createIsolatedProductAttributeCatalogPostgresHTTPFixture(t)
	require.NoError(t, database.AutoMigrate(&models.Mold{}, &models.ProductTemplate{}, &models.ProductType{}, &models.Product{}, &models.AuditLog{}))
	router.GET("/molds", GetMoldsHandler)
	router.GET("/molds/group-names", GetMoldGroupNamesHandler)
	router.POST("/molds", SaveMoldHandler)
	router.GET("/molds/:id", GetMoldHandler)
	router.POST("/products", SaveProductHandler)
	router.GET("/products/:id", GetProductHandler)
	router.PATCH("/products/:id", PatchProductHandler)
	for index := 0; index < 61; index++ {
		mold := models.Mold{SN: fmt.Sprintf("SN-%03d", index), Name: "已有模具", GroupName: fmt.Sprintf("组-%03d", index), Status: "IDLE"}
		require.NoError(t, database.Create(&mold).Error)
	}
	response := submitProductAttributeCatalogHTTPRequest(t, router, http.MethodGet, "/molds?options=true", nil)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var options struct {
		Items []models.Mold `json:"items"`
	}
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &options))
	require.Len(t, options.Items, 61)
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPost, "/molds", map[string]any{
		"sn": "SN-NEW", "name": "新建分组的第一副模具", "groupName": "R50 新模具分组", "status": "IDLE",
		"maxCycles": 1000, "maintenanceThreshold": 800, "currentCycles": 0, "totalLifeCycles": 0,
	})
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var createdMold models.Mold
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &createdMold))
	require.NotEmpty(t, createdMold.ID)
	require.Equal(t, "R50 新模具分组", createdMold.GroupName)
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodGet, "/molds/group-names", nil)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var names []string
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &names))
	require.Len(t, names, 62)
	require.Contains(t, names, createdMold.GroupName)
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodGet, "/molds/"+createdMold.ID, nil)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())

	template := models.ProductTemplate{Name: "车圈物理规格模板", Code: "rim-mold-library", ComponentKey: "RIM", Active: true, Version: 1}
	require.NoError(t, database.Create(&template).Error)
	productType := models.ProductType{Name: "R50", Code: "R50", TemplateID: &template.ID, Active: true, Version: 1}
	require.NoError(t, database.Create(&productType).Error)
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPost, "/products", map[string]any{
		"name": "R50 碟刹", "typeId": productType.ID, "modelCode": "01", "status": "Active", "moldGroup": createdMold.GroupName,
	})
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var product ProductApiDTO
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &product))
	require.Equal(t, createdMold.GroupName, product.MoldGroup)
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodGet, "/products/"+product.ID, nil)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var persisted ProductApiDTO
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &persisted))
	require.Equal(t, createdMold.GroupName, persisted.MoldGroup)
	var moldAuditCount, productAuditCount int64
	require.NoError(t, database.Model(&models.AuditLog{}).Where("target_id = ?", createdMold.ID).Count(&moldAuditCount).Error)
	require.NoError(t, database.Model(&models.AuditLog{}).Where("target_id = ?", product.ID).Count(&productAuditCount).Error)
	require.EqualValues(t, 1, moldAuditCount)
	require.EqualValues(t, 1, productAuditCount)

	for _, groupName := range []string{"组-060", ""} {
		previousGroupName := product.MoldGroup
		response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPatch, "/products/"+product.ID,
			buildProductAttributeCatalogPatchRequest(product.ID, product.Version, map[string]any{
				"moldGroup": map[string]any{"o": product.MoldGroup, "n": groupName},
			}))
		require.Equal(t, http.StatusOK, response.Code, response.Body.String())
		var storedProduct models.Product
		require.NoError(t, database.First(&storedProduct, "id = ?", product.ID).Error)
		require.Equal(t, groupName, storedProduct.MoldGroup)
		var patchedProduct ProductApiDTO
		require.NoError(t, json.Unmarshal(response.Body.Bytes(), &patchedProduct))
		product = patchedProduct
		require.Equal(t, groupName, product.MoldGroup)
		response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodGet, "/products/"+product.ID, nil)
		require.Equal(t, http.StatusOK, response.Code, response.Body.String())
		persisted = ProductApiDTO{}
		require.NoError(t, json.Unmarshal(response.Body.Bytes(), &persisted))
		require.Equal(t, groupName, persisted.MoldGroup)
		var patchAudit models.AuditLog
		require.NoError(t, database.Where("target_id = ? AND action = ?", product.ID, "PATCH").Order("created_at desc").First(&patchAudit).Error)
		var changes []audit.DiffItem
		require.NoError(t, json.Unmarshal(patchAudit.Diff, &changes))
		require.Len(t, changes, 1)
		require.Equal(t, "moldGroup", changes[0].Field)
		require.Equal(t, previousGroupName, changes[0].Old)
		require.Equal(t, groupName, changes[0].New)
	}
	var savedMold models.Mold
	require.NoError(t, database.First(&savedMold, "id = ?", createdMold.ID).Error)
	require.Equal(t, createdMold.GroupName, savedMold.GroupName)
	require.NoError(t, database.Model(&models.AuditLog{}).Where("target_id = ?", product.ID).Count(&productAuditCount).Error)
	require.EqualValues(t, 3, productAuditCount)
}
