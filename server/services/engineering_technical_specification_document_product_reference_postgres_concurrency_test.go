package services

import (
	"context"
	"encoding/json"
	"sync"
	"testing"
	"time"
	"xdfc-server/models"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func createTechnicalSpecificationDocumentReferencePostgresFixture(t *testing.T) (*gorm.DB, string, models.EngineeringSpec) {
	t.Helper()
	database, applicationName := createIsolatedProductAttributeCatalogReferenceConcurrencyFixture(t)
	require.NoError(t, database.AutoMigrate(&models.EngineeringSpec{}, &models.AuditLog{}))
	require.NoError(t, database.Exec("ALTER TABLE products ADD COLUMN engineering_spec_id uuid").Error)
	require.NoError(t, database.Exec("ALTER TABLE boms ADD COLUMN description text").Error)
	specification, err := SaveEngineeringSpec(context.Background(), models.EngineeringSpec{Type: "TECH_SPEC", Name: "工艺文档", Active: true})
	require.NoError(t, err)
	return database, applicationName, specification
}

func TestProductEngineeringTechnicalSpecificationReferenceCommittedProductPreventsConcurrentDocumentDeletion(t *testing.T) {
	database, applicationName, specification := createTechnicalSpecificationDocumentReferencePostgresFixture(t)
	writerReady := make(chan struct{})
	allowWriterCommit := make(chan struct{})
	var releaseWriter sync.Once
	defer releaseWriter.Do(func() { close(allowWriterCommit) })
	writerResult := make(chan error, 1)
	go func() {
		writerResult <- database.Transaction(func(tx *gorm.DB) error {
			err := validateAndLockProductEngineeringTechnicalSpecificationReference(tx, specification.ID)
			if err == nil {
				err = tx.Exec("INSERT INTO products (engineering_spec_id) VALUES (?)", specification.ID).Error
			}
			close(writerReady)
			if err != nil {
				return err
			}
			<-allowWriterCommit
			return nil
		})
	}()
	select {
	case <-writerReady:
	case <-time.After(3 * time.Second):
		t.Fatal("product reference transaction did not start")
	}
	deleteResult := make(chan error, 1)
	go func() { deleteResult <- DeleteEngineeringSpec(context.Background(), specification.ID) }()
	waitForProductAttributeCatalogTransactionLock(t, database, applicationName)
	releaseWriter.Do(func() { close(allowWriterCommit) })
	require.NoError(t, receiveProductAttributeCatalogTransactionResult(t, writerResult))
	require.ErrorIs(t, receiveProductAttributeCatalogTransactionResult(t, deleteResult), ErrEngineeringSpecLinkedProducts)
	require.NoError(t, database.First(&models.EngineeringSpec{}, "id = ?", specification.ID).Error)
}

func TestProductEngineeringTechnicalSpecificationReferenceCommittedDocumentDeletionRejectsConcurrentProductReference(t *testing.T) {
	database, applicationName, specification := createTechnicalSpecificationDocumentReferencePostgresFixture(t)
	deletionReady := make(chan struct{})
	allowDeletionCommit := make(chan struct{})
	var releaseDeletion sync.Once
	defer releaseDeletion.Do(func() { close(allowDeletionCommit) })
	var pauseDeletion sync.Once
	const callbackName = "technical_specification_document_pause_delete_for_reference_test"
	require.NoError(t, database.Callback().Delete().Before("gorm:delete").Register(callbackName, func(tx *gorm.DB) {
		if tx.Statement.Table == "engineering_specs" {
			pauseDeletion.Do(func() { close(deletionReady); <-allowDeletionCommit })
		}
	}))
	t.Cleanup(func() { require.NoError(t, database.Callback().Delete().Remove(callbackName)) })
	deleteResult := make(chan error, 1)
	go func() { deleteResult <- DeleteEngineeringSpec(context.Background(), specification.ID) }()
	select {
	case <-deletionReady:
	case <-time.After(3 * time.Second):
		t.Fatal("document deletion did not reach its locked write")
	}
	writerResult := make(chan error, 1)
	go func() {
		writerResult <- database.Transaction(func(tx *gorm.DB) error {
			if err := validateAndLockProductEngineeringTechnicalSpecificationReference(tx, specification.ID); err != nil {
				return err
			}
			return tx.Exec("INSERT INTO products (engineering_spec_id) VALUES (?)", specification.ID).Error
		})
	}()
	waitForProductAttributeCatalogTransactionLock(t, database, applicationName)
	releaseDeletion.Do(func() { close(allowDeletionCommit) })
	require.NoError(t, receiveProductAttributeCatalogTransactionResult(t, deleteResult))
	require.ErrorContains(t, receiveProductAttributeCatalogTransactionResult(t, writerResult), "不存在或已删除")
	var productCount int64
	require.NoError(t, database.Table("products").Count(&productCount).Error)
	require.Zero(t, productCount)
}

func TestProductEngineeringTechnicalSpecificationReferenceRejectsWrongTypeAndUnknownDocument(t *testing.T) {
	database, _, specification := createTechnicalSpecificationDocumentReferencePostgresFixture(t)
	wrongType := models.EngineeringSpec{Type: "LABELING_DRAFT", Code: "OTHER", Name: "非规范数据", Version: 1}
	require.NoError(t, database.Create(&wrongType).Error)
	for _, testCase := range []struct {
		id        string
		errorText string
	}{
		{"", ""}, {specification.ID, ""}, {"invalid-id", "标识无效"}, {uuid.NewString(), "不存在或已删除"}, {wrongType.ID, "只能选择"},
	} {
		err := database.Transaction(func(tx *gorm.DB) error {
			return validateAndLockProductEngineeringTechnicalSpecificationReference(tx, testCase.id)
		})
		if testCase.errorText == "" {
			require.NoError(t, err)
		} else {
			require.ErrorContains(t, err, testCase.errorText)
		}
	}
}

func TestTechnicalSpecificationDocumentConcurrentPatchRejectsStaleWriterAndAuditsOnce(t *testing.T) {
	database, _, specification := createTechnicalSpecificationDocumentReferencePostgresFixture(t)
	start := make(chan struct{})
	results := make(chan error, 2)
	for _, name := range []string{"修改一", "修改二"} {
		go func(name string) {
			<-start
			rawName, _ := json.Marshal(name)
			_, err := PatchEngineeringSpec(context.Background(), PatchEngineeringSpecRequest{ID: specification.ID, ExpectedVersion: 1, Values: map[string]json.RawMessage{"name": rawName}})
			results <- err
		}(name)
	}
	close(start)
	first := receiveProductAttributeCatalogTransactionResult(t, results)
	second := receiveProductAttributeCatalogTransactionResult(t, results)
	if first == nil {
		require.ErrorIs(t, second, ErrEngineeringSpecPatchVersionConflict)
	} else {
		require.ErrorIs(t, first, ErrEngineeringSpecPatchVersionConflict)
		require.NoError(t, second)
	}
	var updated models.EngineeringSpec
	require.NoError(t, database.First(&updated, "id = ?", specification.ID).Error)
	require.Equal(t, 2, updated.Version)
	var auditCount int64
	require.NoError(t, database.Model(&models.AuditLog{}).Where("target_id = ?", specification.ID).Count(&auditCount).Error)
	require.EqualValues(t, 2, auditCount)
}
