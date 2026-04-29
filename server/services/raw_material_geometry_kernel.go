package services

import (
	"fmt"
	"math"
	"xdfc-server/models"
)

func buildRawMaterialRectanglePolygon(x float64, y float64, width float64, height float64) rawMaterialGeometryPolygon {
	return rawMaterialGeometryPolygon{
		Points: []rawMaterialGeometryPoint{
			{X: x, Y: y},
			{X: x + width, Y: y},
			{X: x + width, Y: y + height},
			{X: x, Y: y + height},
		},
	}
}

func buildRawMaterialCenteredRotatedRectanglePolygon(
	width float64,
	height float64,
	angleDeg float64,
	centerX float64,
	centerY float64,
) rawMaterialGeometryPolygon {
	halfWidth := width / 2
	halfHeight := height / 2
	corners := []rawMaterialGeometryPoint{
		{X: -halfWidth, Y: -halfHeight},
		{X: halfWidth, Y: -halfHeight},
		{X: halfWidth, Y: halfHeight},
		{X: -halfWidth, Y: halfHeight},
	}
	radians := angleDeg * math.Pi / 180
	sinValue := math.Sin(radians)
	cosValue := math.Cos(radians)
	points := make([]rawMaterialGeometryPoint, 0, len(corners))
	for _, corner := range corners {
		rotatedX := corner.X*cosValue - corner.Y*sinValue
		rotatedY := corner.X*sinValue + corner.Y*cosValue
		points = append(points, rawMaterialGeometryPoint{
			X: centerX + rotatedX,
			Y: centerY + rotatedY,
		})
	}
	return rawMaterialGeometryPolygon{Points: points}
}

func rawMaterialGeometryPolygonArea(polygon rawMaterialGeometryPolygon) float64 {
	if len(polygon.Points) < 3 {
		return 0
	}
	area := 0.0
	for index := range polygon.Points {
		nextIndex := (index + 1) % len(polygon.Points)
		current := polygon.Points[index]
		next := polygon.Points[nextIndex]
		area += current.X*next.Y - next.X*current.Y
	}
	return math.Abs(area) / 2 / 1_000_000
}

func rawMaterialGeometryPolygonBounds(polygon rawMaterialGeometryPolygon) rawMaterialGeometryBounds {
	if len(polygon.Points) == 0 {
		return rawMaterialGeometryBounds{}
	}
	bounds := rawMaterialGeometryBounds{
		MinX: polygon.Points[0].X,
		MinY: polygon.Points[0].Y,
		MaxX: polygon.Points[0].X,
		MaxY: polygon.Points[0].Y,
	}
	for _, point := range polygon.Points[1:] {
		bounds.MinX = math.Min(bounds.MinX, point.X)
		bounds.MinY = math.Min(bounds.MinY, point.Y)
		bounds.MaxX = math.Max(bounds.MaxX, point.X)
		bounds.MaxY = math.Max(bounds.MaxY, point.Y)
	}
	return bounds
}

func translateRawMaterialGeometryPolygon(
	polygon rawMaterialGeometryPolygon,
	deltaX float64,
	deltaY float64,
) rawMaterialGeometryPolygon {
	points := make([]rawMaterialGeometryPoint, 0, len(polygon.Points))
	for _, point := range polygon.Points {
		points = append(points, rawMaterialGeometryPoint{
			X: point.X + deltaX,
			Y: point.Y + deltaY,
		})
	}
	return rawMaterialGeometryPolygon{Points: points}
}

func rawMaterialGeometryPolygonContainsPoint(
	polygon rawMaterialGeometryPolygon,
	point rawMaterialGeometryPoint,
) bool {
	if len(polygon.Points) < 3 {
		return false
	}
	inside := false
	for index, previousIndex := 0, len(polygon.Points)-1; index < len(polygon.Points); previousIndex, index = index, index+1 {
		current := polygon.Points[index]
		previous := polygon.Points[previousIndex]
		if rawMaterialGeometryPointLiesOnSegment(point, previous, current) {
			return true
		}
		intersects := (current.Y > point.Y) != (previous.Y > point.Y)
		if !intersects {
			continue
		}
		xIntersection := ((previous.X-current.X)*(point.Y-current.Y))/(previous.Y-current.Y+1e-9) + current.X
		if point.X < xIntersection {
			inside = !inside
		}
	}
	return inside
}

func rawMaterialGeometryPointLiesOnSegment(
	point rawMaterialGeometryPoint,
	segmentStart rawMaterialGeometryPoint,
	segmentEnd rawMaterialGeometryPoint,
) bool {
	cross := (point.Y-segmentStart.Y)*(segmentEnd.X-segmentStart.X) - (point.X-segmentStart.X)*(segmentEnd.Y-segmentStart.Y)
	if math.Abs(cross) > 1e-6 {
		return false
	}
	dot := (point.X-segmentStart.X)*(segmentEnd.X-segmentStart.X) + (point.Y-segmentStart.Y)*(segmentEnd.Y-segmentStart.Y)
	if dot < 0 {
		return false
	}
	squaredLength := (segmentEnd.X-segmentStart.X)*(segmentEnd.X-segmentStart.X) + (segmentEnd.Y-segmentStart.Y)*(segmentEnd.Y-segmentStart.Y)
	if dot > squaredLength {
		return false
	}
	return true
}

func rawMaterialGeometryPolygonContainsPolygon(
	container rawMaterialGeometryPolygon,
	polygon rawMaterialGeometryPolygon,
) bool {
	if len(polygon.Points) == 0 {
		return false
	}
	for _, point := range polygon.Points {
		if !rawMaterialGeometryPolygonContainsPoint(container, point) {
			return false
		}
	}
	return true
}

func isRawMaterialGeometryAxisAlignedRectangle(polygon rawMaterialGeometryPolygon) bool {
	if len(polygon.Points) != 4 {
		return false
	}
	bounds := rawMaterialGeometryPolygonBounds(polygon)
	expected := map[string]struct{}{
		fmt.Sprintf("%.6f:%.6f", bounds.MinX, bounds.MinY): {},
		fmt.Sprintf("%.6f:%.6f", bounds.MaxX, bounds.MinY): {},
		fmt.Sprintf("%.6f:%.6f", bounds.MaxX, bounds.MaxY): {},
		fmt.Sprintf("%.6f:%.6f", bounds.MinX, bounds.MaxY): {},
	}
	for _, point := range polygon.Points {
		if _, exists := expected[fmt.Sprintf("%.6f:%.6f", point.X, point.Y)]; !exists {
			return false
		}
	}
	return true
}

func splitRawMaterialGeometryRectangleSlotByEnvelope(
	slot rawMaterialGeometryPolygon,
	envelope rawMaterialGeometryPolygon,
) []rawMaterialGeometryPolygon {
	if !isRawMaterialGeometryAxisAlignedRectangle(slot) || !isRawMaterialGeometryAxisAlignedRectangle(envelope) {
		return nil
	}
	slotBounds := rawMaterialGeometryPolygonBounds(slot)
	envelopeBounds := rawMaterialGeometryPolygonBounds(envelope)
	polygons := make([]rawMaterialGeometryPolygon, 0, 2)
	if envelopeBounds.MaxX < slotBounds.MaxX {
		polygons = append(polygons, buildRawMaterialRectanglePolygon(
			envelopeBounds.MaxX,
			slotBounds.MinY,
			slotBounds.MaxX-envelopeBounds.MaxX,
			slotBounds.MaxY-slotBounds.MinY,
		))
	}
	if envelopeBounds.MaxY < slotBounds.MaxY {
		polygons = append(polygons, buildRawMaterialRectanglePolygon(
			slotBounds.MinX,
			envelopeBounds.MaxY,
			envelopeBounds.MaxX-slotBounds.MinX,
			slotBounds.MaxY-envelopeBounds.MaxY,
		))
	}
	result := make([]rawMaterialGeometryPolygon, 0, len(polygons))
	for _, polygon := range polygons {
		if rawMaterialGeometryPolygonArea(polygon) <= 0 {
			continue
		}
		result = append(result, polygon)
	}
	return result
}

func toRawMaterialBatchOptimizerGeometryPoints(points []rawMaterialGeometryPoint) []models.RawMaterialBatchOptimizerGeometryPoint {
	result := make([]models.RawMaterialBatchOptimizerGeometryPoint, 0, len(points))
	for _, point := range points {
		result = append(result, models.RawMaterialBatchOptimizerGeometryPoint{
			X: roundRawMaterialBatchOptimizer(point.X, 3),
			Y: roundRawMaterialBatchOptimizer(point.Y, 3),
		})
	}
	return result
}
