package logistics

import (
	"bytes"
	"log"
	"strings"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupSandboxLogisticsTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	testDB, err := gorm.Open(sqlite.Open("file:sandbox-logistics-test?mode=memory&cache=shared"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, testDB.AutoMigrate(&DeliveryOrder{}, &LogisticsProvider{}))

	t.Cleanup(func() {
		sqlDB, dbErr := testDB.DB()
		if dbErr == nil {
			_ = sqlDB.Close()
		}
	})

	return testDB
}

func TestPollAndCompensateUsesTrustedTargetInsteadOfProviderEndpoint(t *testing.T) {
	db := setupSandboxLogisticsTestDB(t)
	task := NewCompensationTask(db, DefaultCompensationConfig())

	require.NoError(t, db.Create(&LogisticsProvider{
		Name:      "顺丰速运",
		Code:      "SF",
		Endpoint:  "http://127.0.0.1:5432/internal-only",
		Status:    "Enabled",
		QuotaUsed: 0,
	}).Error)

	var buf bytes.Buffer
	previousWriter := log.Writer()
	log.SetOutput(&buf)
	defer log.SetOutput(previousWriter)

	err := task.pollAndCompensate(DeliveryOrder{CarrierCode: "SF", TrackingNo: "SF123456789"})
	require.NoError(t, err)

	output := buf.String()
	require.Contains(t, output, "trusted_target: https://bspgw.sf-express.com/std/service")
	require.NotContains(t, output, "127.0.0.1:5432")

	var provider LogisticsProvider
	require.NoError(t, db.Where("code = ?", "SF").First(&provider).Error)
	require.Equal(t, 1, provider.QuotaUsed)
}

func TestPollAndCompensateFallsBackToManualReviewForUnsupportedProvider(t *testing.T) {
	db := setupSandboxLogisticsTestDB(t)
	task := NewCompensationTask(db, DefaultCompensationConfig())

	require.NoError(t, db.Create(&LogisticsProvider{
		Name:      "自定义物流",
		Code:      "CUSTOM",
		Endpoint:  "http://169.254.169.254/latest/meta-data/",
		Status:    "Enabled",
		QuotaUsed: 0,
	}).Error)

	var buf bytes.Buffer
	previousWriter := log.Writer()
	log.SetOutput(&buf)
	defer log.SetOutput(previousWriter)

	err := task.pollAndCompensate(DeliveryOrder{CarrierCode: "CUSTOM", TrackingNo: "CUSTOM123"})
	require.NoError(t, err)

	output := buf.String()
	require.Contains(t, output, "requires manual review")
	require.NotContains(t, output, "169.254.169.254")

	var provider LogisticsProvider
	require.NoError(t, db.Where("code = ?", "CUSTOM").First(&provider).Error)
	require.Equal(t, 0, provider.QuotaUsed)
}

func TestRunCompensationUsesStaleOrderFlow(t *testing.T) {
	db := setupSandboxLogisticsTestDB(t)
	task := NewCompensationTask(db, DefaultCompensationConfig())

	require.NoError(t, db.Create(&LogisticsProvider{
		Name:      "京东物流",
		Code:      "JD",
		Status:    "Enabled",
		QuotaUsed: 0,
	}).Error)

	staleAt := time.Now().Add(-24 * time.Hour)
	require.NoError(t, db.Create(&DeliveryOrder{
		CarrierCode: "JD",
		TrackingNo:  "JD123456789",
		Status:      StatusInTransit,
		LastPushAt:  &staleAt,
	}).Error)

	var buf bytes.Buffer
	previousWriter := log.Writer()
	log.SetOutput(&buf)
	defer log.SetOutput(previousWriter)

	task.Run()

	output := buf.String()
	require.True(t, strings.Contains(output, "trusted_target: https://api.jd.com/routerjson") || strings.Contains(output, "Compensation complete"))
}
