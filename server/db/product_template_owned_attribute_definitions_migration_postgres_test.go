package db

import (
	"os"
	"strings"
	"testing"
	"xdfc-server/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func createIsolatedTemplateOwnedAttributeMigrationDatabase(t *testing.T) *gorm.DB {
	t.Helper()
	dsn := os.Getenv("PRODUCT_ATTRIBUTE_CATALOG_TEST_POSTGRES_DSN")
	if dsn == "" {
		t.Skip("set PRODUCT_ATTRIBUTE_CATALOG_TEST_POSTGRES_DSN for isolated PostgreSQL migration checks")
	}
	admin, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	adminConnection, err := admin.DB()
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, adminConnection.Close()) })
	schema := "template_owned_attributes_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	require.NoError(t, admin.Exec("CREATE SCHEMA "+schema).Error)
	t.Cleanup(func() { require.NoError(t, admin.Exec("DROP SCHEMA "+schema+" CASCADE").Error) })
	config, err := pgx.ParseConfig(dsn)
	require.NoError(t, err)
	config.RuntimeParams["search_path"] = schema
	config.RuntimeParams["statement_timeout"] = "10000"
	connection := stdlib.OpenDB(*config)
	t.Cleanup(func() { require.NoError(t, connection.Close()) })
	database, err := gorm.Open(postgres.New(postgres.Config{Conn: connection}), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	require.NoError(t, database.AutoMigrate(&models.ProductAttributeCategory{}, &models.ProductAttributeOption{}, &models.ProductTemplateAttributeBinding{}, &models.ProductAttributeValue{}))
	return database
}

func TestTemplateOwnedAttributeMigrationCopiesIndependentDefinitionsAndPreservesProductValues(t *testing.T) {
	database := createIsolatedTemplateOwnedAttributeMigrationDatabase(t)
	category := models.ProductAttributeCategory{Key: "brakeType", NameZh: "制动类型", NameEn: "Brake Type", Active: true}
	require.NoError(t, database.Create(&category).Error)
	option := models.ProductAttributeOption{CategoryKey: category.Key, Value: "disc", LabelZh: "碟刹", LabelEn: "Disc", Active: true}
	require.NoError(t, database.Create(&option).Error)
	bindings := []models.ProductTemplateAttributeBinding{
		{TemplateID: uuid.NewString(), CategoryKey: category.Key, Active: true, Required: true},
		{TemplateID: uuid.NewString(), CategoryKey: category.Key, Active: true},
	}
	require.NoError(t, database.Create(&bindings).Error)
	value := models.ProductAttributeValue{ProductID: uuid.NewString(), CategoryKey: category.Key, OptionValue: option.Value}
	require.NoError(t, database.Create(&value).Error)
	require.NoError(t, MigrateProductTemplateOwnedAttributeDefinitions(database))
	var first, second models.ProductTemplateAttributeBinding
	require.NoError(t, database.First(&first, "id = ?", bindings[0].ID).Error)
	require.NoError(t, database.First(&second, "id = ?", bindings[1].ID).Error)
	require.Equal(t, "制动类型", first.NameZh)
	require.True(t, first.Required)
	require.Len(t, first.Options, 1)
	require.Equal(t, "碟刹", first.Options[0].LabelZh)
	first.Options[0].LabelZh = "车圈独立碟刹"
	require.NoError(t, database.Model(&first).Select("Options").Updates(&first).Error)
	require.NoError(t, database.First(&second, "id = ?", second.ID).Error)
	require.Equal(t, "碟刹", second.Options[0].LabelZh)
	require.NoError(t, database.Model(&category).Update("name_zh", "公共目录已修改").Error)
	require.NoError(t, MigrateProductTemplateOwnedAttributeDefinitions(database))
	var reloaded models.ProductTemplateAttributeBinding
	require.NoError(t, database.First(&reloaded, "id = ?", first.ID).Error)
	require.Equal(t, "制动类型", reloaded.NameZh)
	require.Equal(t, "车圈独立碟刹", reloaded.Options[0].LabelZh)
	var savedValue models.ProductAttributeValue
	require.NoError(t, database.First(&savedValue, "id = ?", value.ID).Error)
	require.Equal(t, value.CategoryKey, savedValue.CategoryKey)
	require.Equal(t, value.OptionValue, savedValue.OptionValue)
}

func TestTemplateOwnedAttributeMigrationRollsBackWhenAnyDefinitionIsMissing(t *testing.T) {
	database := createIsolatedTemplateOwnedAttributeMigrationDatabase(t)
	category := models.ProductAttributeCategory{Key: "color", NameZh: "颜色", Active: true}
	require.NoError(t, database.Create(&category).Error)
	bindings := []models.ProductTemplateAttributeBinding{
		{BaseModel: models.BaseModel{ID: "00000000-0000-0000-0000-000000000001"}, TemplateID: uuid.NewString(), CategoryKey: "color"},
		{BaseModel: models.BaseModel{ID: "00000000-0000-0000-0000-000000000002"}, TemplateID: uuid.NewString(), CategoryKey: "missing"},
	}
	require.NoError(t, database.Create(&bindings).Error)
	require.ErrorContains(t, MigrateProductTemplateOwnedAttributeDefinitions(database), "migration rolled back")
	var migratedCount int64
	require.NoError(t, database.Model(&models.ProductTemplateAttributeBinding{}).Where("definition_version = 1").Count(&migratedCount).Error)
	require.Zero(t, migratedCount)
}

func TestTemplateOwnedAttributeMigrationPreservesPreviouslyUnboundProductAttributes(t *testing.T) {
	database := createIsolatedTemplateOwnedAttributeMigrationDatabase(t)
	require.NoError(t, database.AutoMigrate(&models.ProductTemplate{}, &models.ProductType{}, &models.Product{}))
	template := models.ProductTemplate{Name: "车圈", Code: "rim", Active: true}
	require.NoError(t, database.Create(&template).Error)
	parent := models.ProductType{Name: "车圈", Code: "rim", TemplateID: &template.ID}
	require.NoError(t, database.Create(&parent).Error)
	child := models.ProductType{Name: "R50", Code: "r50", ParentID: &parent.ID}
	require.NoError(t, database.Create(&child).Error)
	category := models.ProductAttributeCategory{Key: "brakeType", NameZh: "制动类型", Active: true}
	require.NoError(t, database.Create(&category).Error)
	option := models.ProductAttributeOption{CategoryKey: category.Key, Value: "disc", LabelZh: "碟刹", Active: true}
	require.NoError(t, database.Create(&option).Error)
	product := models.Product{SKU: "R50-01", Name: "R50", TypeID: child.ID, BrakeType: "disc"}
	require.NoError(t, database.Omit("AttributeValues", "EngineeringSpecID").Create(&product).Error)
	require.NoError(t, MigrateProductTemplateOwnedAttributeDefinitions(database))
	var definitions []models.ProductTemplateAttributeBinding
	require.NoError(t, database.Where("template_id = ?", template.ID).Find(&definitions).Error)
	require.Len(t, definitions, 1)
	require.Equal(t, "制动类型", definitions[0].NameZh)
	require.Equal(t, "碟刹", definitions[0].Options[0].LabelZh)
	require.NoError(t, MigrateProductTemplateOwnedAttributeDefinitions(database))
	require.NoError(t, database.Where("template_id = ?", template.ID).Find(&definitions).Error)
	require.Len(t, definitions, 1)
}
