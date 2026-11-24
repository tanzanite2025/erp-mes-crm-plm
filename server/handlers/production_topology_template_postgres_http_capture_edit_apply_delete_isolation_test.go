package handlers

import (
	"encoding/json"
	"net/http"
	"testing"

	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestProductionTopologyTemplatePostgresHTTPCaptureEditApplyDeleteNeverWriteBackToActualStructure(t *testing.T) {
	database := createProductionPlanMBOMBranchHTTPPostgresDatabase(t)
	require.NoError(t, database.AutoMigrate(&models.ProductTemplate{}, &models.ProductionLine{}, &models.LineSegment{},
		&models.ProcessStep{}, &models.ProductionBOMBranchOperation{}, &models.ProductionBOMBranchOperationProcessLibrarySelection{},
		&models.SystemConfig{}, &models.ProductionTopologyTemplate{}))
	require.NoError(t, database.Exec(`CREATE TABLE audit_logs (id uuid PRIMARY KEY, module text, target_id text, action text, diff text, operator text, ip text, created_at timestamptz)`).Error)
	productID := uuid.NewString()
	require.NoError(t, database.Exec(`INSERT INTO products (id, sku, name, status) VALUES (?, 'TEMPLATE-HTTP', '模板测试产品', 'ACTIVE')`, productID).Error)
	require.NoError(t, database.Exec(`INSERT INTO boms (id, product_id, bom_type, status, owner_type, version_level)
		VALUES (?, ?, 'MBOM', 'RELEASED', 'INTERNAL', 'standard')`, uuid.NewString(), productID).Error)
	productTemplate := models.ProductTemplate{Code: "SNAPSHOT-HTTP", Name: "车圈", Active: true}
	require.NoError(t, database.Create(&productTemplate).Error)
	line := models.ProductionLine{Code: "SOURCE-HTTP", Name: productTemplate.Name, ProductTemplateID: &productTemplate.ID, Version: 1, IsActive: true}
	require.NoError(t, database.Create(&line).Error)
	segment := models.LineSegment{LineID: line.ID, Name: "实际分支", ProductID: productID, BOMOwnerType: "INTERNAL", BOMVersionLevel: "standard"}
	require.NoError(t, database.Create(&segment).Error)
	operation := models.ProductionBOMBranchOperation{ProductID: productID, BOMOwnerType: "INTERNAL", BOMVersionLevel: "standard", Name: "实际成型工序", IsActive: true}
	require.NoError(t, database.Create(&operation).Error)
	processLibrary := models.ProcessStep{Code: "TEMPLATE-HTTP-FORM", Name: operation.Name, IsActive: true}
	require.NoError(t, database.Create(&processLibrary).Error)
	require.NoError(t, database.Create(&models.ProductionBOMBranchOperationProcessLibrarySelection{
		ProductID: productID, BOMOwnerType: "INTERNAL", BOMVersionLevel: "standard",
		BranchOperationID: operation.ID, ProcessLibraryID: processLibrary.ID,
	}).Error)
	router := gin.New()
	router.GET("/templates", ListProductionTopologyTemplateSnapshotsHandler)
	router.POST("/templates/from-line", CaptureProductionTopologyTemplateFromLineHandler)
	router.PATCH("/templates/:id", SaveProductionTopologyTemplateSnapshotHandler)
	router.POST("/templates/:id/apply", ApplyProductionTopologyTemplateToNewLineHandler)
	router.DELETE("/templates/:id", DeleteProductionTopologyTemplateSnapshotHandler)
	response := sendProductionLineOwnershipHTTPJSONRequest(t, router, http.MethodPost, "/templates/from-line", services.CaptureProductionTopologyTemplateFromLineRequest{
		SourceLineID: line.ID, SourceLineVersion: line.Version, Name: "独立快照模板"})
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var template services.ProductionTopologyTemplateDTO
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &template))
	require.NotContains(t, response.Body.String(), line.ID)
	require.NotContains(t, response.Body.String(), segment.ID)
	require.NotContains(t, response.Body.String(), operation.ID)
	saveRequest := services.SaveProductionTopologyTemplateSnapshotRequest{Name: "仅改模板", Version: template.Version, Snapshot: template.Snapshot}
	saveRequest.Snapshot.LineDescription = "新建时的说明"
	originalBranch := template.Snapshot.Branches[0]
	saveRequest.Snapshot.Branches[0].Name = "客户端伪造名称"
	saveRequest.Snapshot.Branches[0].ProductSKU = "FORGED-SKU"
	saveRequest.Snapshot.Branches[0].OperationReferences = []services.ProductionTopologyTemplateOperationReferenceSnapshot{{Name: "客户端伪造工序"}}
	response = sendProductionLineOwnershipHTTPJSONRequest(t, router, http.MethodPatch, "/templates/"+template.ID, saveRequest)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &template))
	require.EqualValues(t, 2, template.Version)
	require.Equal(t, originalBranch.Name, template.Snapshot.Branches[0].Name)
	require.Equal(t, originalBranch.ProductSKU, template.Snapshot.Branches[0].ProductSKU)
	require.Equal(t, originalBranch.OperationReferences, template.Snapshot.Branches[0].OperationReferences)
	invalidBranchRequest := services.SaveProductionTopologyTemplateSnapshotRequest{Name: template.Name, Version: template.Version, Snapshot: template.Snapshot}
	invalidBranchRequest.Snapshot.Branches = append([]services.ProductionTopologyTemplateBranchSnapshot{}, template.Snapshot.Branches...)
	invalidBranchRequest.Snapshot.Branches = append(invalidBranchRequest.Snapshot.Branches, services.ProductionTopologyTemplateBranchSnapshot{
		ProductID: productID, BOMOwnerType: "INTERNAL", BOMVersionLevel: "missing"})
	response = sendProductionLineOwnershipHTTPJSONRequest(t, router, http.MethodPatch, "/templates/"+template.ID, invalidBranchRequest)
	require.Equal(t, http.StatusBadRequest, response.Code, response.Body.String())
	require.Contains(t, response.Body.String(), "新增分支必须为当前有效生产 MBOM 分支")
	var unchangedTemplate models.ProductionTopologyTemplate
	require.NoError(t, database.First(&unchangedTemplate, "id = ?", template.ID).Error)
	require.Equal(t, template.Version, unchangedTemplate.Version)
	var templateAuditCount int64
	require.NoError(t, database.Table("audit_logs").Where("module = ?", "production-topology-template").Count(&templateAuditCount).Error)
	require.EqualValues(t, 2, templateAuditCount)
	response = sendProductionLineOwnershipHTTPJSONRequest(t, router, http.MethodPatch, "/templates/"+template.ID, saveRequest)
	require.Equal(t, http.StatusConflict, response.Code, response.Body.String())
	response = sendProductionLineOwnershipHTTPJSONRequest(t, router, http.MethodPost, "/templates/"+template.ID+"/apply", services.ApplyProductionTopologyTemplateToNewLineRequest{Version: 1, Code: "STALE-HTTP"})
	require.Equal(t, http.StatusConflict, response.Code, response.Body.String())
	response = sendProductionLineOwnershipHTTPJSONRequest(t, router, http.MethodPost, "/templates/"+template.ID+"/apply", services.ApplyProductionTopologyTemplateToNewLineRequest{Version: template.Version, Code: " new- ht\ttp "})
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var applied services.ProductionLineDTO
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &applied))
	require.Equal(t, "NEW-HTTP", applied.Code)
	require.NotEqual(t, line.ID, applied.ID)
	require.NotEqual(t, segment.ID, applied.Segments[0].ID)
	require.Equal(t, operation.ID, applied.Segments[0].BranchOperations[0].ID)
	require.Equal(t, "新建时的说明", applied.Description)
	response = sendProductionLineOwnershipHTTPJSONRequest(t, router, http.MethodPost, "/templates/"+template.ID+"/apply", services.ApplyProductionTopologyTemplateToNewLineRequest{Version: template.Version, Code: "\uFEFFnew-\u3000http "})
	require.Equal(t, http.StatusConflict, response.Code, response.Body.String())
	response = sendProductionLineOwnershipHTTPJSONRequest(t, router, http.MethodDelete, "/templates/"+template.ID, map[string]any{"version": template.Version - 1})
	require.Equal(t, http.StatusConflict, response.Code, response.Body.String())
	response = sendProductionLineOwnershipHTTPJSONRequest(t, router, http.MethodDelete, "/templates/"+template.ID, map[string]any{"version": template.Version})
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	response = sendProductionLineOwnershipHTTPJSONRequest(t, router, http.MethodPost, "/templates/"+template.ID+"/apply", services.ApplyProductionTopologyTemplateToNewLineRequest{Version: template.Version, Code: "DELETED-TEMPLATE"})
	require.Equal(t, http.StatusNotFound, response.Code, response.Body.String())
	response = sendProductionLineOwnershipHTTPJSONRequest(t, router, http.MethodGet, "/templates", nil)
	require.Equal(t, http.StatusOK, response.Code)
	require.JSONEq(t, `{"items":[]}`, response.Body.String())
	for _, lineID := range []string{line.ID, applied.ID} {
		var persisted models.ProductionLine
		require.NoError(t, database.Preload("Segments").First(&persisted, "id = ?", lineID).Error)
		require.Len(t, persisted.Segments, 1)
		if lineID == line.ID {
			require.Empty(t, persisted.Description)
			require.EqualValues(t, 1, persisted.Version)
		}
	}
	var operationCount int64
	require.NoError(t, database.Model(&models.ProductionBOMBranchOperation{}).Count(&operationCount).Error)
	require.EqualValues(t, 1, operationCount)
}
