package services

import (
	"errors"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"
)

var (
	ErrVehicleLoadingVehicleSpecsRequired = errors.New("vehicle specs are required")
	ErrVehicleLoadingSummaryInvalid       = errors.New("vehicle loading summary is invalid")
)

type VehicleLoadingSummaryPayload struct {
	Boxes         int     `json:"boxes"`
	TotalVolumeM3 float64 `json:"totalVolumeM3"`
	TotalWeightKg float64 `json:"totalWeightKg"`
}

type VehicleLoadingRecommendationsRequest struct {
	Summary      VehicleLoadingSummaryPayload       `json:"summary"`
	VehicleSpecs []VehicleSpecResponse              `json:"vehicleSpecs"`
	PackageInput *VehicleLoadingPackageInputPayload `json:"packageInput,omitempty"`
}

type VehicleLoadingPackageInputPayload struct {
	PackageID    string                          `json:"packageId"`
	ProfileID    string                          `json:"profileId,omitempty"`
	Name         string                          `json:"name"`
	UnitWeightKg float64                         `json:"unitWeightKg"`
	Dimension    VehiclePackageDimensionResponse `json:"dimension"`
}

type VehiclePackageDimensionResponse struct {
	LengthMm  int  `json:"lengthMm"`
	WidthMm   int  `json:"widthMm"`
	HeightMm  int  `json:"heightMm"`
	CanRotate bool `json:"canRotate"`
	CanInvert bool `json:"canInvert"`
}

type VehicleLoadingRecommendationItem struct {
	Vehicle                  VehicleSpecResponse             `json:"vehicle"`
	PackageDimension         VehiclePackageDimensionResponse `json:"packageDimension"`
	VehiclesNeeded           int                             `json:"vehiclesNeeded"`
	LoadRateVolume           float64                         `json:"loadRateVolume"`
	LoadRateWeight           float64                         `json:"loadRateWeight"`
	Reason                   string                          `json:"reason"`
	Warning                  string                          `json:"warning,omitempty"`
	SelectedOrientationLabel string                          `json:"selectedOrientationLabel,omitempty"`
	SelectedOrientationAxis  string                          `json:"selectedOrientationAxis,omitempty"`
	BoxesPerLayer            int                             `json:"boxesPerLayer,omitempty"`
	LayerCount               int                             `json:"layerCount,omitempty"`
	MaxBoxesPerVehicle       int                             `json:"maxBoxesPerVehicle,omitempty"`
}

type VehicleLoadingRecommendationsResponse struct {
	Recommendations []VehicleLoadingRecommendationItem `json:"recommendations"`
	GeneratedAt     string                             `json:"generatedAt"`
	EngineVersion   string                             `json:"engineVersion"`
}

type vehicleLoadingPackageProfile struct {
	PackageID    string
	Name         string
	Quantity     int
	Dimension    VehiclePackageDimensionResponse
	UnitWeightKg float64
}

type vehicleOrientation struct {
	LengthMm int
	WidthMm  int
	HeightMm int
	Label    string
}

type vehicleLoadingPlan struct {
	Vehicle             VehicleSpecResponse
	SelectedOrientation vehicleOrientation
	BoxesPerLayer       int
	LayerCount          int
	MaxBoxesPerVehicle  int
	VolumeUtilization   float64
	WeightUtilization   float64
	LoadingReason       []string
	RiskNotes           []string
}

const vehicleLoadingRecommendationEngineVersion = "load-planning-0.2.0"

var defaultVehiclePackageDimension = VehiclePackageDimensionResponse{
	LengthMm:  420,
	WidthMm:   420,
	HeightMm:  400,
	CanRotate: true,
	CanInvert: false,
}

func buildVehicleLoadingPackageProfile(request VehicleLoadingRecommendationsRequest) vehicleLoadingPackageProfile {
	if request.PackageInput != nil {
		packageID := strings.TrimSpace(request.PackageInput.PackageID)
		if packageID == "" {
			packageID = "explicit-package-input"
		}
		name := strings.TrimSpace(request.PackageInput.Name)
		if name == "" {
			name = "显式箱型输入"
		}
		return vehicleLoadingPackageProfile{
			PackageID:    packageID,
			Name:         name,
			Quantity:     request.Summary.Boxes,
			Dimension:    request.PackageInput.Dimension,
			UnitWeightKg: request.PackageInput.UnitWeightKg,
		}
	}

	unitWeightKg := request.Summary.TotalWeightKg
	if request.Summary.Boxes > 0 {
		unitWeightKg = request.Summary.TotalWeightKg / float64(request.Summary.Boxes)
	}
	return vehicleLoadingPackageProfile{
		PackageID:    "shipment-summary",
		Name:         "装箱汇总输入",
		Quantity:     request.Summary.Boxes,
		Dimension:    defaultVehiclePackageDimension,
		UnitWeightKg: unitWeightKg,
	}
}

func buildVehicleLoadingWarnings(profile vehicleLoadingPackageProfile) []string {
	warnings := make([]string, 0)
	if profile.Quantity <= 0 {
		warnings = append(warnings, "装箱数量必须大于 0")
	}
	if profile.UnitWeightKg <= 0 {
		warnings = append(warnings, "单箱重量必须大于 0")
	}
	if profile.Dimension.LengthMm <= 0 || profile.Dimension.WidthMm <= 0 || profile.Dimension.HeightMm <= 0 {
		warnings = append(warnings, "箱体尺寸必须大于 0")
	}
	return warnings
}

func dedupeVehicleOrientations(items []vehicleOrientation) []vehicleOrientation {
	seen := make(map[string]struct{}, len(items))
	result := make([]vehicleOrientation, 0, len(items))
	for _, item := range items {
		key := fmt.Sprintf("%d-%d-%d", item.LengthMm, item.WidthMm, item.HeightMm)
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		result = append(result, item)
	}
	return result
}

func getVehiclePackageOrientations(dimension VehiclePackageDimensionResponse) []vehicleOrientation {
	if !dimension.CanRotate {
		return []vehicleOrientation{{LengthMm: dimension.LengthMm, WidthMm: dimension.WidthMm, HeightMm: dimension.HeightMm, Label: "标准朝向"}}
	}
	if !dimension.CanInvert {
		return dedupeVehicleOrientations([]vehicleOrientation{
			{LengthMm: dimension.LengthMm, WidthMm: dimension.WidthMm, HeightMm: dimension.HeightMm, Label: "L-W-H"},
			{LengthMm: dimension.WidthMm, WidthMm: dimension.LengthMm, HeightMm: dimension.HeightMm, Label: "W-L-H"},
		})
	}
	return dedupeVehicleOrientations([]vehicleOrientation{
		{LengthMm: dimension.LengthMm, WidthMm: dimension.WidthMm, HeightMm: dimension.HeightMm, Label: "L-W-H"},
		{LengthMm: dimension.LengthMm, WidthMm: dimension.HeightMm, HeightMm: dimension.WidthMm, Label: "L-H-W"},
		{LengthMm: dimension.WidthMm, WidthMm: dimension.LengthMm, HeightMm: dimension.HeightMm, Label: "W-L-H"},
		{LengthMm: dimension.WidthMm, WidthMm: dimension.HeightMm, HeightMm: dimension.LengthMm, Label: "W-H-L"},
		{LengthMm: dimension.HeightMm, WidthMm: dimension.LengthMm, HeightMm: dimension.WidthMm, Label: "H-L-W"},
		{LengthMm: dimension.HeightMm, WidthMm: dimension.WidthMm, HeightMm: dimension.LengthMm, Label: "H-W-L"},
	})
}

func vehicleConstraintsPassed(vehicle VehicleSpecResponse, orientation vehicleOrientation, unitWeightKg float64) bool {
	if orientation.LengthMm <= 0 || orientation.WidthMm <= 0 || orientation.HeightMm <= 0 {
		return false
	}
	if vehicle.UsableInnerSize.LengthMm <= 0 || vehicle.UsableInnerSize.WidthMm <= 0 || vehicle.UsableInnerSize.HeightMm <= 0 {
		return false
	}
	if vehicle.PayloadKg <= 0 || unitWeightKg <= 0 {
		return false
	}
	if orientation.LengthMm > vehicle.UsableInnerSize.LengthMm {
		return false
	}
	if orientation.WidthMm > vehicle.UsableInnerSize.WidthMm {
		return false
	}
	if orientation.HeightMm > vehicle.UsableInnerSize.HeightMm {
		return false
	}
	if unitWeightKg > vehicle.PayloadKg {
		return false
	}
	return true
}

func minInt(values ...int) int {
	if len(values) == 0 {
		return 0
	}
	minValue := values[0]
	for _, value := range values[1:] {
		if value < minValue {
			minValue = value
		}
	}
	return minValue
}

func calculateVehicleLoadPlanForOrientation(
	vehicle VehicleSpecResponse,
	orientation vehicleOrientation,
	packageCount int,
	unitWeightKg float64,
) *vehicleLoadingPlan {
	if orientation.LengthMm > vehicle.UsableInnerSize.LengthMm ||
		orientation.WidthMm > vehicle.UsableInnerSize.WidthMm ||
		orientation.HeightMm > vehicle.UsableInnerSize.HeightMm {
		return nil
	}

	boxesAlongLength := vehicle.UsableInnerSize.LengthMm / orientation.LengthMm
	boxesAlongWidth := vehicle.UsableInnerSize.WidthMm / orientation.WidthMm
	layers := vehicle.UsableInnerSize.HeightMm / orientation.HeightMm
	boxesPerLayer := boxesAlongLength * boxesAlongWidth
	maxBoxesByGeometry := boxesPerLayer * layers
	maxBoxesByWeight := 0
	if unitWeightKg > 0 {
		maxBoxesByWeight = int(math.Floor(vehicle.PayloadKg / unitWeightKg))
	}
	maxBoxesPerVehicle := minInt(packageCount, maxBoxesByGeometry, maxBoxesByWeight)
	if maxBoxesPerVehicle <= 0 {
		return nil
	}

	boxVolumeM3 := float64(orientation.LengthMm*orientation.WidthMm*orientation.HeightMm) / 1_000_000_000
	loadedVolumeM3 := boxVolumeM3 * float64(maxBoxesPerVehicle)
	volumeUtilization := 0.0
	if vehicle.VolumeM3 > 0 {
		volumeUtilization = math.Min(loadedVolumeM3/vehicle.VolumeM3, 1)
	}
	weightUtilization := 0.0
	if vehicle.PayloadKg > 0 {
		weightUtilization = math.Min((float64(maxBoxesPerVehicle)*unitWeightKg)/vehicle.PayloadKg, 1)
	}

	return &vehicleLoadingPlan{
		Vehicle:             vehicle,
		SelectedOrientation: orientation,
		BoxesPerLayer:       boxesPerLayer,
		LayerCount:          layers,
		MaxBoxesPerVehicle:  maxBoxesPerVehicle,
		VolumeUtilization:   volumeUtilization,
		WeightUtilization:   weightUtilization,
		LoadingReason: []string{
			"采用 " + orientation.Label + " 朝向",
			fmt.Sprintf("每层可放 %d 箱", boxesPerLayer),
			fmt.Sprintf("可叠 %d 层", layers),
		},
		RiskNotes: []string{},
	}
}

func buildVehicleRiskNotes(plan *vehicleLoadingPlan, packageCount int) []string {
	notes := make([]string, 0)
	if plan.MaxBoxesPerVehicle < packageCount {
		notes = append(notes, "单车无法装完全部箱数")
	}
	if plan.WeightUtilization > 0.85 {
		notes = append(notes, "重量利用率较高，请复核载重余量")
	}
	if plan.VolumeUtilization > 0.85 {
		notes = append(notes, "体积利用率较高，请复核装载余量")
	}
	return notes
}

func isBetterVehicleLoadingPlan(candidate, current *vehicleLoadingPlan) bool {
	if candidate.MaxBoxesPerVehicle != current.MaxBoxesPerVehicle {
		return candidate.MaxBoxesPerVehicle > current.MaxBoxesPerVehicle
	}
	if candidate.WeightUtilization != current.WeightUtilization {
		return candidate.WeightUtilization > current.WeightUtilization
	}
	if candidate.VolumeUtilization != current.VolumeUtilization {
		return candidate.VolumeUtilization > current.VolumeUtilization
	}
	return false
}

func compareVehicleLoadingPlans(left, right vehicleLoadingPlan) bool {
	if left.MaxBoxesPerVehicle != right.MaxBoxesPerVehicle {
		return left.MaxBoxesPerVehicle > right.MaxBoxesPerVehicle
	}
	if left.WeightUtilization != right.WeightUtilization {
		return left.WeightUtilization > right.WeightUtilization
	}
	if left.VolumeUtilization != right.VolumeUtilization {
		return left.VolumeUtilization > right.VolumeUtilization
	}
	return false
}

func resolveVehicleOrientationAxis(label string) string {
	trimmed := strings.TrimSpace(label)
	if strings.HasPrefix(trimmed, "L-") {
		return "length"
	}
	if strings.HasPrefix(trimmed, "W-") {
		return "width"
	}
	if strings.HasPrefix(trimmed, "H-") {
		return "height"
	}
	return ""
}

func BuildVehicleLoadingRecommendations(request VehicleLoadingRecommendationsRequest) (VehicleLoadingRecommendationsResponse, error) {
	if request.Summary.Boxes < 0 || request.Summary.TotalVolumeM3 < 0 || request.Summary.TotalWeightKg < 0 {
		return VehicleLoadingRecommendationsResponse{}, ErrVehicleLoadingSummaryInvalid
	}
	if len(request.VehicleSpecs) == 0 {
		return VehicleLoadingRecommendationsResponse{}, ErrVehicleLoadingVehicleSpecsRequired
	}

	profile := buildVehicleLoadingPackageProfile(request)
	warnings := buildVehicleLoadingWarnings(profile)
	response := VehicleLoadingRecommendationsResponse{
		Recommendations: []VehicleLoadingRecommendationItem{},
		GeneratedAt:     time.Now().UTC().Format(time.RFC3339),
		EngineVersion:   vehicleLoadingRecommendationEngineVersion,
	}
	if len(warnings) > 0 {
		return response, nil
	}

	orientations := getVehiclePackageOrientations(profile.Dimension)
	plans := make([]vehicleLoadingPlan, 0, len(request.VehicleSpecs))
	for _, vehicle := range request.VehicleSpecs {
		var bestPlan *vehicleLoadingPlan
		for _, orientation := range orientations {
			if !vehicleConstraintsPassed(vehicle, orientation, profile.UnitWeightKg) {
				continue
			}
			plan := calculateVehicleLoadPlanForOrientation(vehicle, orientation, profile.Quantity, profile.UnitWeightKg)
			if plan == nil {
				continue
			}
			plan.LoadingReason = append(plan.LoadingReason, "箱型："+profile.Name, fmt.Sprintf("数量：%d", profile.Quantity))
			plan.RiskNotes = buildVehicleRiskNotes(plan, profile.Quantity)
			if bestPlan == nil || isBetterVehicleLoadingPlan(plan, bestPlan) {
				bestPlan = plan
			}
		}
		if bestPlan != nil {
			plans = append(plans, *bestPlan)
		}
	}

	sort.Slice(plans, func(i, j int) bool {
		return compareVehicleLoadingPlans(plans[i], plans[j])
	})

	recommendations := make([]VehicleLoadingRecommendationItem, 0, len(plans))
	for _, plan := range plans {
		vehiclesNeeded := 0
		if plan.MaxBoxesPerVehicle > 0 {
			vehiclesNeeded = int(math.Ceil(float64(request.Summary.Boxes) / float64(plan.MaxBoxesPerVehicle)))
		}
		item := VehicleLoadingRecommendationItem{
			Vehicle:                  plan.Vehicle,
			PackageDimension:         profile.Dimension,
			VehiclesNeeded:           vehiclesNeeded,
			LoadRateVolume:           plan.VolumeUtilization,
			LoadRateWeight:           plan.WeightUtilization,
			Reason:                   strings.Join(plan.LoadingReason, "；"),
			SelectedOrientationLabel: plan.SelectedOrientation.Label,
			BoxesPerLayer:            plan.BoxesPerLayer,
			LayerCount:               plan.LayerCount,
			MaxBoxesPerVehicle:       plan.MaxBoxesPerVehicle,
		}
		if len(plan.RiskNotes) > 0 {
			item.Warning = plan.RiskNotes[0]
		}
		if axis := resolveVehicleOrientationAxis(plan.SelectedOrientation.Label); axis != "" {
			item.SelectedOrientationAxis = axis
		}
		recommendations = append(recommendations, item)
	}
	response.Recommendations = recommendations
	return response, nil
}
