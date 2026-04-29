package services

type rawMaterialGeometryPoint struct {
	X float64
	Y float64
}

type rawMaterialGeometryPolygon struct {
	Points []rawMaterialGeometryPoint
}

type rawMaterialGeometryBounds struct {
	MinX float64
	MinY float64
	MaxX float64
	MaxY float64
}
