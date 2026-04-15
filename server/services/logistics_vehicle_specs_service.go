package services

import (
	"math"

	"xdfc-server/models"
)

type VehicleSpecDimension struct {
	LengthMm int `json:"lengthMm"`
	WidthMm  int `json:"widthMm"`
	HeightMm int `json:"heightMm"`
}

type VehicleSpecAllowance struct {
	TopClearanceMm  int `json:"topClearanceMm"`
	SideClearanceMm int `json:"sideClearanceMm"`
	RearClearanceMm int `json:"rearClearanceMm"`
}

type VehicleSpecConstraint struct {
	DoorWidthMm       int  `json:"doorWidthMm"`
	DoorHeightMm      int  `json:"doorHeightMm"`
	WheelArchWidthMm  int  `json:"wheelArchWidthMm"`
	WheelArchHeightMm int  `json:"wheelArchHeightMm"`
	HasCenterPillar   bool `json:"hasCenterPillar"`
}

type VehicleSpecResponse struct {
	ID                string                    `json:"id"`
	Category          string                    `json:"category"`
	Name              string                    `json:"name"`
	PayloadKg         float64                   `json:"payloadKg"`
	VolumeM3          float64                   `json:"volumeM3"`
	NominalVolumeM3   float64                   `json:"nominalVolumeM3"`
	PhysicalInnerSize VehicleSpecDimension      `json:"physicalInnerSize"`
	UsableInnerSize   VehicleSpecDimension      `json:"usableInnerSize"`
	SafetyAllowance   VehicleSpecAllowance      `json:"safetyAllowance"`
	LoadingConstraint VehicleSpecConstraint     `json:"loadingConstraint"`
	PhotoEntry        VehiclePhotoEntryResponse `json:"photoEntry"`
	IsBoxBody         bool                      `json:"isBoxBody"`
	Enabled           bool                      `json:"enabled"`
	Notes             string                    `json:"notes"`
}

func computeUsableInnerSize(physical VehicleSpecDimension, allowance VehicleSpecAllowance) VehicleSpecDimension {
	lengthMm := physical.LengthMm - allowance.RearClearanceMm
	widthMm := physical.WidthMm - allowance.SideClearanceMm*2
	heightMm := physical.HeightMm - allowance.TopClearanceMm

	if lengthMm < 0 {
		lengthMm = 0
	}
	if widthMm < 0 {
		widthMm = 0
	}
	if heightMm < 0 {
		heightMm = 0
	}

	return VehicleSpecDimension{LengthMm: lengthMm, WidthMm: widthMm, HeightMm: heightMm}
}

func computeVolumeM3(size VehicleSpecDimension) float64 {
	return math.Round(float64(size.LengthMm*size.WidthMm*size.HeightMm)/1_000_000_000*10) / 10
}

func buildVehicleSpecResponse(
	id string,
	category models.VehicleCategory,
	name string,
	payloadKg float64,
	nominalVolumeM3 float64,
	physical VehicleSpecDimension,
	allowance VehicleSpecAllowance,
	constraint VehicleSpecConstraint,
	isBoxBody bool,
	enabled bool,
	notes string,
) VehicleSpecResponse {
	usable := computeUsableInnerSize(physical, allowance)
	return VehicleSpecResponse{
		ID:                id,
		Category:          string(category),
		Name:              name,
		PayloadKg:         payloadKg,
		VolumeM3:          computeVolumeM3(usable),
		NominalVolumeM3:   nominalVolumeM3,
		PhysicalInnerSize: physical,
		UsableInnerSize:   usable,
		SafetyAllowance:   allowance,
		LoadingConstraint: constraint,
		IsBoxBody:         isBoxBody,
		Enabled:           enabled,
		Notes:             notes,
	}
}

func getVehicleSpecsCatalogBase() []VehicleSpecResponse {
	return []VehicleSpecResponse{
		buildVehicleSpecResponse(
			"van-standard",
			models.VehicleCategoryVan,
			"面包车（标准）",
			700,
			3.5,
			VehicleSpecDimension{LengthMm: 2400, WidthMm: 1400, HeightMm: 1200},
			VehicleSpecAllowance{TopClearanceMm: 200, SideClearanceMm: 80, RearClearanceMm: 120},
			VehicleSpecConstraint{DoorWidthMm: 1180, DoorHeightMm: 980, WheelArchWidthMm: 120, WheelArchHeightMm: 180, HasCenterPillar: false},
			false,
			true,
			"适合同城短驳，小批量轻货优先。",
		),
		buildVehicleSpecResponse(
			"van-large",
			models.VehicleCategoryVan,
			"面包车（加长）",
			900,
			5.0,
			VehicleSpecDimension{LengthMm: 3000, WidthMm: 1500, HeightMm: 1300},
			VehicleSpecAllowance{TopClearanceMm: 260, SideClearanceMm: 80, RearClearanceMm: 120},
			VehicleSpecConstraint{DoorWidthMm: 1260, DoorHeightMm: 1040, WheelArchWidthMm: 110, WheelArchHeightMm: 160, HasCenterPillar: false},
			false,
			true,
			"适合加长件与中小票发货，但仍需预留尾门作业空间。",
		),
		buildVehicleSpecResponse(
			"box-truck-4m2",
			models.VehicleCategoryBoxTruck,
			"厢式货车（4.2米）",
			2000,
			12.0,
			VehicleSpecDimension{LengthMm: 4200, WidthMm: 1900, HeightMm: 1900},
			VehicleSpecAllowance{TopClearanceMm: 460, SideClearanceMm: 80, RearClearanceMm: 150},
			VehicleSpecConstraint{DoorWidthMm: 1760, DoorHeightMm: 1680, WheelArchWidthMm: 140, WheelArchHeightMm: 220, HasCenterPillar: false},
			true,
			true,
			"常规主力车型，适合标准整票配送。",
		),
		buildVehicleSpecResponse(
			"light-truck-6m8",
			models.VehicleCategoryLightTruck,
			"轻卡（6.8米）",
			6000,
			30.0,
			VehicleSpecDimension{LengthMm: 6800, WidthMm: 2400, HeightMm: 2200},
			VehicleSpecAllowance{TopClearanceMm: 440, SideClearanceMm: 80, RearClearanceMm: 200},
			VehicleSpecConstraint{DoorWidthMm: 2260, DoorHeightMm: 1980, WheelArchWidthMm: 160, WheelArchHeightMm: 240, HasCenterPillar: false},
			true,
			true,
			"适合跨市整票，需注意尾部预留与叉车装卸通道。",
		),
		buildVehicleSpecResponse(
			"medium-truck-9m6",
			models.VehicleCategoryMediumTruck,
			"中卡（9.6米）",
			12000,
			55.0,
			VehicleSpecDimension{LengthMm: 9600, WidthMm: 2450, HeightMm: 2400},
			VehicleSpecAllowance{TopClearanceMm: 230, SideClearanceMm: 80, RearClearanceMm: 250},
			VehicleSpecConstraint{DoorWidthMm: 2320, DoorHeightMm: 2140, WheelArchWidthMm: 180, WheelArchHeightMm: 260, HasCenterPillar: true},
			true,
			true,
			"适合大批量与干线发货，推荐按可用空间评估而不是名义载方。",
		),
	}
}

func GetVehicleSpecsCatalog() ([]VehicleSpecResponse, error) {
	base := getVehicleSpecsCatalogBase()
	result := make([]VehicleSpecResponse, 0, len(base))
	for _, item := range base {
		entry, err := BuildVehiclePhotoEntryForVehicleSpec(item)
		if err != nil {
			return nil, err
		}
		item.PhotoEntry = entry
		result = append(result, item)
	}
	return result, nil
}
