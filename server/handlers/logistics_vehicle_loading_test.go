package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestGetVehicleLoadingRecommendationsHandlerReturnsRecommendations(t *testing.T) {
	gin.SetMode(gin.TestMode)

	requestBody := services.VehicleLoadingRecommendationsRequest{
		Summary: services.VehicleLoadingSummaryPayload{
			Boxes:         18,
			TotalVolumeM3: 8.6,
			TotalWeightKg: 1200,
		},
		VehicleSpecs: []services.VehicleSpecResponse{
			{
				ID:                "van-standard",
				Category:          "van",
				Name:              "面包车 - 标准",
				PayloadKg:         700,
				VolumeM3:          2.9,
				NominalVolumeM3:   3.5,
				PhysicalInnerSize: services.VehicleSpecDimension{LengthMm: 2400, WidthMm: 1400, HeightMm: 1200},
				UsableInnerSize:   services.VehicleSpecDimension{LengthMm: 2200, WidthMm: 1320, HeightMm: 1000},
				SafetyAllowance:   services.VehicleSpecAllowance{TopClearanceMm: 200, SideClearanceMm: 80, RearClearanceMm: 120},
				LoadingConstraint: services.VehicleSpecConstraint{DoorWidthMm: 1180, DoorHeightMm: 980, WheelArchWidthMm: 120, WheelArchHeightMm: 180, HasCenterPillar: false},
				PhotoEntry:        services.VehiclePhotoEntryResponse{VehicleID: "van-standard", DisplayTitle: "面包车 - 标准", Tags: []string{"van"}, Images: []services.VehiclePhotoImageResponse{}},
				IsBoxBody:         false,
				Enabled:           true,
				Notes:             "适合城配短驳与轻货运输。",
			},
			{
				ID:                "box-truck-4m2",
				Category:          "boxTruck",
				Name:              "厢式货车 - 4.2 米",
				PayloadKg:         2000,
				VolumeM3:          10.6,
				NominalVolumeM3:   12,
				PhysicalInnerSize: services.VehicleSpecDimension{LengthMm: 4200, WidthMm: 1900, HeightMm: 1900},
				UsableInnerSize:   services.VehicleSpecDimension{LengthMm: 4050, WidthMm: 1820, HeightMm: 1440},
				SafetyAllowance:   services.VehicleSpecAllowance{TopClearanceMm: 460, SideClearanceMm: 80, RearClearanceMm: 150},
				LoadingConstraint: services.VehicleSpecConstraint{DoorWidthMm: 1760, DoorHeightMm: 1680, WheelArchWidthMm: 140, WheelArchHeightMm: 220, HasCenterPillar: false},
				PhotoEntry:        services.VehiclePhotoEntryResponse{VehicleID: "box-truck-4m2", DisplayTitle: "厢式货车 - 4.2 米", Tags: []string{"boxTruck"}, Images: []services.VehiclePhotoImageResponse{}},
				IsBoxBody:         true,
				Enabled:           true,
				Notes:             "适合作为日常配送的标准箱车。",
			},
		},
		Source:      "manual",
		SourceLabel: "手动试算",
		PackageInput: &services.VehicleLoadingPackageInputPayload{
			PackageID:    "pkg-explicit-1",
			Name:         "显式测试箱型",
			UnitWeightKg: 12.5,
			Dimension: services.VehiclePackageDimensionResponse{
				LengthMm:  700,
				WidthMm:   500,
				HeightMm:  600,
				CanRotate: true,
				CanInvert: false,
			},
		},
	}

	payload, err := json.Marshal(requestBody)
	require.NoError(t, err)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(http.MethodPost, "/api/v1/logistics/vehicle-loading/recommendations", bytes.NewReader(payload))
	request.Header.Set("Content-Type", "application/json")
	ctx.Request = request

	GetVehicleLoadingRecommendationsHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var response services.VehicleLoadingRecommendationsResponse
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.NotEmpty(t, response.EngineVersion)
	require.NotEmpty(t, response.GeneratedAt)
	require.NotEmpty(t, response.Recommendations)
	require.NotEmpty(t, response.Recommendations[0].Reason)
	require.NotEmpty(t, response.Recommendations[0].SelectedOrientationLabel)
	require.Equal(t, 700, response.Recommendations[0].PackageDimension.LengthMm)
	require.Equal(t, 500, response.Recommendations[0].PackageDimension.WidthMm)
	require.Equal(t, 600, response.Recommendations[0].PackageDimension.HeightMm)
}

func TestGetVehicleLoadingRecommendationsHandlerConsumesCanInvert(t *testing.T) {
	gin.SetMode(gin.TestMode)

	baseRequest := services.VehicleLoadingRecommendationsRequest{
		Summary: services.VehicleLoadingSummaryPayload{
			Boxes:         8,
			TotalVolumeM3: 3.2,
			TotalWeightKg: 320,
		},
		VehicleSpecs: []services.VehicleSpecResponse{
			{
				ID:                "tight-box-truck",
				Category:          "boxTruck",
				Name:              "紧凑厢车",
				PayloadKg:         1000,
				VolumeM3:          4,
				NominalVolumeM3:   4.5,
				PhysicalInnerSize: services.VehicleSpecDimension{LengthMm: 1300, WidthMm: 1000, HeightMm: 900},
				UsableInnerSize:   services.VehicleSpecDimension{LengthMm: 1200, WidthMm: 900, HeightMm: 800},
				SafetyAllowance:   services.VehicleSpecAllowance{TopClearanceMm: 100, SideClearanceMm: 40, RearClearanceMm: 50},
				LoadingConstraint: services.VehicleSpecConstraint{DoorWidthMm: 850, DoorHeightMm: 780, WheelArchWidthMm: 0, WheelArchHeightMm: 0, HasCenterPillar: false},
				PhotoEntry:        services.VehiclePhotoEntryResponse{VehicleID: "tight-box-truck", DisplayTitle: "紧凑厢车", Tags: []string{"boxTruck"}, Images: []services.VehiclePhotoImageResponse{}},
				IsBoxBody:         true,
				Enabled:           true,
				Notes:             "用于验证朝向切换。",
			},
		},
		Source:      "api",
		SourceLabel: "API 输入",
	}

	t.Run("without invert no feasible recommendation", func(t *testing.T) {
		requestBody := baseRequest
		requestBody.PackageInput = &services.VehicleLoadingPackageInputPayload{
			PackageID:    "pkg-no-invert",
			Name:         "不可倒置箱型",
			UnitWeightKg: 40,
			Dimension: services.VehiclePackageDimensionResponse{
				LengthMm:  900,
				WidthMm:   700,
				HeightMm:  1100,
				CanRotate: true,
				CanInvert: false,
			},
		}

		payload, err := json.Marshal(requestBody)
		require.NoError(t, err)

		recorder := httptest.NewRecorder()
		ctx, _ := gin.CreateTestContext(recorder)
		request := httptest.NewRequest(http.MethodPost, "/api/v1/logistics/vehicle-loading/recommendations", bytes.NewReader(payload))
		request.Header.Set("Content-Type", "application/json")
		ctx.Request = request

		GetVehicleLoadingRecommendationsHandler(ctx)

		require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())
		var response services.VehicleLoadingRecommendationsResponse
		require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
		require.Empty(t, response.Recommendations)
	})

	t.Run("with invert recommendation becomes feasible", func(t *testing.T) {
		requestBody := baseRequest
		requestBody.PackageInput = &services.VehicleLoadingPackageInputPayload{
			PackageID:    "pkg-with-invert",
			Name:         "可倒置箱型",
			UnitWeightKg: 40,
			Dimension: services.VehiclePackageDimensionResponse{
				LengthMm:  900,
				WidthMm:   700,
				HeightMm:  1100,
				CanRotate: true,
				CanInvert: true,
			},
		}

		payload, err := json.Marshal(requestBody)
		require.NoError(t, err)

		recorder := httptest.NewRecorder()
		ctx, _ := gin.CreateTestContext(recorder)
		request := httptest.NewRequest(http.MethodPost, "/api/v1/logistics/vehicle-loading/recommendations", bytes.NewReader(payload))
		request.Header.Set("Content-Type", "application/json")
		ctx.Request = request

		GetVehicleLoadingRecommendationsHandler(ctx)

		require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())
		var response services.VehicleLoadingRecommendationsResponse
		require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
		require.Len(t, response.Recommendations, 1)
		require.Equal(t, "height", response.Recommendations[0].SelectedOrientationAxis)
		require.Contains(t, response.Recommendations[0].SelectedOrientationLabel, "H-")
	})
}
