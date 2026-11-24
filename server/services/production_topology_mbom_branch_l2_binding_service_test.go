package services

import (
	"testing"
	"xdfc-server/models"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func seedProductionTopologyBOMBranchForTest(
	t *testing.T,
	database productionTopologyL1TemplateTestTransactionManager,
	productID string,
	productSKU string,
	productName string,
	bomID string,
	ownerType string,
	ownerCustomerID string,
	versionLevel string,
	status string,
	effectiveTo any,
) {
	t.Helper()
	require.NoError(t, database.DB().Exec(
		"INSERT INTO products (id, sku, name, status) VALUES (?, ?, ?, ?)",
		productID,
		productSKU,
		productName,
		"ACTIVE",
	).Error)
	require.NoError(t, database.DB().Exec(
		`INSERT INTO boms (
			id, product_id, bom_type, status, owner_type, owner_customer_id,
			version_level, effective_to
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		bomID,
		productID,
		models.BOMTypeMBOM,
		status,
		ownerType,
		ownerCustomerID,
		versionLevel,
		effectiveTo,
	).Error)
}

func productionTopologyLineWithBOMBranch(
	templateID string,
	code string,
	segmentID string,
	productID string,
	ownerType string,
	ownerCustomerID string,
	versionLevel string,
) ProductionLineDTO {
	return ProductionLineDTO{
		ID:                "temp-production-line-" + code,
		Code:              code,
		Name:              "客户端填写名称",
		ProductTemplateID: templateID,
		Version:           1,
		IsActive:          true,
		Segments: []LineSegmentDTO{{
			ID:                   segmentID,
			Name:                 "客户端填写型号",
			ProductID:            productID,
			ProductSKU:           "FORGED-SKU",
			ProductName:          "伪造产品名",
			BOMOwnerType:         ownerType,
			BOMOwnerCustomerID:   ownerCustomerID,
			BOMOwnerCustomerName: "伪造客户",
			BOMVersionLevel:      versionLevel,
			SortOrder:            0,
		}},
	}
}

func insertProductionTopologyProductTemplateForTest(
	t *testing.T,
	database productionTopologyL1TemplateTestTransactionManager,
	template models.ProductTemplate,
) {
	t.Helper()
	require.NoError(t, database.DB().Exec(
		"INSERT INTO product_templates (id, name, code, active) VALUES (?, ?, ?, ?)",
		template.ID,
		template.Name,
		template.Code,
		template.Active,
	).Error)
}

func TestSaveProductionLineL2BindsCurrentMBOMWithoutFilteringByL1ProductTemplate(t *testing.T) {
	service, database := newProductionTopologyL1TemplateTestService(t)
	template := models.ProductTemplate{
		BaseModel: models.BaseModel{ID: uuid.NewString()},
		Name:      "车圈模板",
		Code:      "rim-template-l2-test",
		Active:    true,
	}

	manager := productionTopologyL1TemplateTestTransactionManager{database: database}
	insertProductionTopologyProductTemplateForTest(t, manager, template)
	seedProductionTopologyBOMBranchForTest(
		t,
		manager,
		"product-under-another-template",
		"RIM-24",
		"24 寸车圈",
		"released-rim-branch",
		"INTERNAL",
		"",
		"lightweight",
		models.BOMStatusReleased,
		nil,
	)

	branches, err := service.ListProductionLineBOMBranches()
	require.NoError(t, err)
	require.Len(t, branches, 1)
	require.Equal(t, "product-under-another-template", branches[0].ProductID)

	saved, err := service.SaveProductionLine(SaveProductionLineRequest{
		Line: productionTopologyLineWithBOMBranch(
			template.ID,
			"rim-line-l2-bound",
			uuid.NewString(),
			branches[0].ProductID,
			branches[0].BOMOwnerType,
			branches[0].BOMOwnerCustomerID,
			branches[0].BOMVersionLevel,
		),
		Operator: "production-test",
	})
	require.NoError(t, err)
	require.Len(t, saved.Segments, 1)
	require.Equal(t, branches[0].ProductID, saved.Segments[0].ProductID)
	require.Equal(t, "RIM-24", saved.Segments[0].ProductSKU)
	require.Equal(t, "24 寸车圈", saved.Segments[0].ProductName)
	require.Equal(t, "lightweight", saved.Segments[0].BOMVersionLevel)
	require.Equal(t, "RIM-24 · 24 寸车圈 · lightweight · 内部", saved.Segments[0].Name)
	require.NotContains(t, saved.Segments[0].Name, "FORGED")
}

func TestSaveProductionLineL2RejectsUnreleasedAndExpiredMBOMBranches(t *testing.T) {
	service, database := newProductionTopologyL1TemplateTestService(t)
	template := models.ProductTemplate{
		BaseModel: models.BaseModel{ID: uuid.NewString()},
		Name:      "模板",
		Code:      "rim-template-invalid-l2-test",
		Active:    true,
	}
	manager := productionTopologyL1TemplateTestTransactionManager{database: database}
	insertProductionTopologyProductTemplateForTest(t, manager, template)

	seedProductionTopologyBOMBranchForTest(
		t, manager, "draft-product", "DRAFT-1", "草稿产品", "draft-mbom",
		"INTERNAL", "", "std", models.BOMStatusDraft, nil,
	)
	seedProductionTopologyBOMBranchForTest(
		t, manager, "expired-product", "EXPIRED-1", "过期产品", "expired-mbom",
		"INTERNAL", "", "std", models.BOMStatusReleased, "2000-01-01 00:00:00",
	)

	for _, testCase := range []struct {
		name      string
		productID string
		version   string
	}{
		{name: "draft branch", productID: "draft-product", version: "std"},
		{name: "expired branch", productID: "expired-product", version: "std"},
	} {
		t.Run(testCase.name, func(t *testing.T) {
			_, err := service.SaveProductionLine(SaveProductionLineRequest{
				Line: productionTopologyLineWithBOMBranch(
					template.ID,
					"invalid-"+uuid.NewString(),
					uuid.NewString(),
					testCase.productID,
					"INTERNAL",
					"",
					testCase.version,
				),
			})
			require.ErrorIs(t, err, ErrInvalidProductionLineBOMBranch)
		})
	}
}

func TestSaveProductionLineRejectsUnboundL2(t *testing.T) {
	service, database := newProductionTopologyL1TemplateTestService(t)
	template := models.ProductTemplate{
		BaseModel: models.BaseModel{ID: uuid.NewString()},
		Name:      "模板",
		Code:      "rim-template-unbound-l2-test",
		Active:    true,
	}
	manager := productionTopologyL1TemplateTestTransactionManager{database: database}
	insertProductionTopologyProductTemplateForTest(t, manager, template)

	_, err := service.SaveProductionLine(SaveProductionLineRequest{
		Line: ProductionLineDTO{
			ID:                "temp-unbound-l2-line",
			Code:              "unbound-l2-line",
			Name:              "产线",
			ProductTemplateID: template.ID,
			Version:           1,
			IsActive:          true,
			Segments:          []LineSegmentDTO{{ID: uuid.NewString(), Name: "未关联分支"}},
		},
		AuthCode: "622575",
	})
	require.ErrorIs(t, err, ErrInvalidProductionLineBOMBranch)
}

func TestSaveProductionLineRejectsAFormerlyBoundBranchWhenNoLongerCurrent(t *testing.T) {
	service, database := newProductionTopologyL1TemplateTestService(t)
	template := models.ProductTemplate{
		BaseModel: models.BaseModel{ID: uuid.NewString()},
		Name:      "模板",
		Code:      "rim-template-expired-l2-test",
		Active:    true,
	}
	manager := productionTopologyL1TemplateTestTransactionManager{database: database}
	insertProductionTopologyProductTemplateForTest(t, manager, template)
	seedProductionTopologyBOMBranchForTest(
		t, manager, "expired-after-save", "RIM-OLD", "旧型号", "expired-after-save-mbom",
		"INTERNAL", "", "std", models.BOMStatusReleased, nil,
	)

	created, err := service.SaveProductionLine(SaveProductionLineRequest{
		Line: productionTopologyLineWithBOMBranch(
			template.ID, "line-with-branch-that-expires", uuid.NewString(),
			"expired-after-save", "INTERNAL", "", "std",
		),
	})
	require.NoError(t, err)
	require.NoError(t, database.Exec(
		"UPDATE boms SET status = ? WHERE id = ?",
		models.BOMStatusDraft,
		"expired-after-save-mbom",
	).Error)

	_, err = service.SaveProductionLine(SaveProductionLineRequest{
		Line:     created,
		AuthCode: "622575",
	})
	require.ErrorIs(t, err, ErrInvalidProductionLineBOMBranch)
}
