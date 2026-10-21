package services

import (
	"context"
	"io"
	"net/http"
	"strings"
	"sync"
	"testing"
	"time"
	"xdfc-server/models"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func createIsolatedDeliveryTrackingObservationPostgresFixture(t *testing.T) (*gorm.DB, models.DeliveryOrder, models.LogisticsAPIProvider) {
	t.Helper()
	fixture := createIsolatedQualityStandardWorkflowPostgresFixture(t)
	require.NoError(t, fixture.database.AutoMigrate(&models.DeliveryOrder{}, &models.DeliveryTrackingDetail{}, &models.LogisticsAPIProvider{}))
	provider := models.LogisticsAPIProvider{Name: "Isolated carrier", Code: "17TRACK", Status: "Enabled"}
	require.NoError(t, fixture.database.Create(&provider).Error)
	order := models.DeliveryOrder{TrackingNo: uuid.NewString(), CarrierCode: provider.Code, BizType: "Sales", Status: "Pending", Version: 1}
	require.NoError(t, fixture.database.Create(&order).Error)
	return fixture.database, order, provider
}

func TestDeliveryTrackingPostgresUsesFactTimeDeduplicatesAndSerializesCallbackWithRefresh(t *testing.T) {
	database, order, provider := createIsolatedDeliveryTrackingObservationPostgresFixture(t)
	baseTime := time.Date(2026, 10, 20, 8, 0, 0, 123456000, time.UTC)
	observation := DeliveryOrderTrackingObservation{TrackingNo: order.TrackingNo, CarrierCode: order.CarrierCode, ReportedStatus: "Signed", ObservedAt: baseTime.Add(24 * time.Hour),
		Traces: []DeliveryTrackingTrace{{Time: baseTime.Add(2 * time.Hour), Context: "已签收", Location: "recipient"}, {Time: baseTime, Context: "运输中", Location: "origin"}}}
	inserted, err := PersistDeliveryOrderTrackingObservation(context.Background(), observation)
	require.NoError(t, err)
	require.Equal(t, 2, inserted)
	require.NoError(t, database.First(&order, order.ID).Error)
	require.Equal(t, "Signed", order.Status)
	require.Equal(t, "已签收", order.LastEvent)
	require.Equal(t, 2, order.Version)
	require.True(t, order.SignedAt.Equal(baseTime.Add(2*time.Hour)), "signing time comes from the carrier fact")
	require.True(t, order.LastEventAt.Equal(*order.SignedAt))

	// A stale pre-request copy is deliberately passed to the refresh adapter.
	staleOrder := order
	staleOrder.Status = "InTransit"
	staleOrder.Version = 1
	olderTraces := []DeliveryTrackingTrace{{Time: baseTime.Add(time.Hour), Context: "in transit", Location: "hub"}}
	var waitGroup sync.WaitGroup
	results := make(chan error, 8)
	for index := 0; index < 8; index++ {
		waitGroup.Add(1)
		go func(index int) {
			defer waitGroup.Done()
			if index%2 == 0 {
				_, callbackError := PersistDeliveryOrderTrackingObservation(context.Background(), observation)
				results <- callbackError
				return
			}
			_, refreshError := persistDeliveryTrackingRefresh(staleOrder, provider, olderTraces, baseTime.Add(25*time.Hour))
			results <- refreshError
		}(index)
	}
	waitGroup.Wait()
	close(results)
	for result := range results {
		require.NoError(t, result)
	}
	require.NoError(t, database.First(&order, order.ID).Error)
	require.Equal(t, "Signed", order.Status)
	require.Equal(t, "已签收", order.LastEvent)
	require.Equal(t, 3, order.Version, "only one additional historical trace was inserted")
	var count int64
	require.NoError(t, database.Model(&models.DeliveryTrackingDetail{}).Count(&count).Error)
	require.EqualValues(t, 3, count)
	require.NoError(t, database.First(&provider, provider.ID).Error)
	require.Equal(t, 4, provider.QuotaUsed)

	// The same instant in another timezone is the same fact.
	observation.Traces = []DeliveryTrackingTrace{{Time: baseTime.Add(2*time.Hour + 789*time.Nanosecond).In(time.FixedZone("UTC+8", 8*3600)), Context: "已签收", Location: "changed replay"}}
	observation.ReportedStatus = "InTransit"
	inserted, err = PersistDeliveryOrderTrackingObservation(context.Background(), observation)
	require.NoError(t, err)
	require.Zero(t, inserted)
	require.NoError(t, database.First(&order, order.ID).Error)
	require.Equal(t, "Signed", order.Status)
	require.Equal(t, "recipient", order.LastLocation)
	require.Equal(t, 3, order.Version)

	observation.Traces = []DeliveryTrackingTrace{{Time: baseTime.Add(3 * time.Hour), Context: "in transit"}}
	_, err = PersistDeliveryOrderTrackingObservation(context.Background(), observation)
	require.NoError(t, err)
	require.NoError(t, database.First(&order, order.ID).Error)
	require.Equal(t, "Signed", order.Status, "a later transit scan cannot undo a completed delivery")
	require.True(t, order.SignedAt.Equal(baseTime.Add(2*time.Hour)))
	observation.ReportedStatus = "Returned"
	observation.Traces = []DeliveryTrackingTrace{{Time: baseTime.Add(4 * time.Hour), Context: "returned to sender"}}
	_, err = PersistDeliveryOrderTrackingObservation(context.Background(), observation)
	require.NoError(t, err)
	require.NoError(t, database.First(&order, order.ID).Error)
	require.Equal(t, "Returned", order.Status)
}

func TestDeliveryTrackingPostgresRollsBackTraceProjectionAndQuotaTogether(t *testing.T) {
	for _, failureTarget := range []string{"delivery_orders", "logistics_api_providers"} {
		t.Run(failureTarget, func(t *testing.T) {
			database, order, provider := createIsolatedDeliveryTrackingObservationPostgresFixture(t)
			require.NoError(t, database.Exec(`CREATE FUNCTION reject_delivery_tracking_update() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'forced tracking failure'; END; $$ LANGUAGE plpgsql`).Error)
			require.NoError(t, database.Exec("CREATE TRIGGER reject_delivery_tracking_update BEFORE UPDATE ON "+failureTarget+" FOR EACH ROW EXECUTE FUNCTION reject_delivery_tracking_update()").Error)
			inserted, err := persistDeliveryTrackingRefresh(order, provider, []DeliveryTrackingTrace{{Time: time.Now().UTC(), Context: "delivered"}}, time.Now().UTC())
			require.Error(t, err)
			require.Zero(t, inserted)
			require.NoError(t, database.First(&order, order.ID).Error)
			require.Equal(t, "Pending", order.Status)
			require.Equal(t, 1, order.Version)
			require.Nil(t, order.LastPushAt)
			require.Nil(t, order.SignedAt)
			require.NoError(t, database.First(&provider, provider.ID).Error)
			require.Zero(t, provider.QuotaUsed)
			var count int64
			require.NoError(t, database.Model(&models.DeliveryTrackingDetail{}).Count(&count).Error)
			require.Zero(t, count)
		})
	}
}

func TestDeliveryTrackingStatusInferenceDoesNotTurnFailureOrWarehouseScansIntoSigned(t *testing.T) {
	for _, test := range []struct{ text, expected string }{
		{"undelivered", "Exception"}, {"not delivered to recipient", "Exception"}, {"未签收", "Exception"}, {"签收失败", "Exception"}, {"派送异常", "Exception"},
		{"待签收", "Delivering"}, {"out for delivery", "Delivering"}, {"received at facility", "InTransit"},
		{"delivered", "Signed"}, {"已签收", "Signed"}, {"delivered to recipient", "Signed"},
		{"returned to sender", "Returned"}, {"unknown provider message", "Collected"},
	} {
		t.Run(test.text, func(t *testing.T) {
			require.Equal(t, test.expected, deriveDeliveryTrackingStatus("Collected", test.text))
		})
	}
}

func TestDeliveryTrackingPostgresRejectsMissingFactTimeAndHonorsPersistedTraceWatermark(t *testing.T) {
	database, order, _ := createIsolatedDeliveryTrackingObservationPostgresFixture(t)
	now := time.Now().UTC().Truncate(time.Second)
	observation := DeliveryOrderTrackingObservation{TrackingNo: order.TrackingNo, CarrierCode: order.CarrierCode, ReportedStatus: "Signed", ObservedAt: now}
	_, err := PersistDeliveryOrderTrackingObservation(context.Background(), observation)
	require.ErrorIs(t, err, ErrInvalidDeliveryTrackingObservation)
	observation.ReportedStatus = "unsupported"
	observation.Traces = []DeliveryTrackingTrace{{Time: now, Context: "unsupported"}}
	_, err = PersistDeliveryOrderTrackingObservation(context.Background(), observation)
	require.ErrorIs(t, err, ErrInvalidDeliveryTrackingObservation)
	require.NoError(t, database.Model(&order).Updates(map[string]any{"status": "Delivering", "last_event": "out for delivery"}).Error)
	require.NoError(t, database.Create(&models.DeliveryTrackingDetail{DeliveryOrderID: order.ID, Time: now, Context: "out for delivery", HashKey: generateDeliveryTrackingHash(order.TrackingNo, now, "out for delivery")}).Error)
	observation.ReportedStatus = "InTransit"
	observation.Traces = []DeliveryTrackingTrace{{Time: now.Add(-time.Hour), Context: "in transit"}}
	_, err = PersistDeliveryOrderTrackingObservation(context.Background(), observation)
	require.NoError(t, err)
	require.NoError(t, database.First(&order, order.ID).Error)
	require.Equal(t, "Delivering", order.Status)
	require.Equal(t, "out for delivery", order.LastEvent)
}

type deliveryTrackingHTTPTransportFunction func(*http.Request) (*http.Response, error)

func (transport deliveryTrackingHTTPTransportFunction) RoundTrip(request *http.Request) (*http.Response, error) {
	return transport(request)
}

func TestDeliveryTrackingPostgresRealRefreshAdapterUsesSharedPersistenceWithoutExternalRequests(t *testing.T) {
	database, order, provider := createIsolatedDeliveryTrackingObservationPostgresFixture(t)
	require.NoError(t, database.Model(&provider).Update("app_key", "test-only-key").Error)
	previousFactory := logisticsTrackingHTTPClientFactory
	t.Cleanup(func() { logisticsTrackingHTTPClientFactory = previousFactory })
	requests := 0
	logisticsTrackingHTTPClientFactory = func() *http.Client {
		return &http.Client{Transport: deliveryTrackingHTTPTransportFunction(func(request *http.Request) (*http.Response, error) {
			requests++
			require.Equal(t, "test-only-key", request.Header.Get("17token"))
			responseBody := `{"code":0,"data":{"accepted":[{"carrier":100001}],"rejected":[]}}`
			if strings.HasSuffix(request.URL.Path, "/gettrackinfo") {
				responseBody = `{"code":0,"data":{"accepted":[{"track":{"z1":[{"a":"2026-10-20T09:00:00Z","z":"undelivered","c":"hub"},{"a":"2026-10-20T08:00:00Z","z":"in transit"}]}}],"rejected":[]}}`
			}
			return &http.Response{StatusCode: http.StatusOK, Header: http.Header{"Content-Type": []string{"application/json"}}, Body: io.NopCloser(strings.NewReader(responseBody))}, nil
		})}
	}
	result, err := RefreshDeliveryTracking(order.TrackingNo)
	require.NoError(t, err)
	require.Equal(t, "refreshed", result.Status)
	require.Equal(t, 2, result.InsertedTraces)
	require.NoError(t, database.First(&order, order.ID).Error)
	require.Equal(t, "Exception", order.Status)
	require.Nil(t, order.SignedAt)
	result, err = RefreshDeliveryTracking(order.TrackingNo)
	require.NoError(t, err)
	require.Zero(t, result.InsertedTraces)
	require.NoError(t, database.First(&order, order.ID).Error)
	require.Equal(t, 2, order.Version)
	require.NoError(t, database.First(&provider, provider.ID).Error)
	require.Equal(t, 2, provider.QuotaUsed)
	require.Equal(t, 4, requests)
}
