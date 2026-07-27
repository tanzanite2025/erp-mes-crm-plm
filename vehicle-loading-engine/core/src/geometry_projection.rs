use crate::geometry::{
    AabbMm, CollisionKind, GeometryObbMm, GeometryPart, PartKind, VehicleGeometry,
    VEHICLE_GEOMETRY_SCHEMA_VERSION,
};
use crate::packing::{
    DimensionsMm, LoadingSpaceBlockedSpaceInput, LoadingSpaceObbInput, PositionMm,
    VehicleLoadingWarning,
};
use serde::{Deserialize, Serialize};
use std::fmt::{Display, Formatter};

pub const VEHICLE_LOADING_GEOMETRY_PROJECTION_SCHEMA_VERSION: &str =
    "vehicle-loading-geometry-projection.v1";

const GEOMETRY_PROJECTION_EPSILON_MM: f64 = 0.001;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct VehicleLoadingGeometryProjection {
    pub schema_version: String,
    pub usable_space: DimensionsMm,
    pub blocked_spaces: Vec<LoadingSpaceBlockedSpaceInput>,
    pub warnings: Vec<VehicleLoadingWarning>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum VehicleLoadingGeometryProjectionError {
    InvalidGeometrySchema(String),
    UsableSpaceMissing,
    UsableSpaceDuplicated,
    UsableSpaceBoundsInvalid,
    BlockedPartBoundsInvalid(String),
    BlockedPartObbInvalid(String),
    BlockedPartOutsideUsableSpace(String),
    DimensionOverflow(String),
}

impl Display for VehicleLoadingGeometryProjectionError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidGeometrySchema(value) => write!(
                formatter,
                "车型几何协议必须是 {}，当前为 {}",
                VEHICLE_GEOMETRY_SCHEMA_VERSION, value
            ),
            Self::UsableSpaceMissing => write!(formatter, "车型几何缺少 usable-space"),
            Self::UsableSpaceDuplicated => write!(formatter, "车型几何只能有一个 usable-space"),
            Self::UsableSpaceBoundsInvalid => write!(formatter, "usable-space AABB 无效"),
            Self::BlockedPartBoundsInvalid(part_id) => {
                write!(formatter, "障碍几何 {} 的 AABB 无效", part_id)
            }
            Self::BlockedPartObbInvalid(part_id) => {
                write!(formatter, "障碍几何 {} 的 OBB 无效", part_id)
            }
            Self::BlockedPartOutsideUsableSpace(part_id) => {
                write!(formatter, "障碍几何 {} 超出 usable-space", part_id)
            }
            Self::DimensionOverflow(part_id) => {
                write!(formatter, "几何 {} 的毫米尺寸超出 u32 范围", part_id)
            }
        }
    }
}

impl std::error::Error for VehicleLoadingGeometryProjectionError {}

pub fn project_vehicle_geometry_to_loading_space(
    geometry: &VehicleGeometry,
) -> Result<VehicleLoadingGeometryProjection, VehicleLoadingGeometryProjectionError> {
    if geometry.schema_version != VEHICLE_GEOMETRY_SCHEMA_VERSION {
        return Err(
            VehicleLoadingGeometryProjectionError::InvalidGeometrySchema(
                geometry.schema_version.clone(),
            ),
        );
    }

    let usable_space_part = get_single_usable_space_part(geometry)?;
    if usable_space_part.bounds.is_empty() {
        return Err(VehicleLoadingGeometryProjectionError::UsableSpaceBoundsInvalid);
    }

    let usable_space = dimensions_from_aabb_size("usable-space", &usable_space_part.bounds)?;
    let mut warnings = Vec::new();
    let mut blocked_spaces = Vec::new();

    for part in geometry.parts.iter().filter(|part| part_is_blocking(part)) {
        blocked_spaces.push(project_blocking_part_to_blocked_space(
            part,
            &usable_space_part.bounds,
            usable_space,
        )?);
    }

    if blocked_spaces.is_empty() {
        warnings.push(VehicleLoadingWarning {
            code: "GEOMETRY_HAS_NO_BLOCKED_SPACES".to_owned(),
            message: "车型几何没有可投影的 obstacle / keep-out AABB 或 OBB".to_owned(),
        });
    }

    Ok(VehicleLoadingGeometryProjection {
        schema_version: VEHICLE_LOADING_GEOMETRY_PROJECTION_SCHEMA_VERSION.to_owned(),
        usable_space,
        blocked_spaces,
        warnings,
    })
}

fn get_single_usable_space_part(
    geometry: &VehicleGeometry,
) -> Result<&GeometryPart, VehicleLoadingGeometryProjectionError> {
    let mut usable_space_parts = geometry
        .parts
        .iter()
        .filter(|part| part.kind == PartKind::UsableSpace);
    let Some(usable_space_part) = usable_space_parts.next() else {
        return Err(VehicleLoadingGeometryProjectionError::UsableSpaceMissing);
    };
    if usable_space_parts.next().is_some() {
        return Err(VehicleLoadingGeometryProjectionError::UsableSpaceDuplicated);
    }
    Ok(usable_space_part)
}

fn part_is_blocking(part: &GeometryPart) -> bool {
    matches!(part.kind, PartKind::Obstacle | PartKind::KeepOut)
        && matches!(part.collision, CollisionKind::Aabb | CollisionKind::Obb)
}

fn project_blocking_part_to_blocked_space(
    part: &GeometryPart,
    usable_space_bounds: &AabbMm,
    usable_space: DimensionsMm,
) -> Result<LoadingSpaceBlockedSpaceInput, VehicleLoadingGeometryProjectionError> {
    if part.bounds.is_empty() {
        return Err(
            VehicleLoadingGeometryProjectionError::BlockedPartBoundsInvalid(part.id.clone()),
        );
    }
    if !aabb_is_inside_usable_space(&part.bounds, usable_space_bounds) {
        return Err(
            VehicleLoadingGeometryProjectionError::BlockedPartOutsideUsableSpace(part.id.clone()),
        );
    }

    let origin_mm = relative_position_from_aabb_min(&part.id, &part.bounds, usable_space_bounds)?;
    let dimension = relative_dimensions_from_aabb(&part.id, &part.bounds)?;
    let obb = project_obb_relative_to_usable_space(part, usable_space_bounds)?;
    if !blocked_space_is_inside_usable_space(origin_mm, dimension, usable_space) {
        return Err(
            VehicleLoadingGeometryProjectionError::BlockedPartOutsideUsableSpace(part.id.clone()),
        );
    }

    Ok(LoadingSpaceBlockedSpaceInput {
        id: part.id.clone(),
        kind: part_kind_label(part.kind).to_owned(),
        origin_mm,
        dimension,
        obb,
    })
}

fn project_obb_relative_to_usable_space(
    part: &GeometryPart,
    usable_space_bounds: &AabbMm,
) -> Result<Option<LoadingSpaceObbInput>, VehicleLoadingGeometryProjectionError> {
    if part.collision != CollisionKind::Obb {
        return Ok(None);
    }

    let obb = part.obb.as_ref().ok_or_else(|| {
        VehicleLoadingGeometryProjectionError::BlockedPartObbInvalid(part.id.clone())
    })?;
    if !obb_is_valid(obb) {
        return Err(VehicleLoadingGeometryProjectionError::BlockedPartObbInvalid(part.id.clone()));
    }
    if !aabb_is_inside_usable_space(&obb_broad_aabb(obb), usable_space_bounds) {
        return Err(
            VehicleLoadingGeometryProjectionError::BlockedPartOutsideUsableSpace(part.id.clone()),
        );
    }

    Ok(Some(LoadingSpaceObbInput {
        center_mm: [
            obb.center_mm[0] - usable_space_bounds.min_mm[0],
            obb.center_mm[1] - usable_space_bounds.min_mm[1],
            obb.center_mm[2] - usable_space_bounds.min_mm[2],
        ],
        half_extents_mm: obb.half_extents_mm,
        axes: obb.axes,
    }))
}

fn dimensions_from_aabb_size(
    part_id: &str,
    bounds: &AabbMm,
) -> Result<DimensionsMm, VehicleLoadingGeometryProjectionError> {
    Ok(DimensionsMm {
        length_mm: ceil_non_negative_mm_to_u32(part_id, bounds.length_mm)?,
        width_mm: ceil_non_negative_mm_to_u32(part_id, bounds.width_mm)?,
        height_mm: ceil_non_negative_mm_to_u32(part_id, bounds.height_mm)?,
    })
}

fn relative_position_from_aabb_min(
    part_id: &str,
    bounds: &AabbMm,
    usable_space_bounds: &AabbMm,
) -> Result<PositionMm, VehicleLoadingGeometryProjectionError> {
    Ok(PositionMm {
        x_mm: floor_non_negative_mm_to_u32(
            part_id,
            bounds.min_mm[0] - usable_space_bounds.min_mm[0],
        )?,
        y_mm: floor_non_negative_mm_to_u32(
            part_id,
            bounds.min_mm[1] - usable_space_bounds.min_mm[1],
        )?,
        z_mm: floor_non_negative_mm_to_u32(
            part_id,
            bounds.min_mm[2] - usable_space_bounds.min_mm[2],
        )?,
    })
}

fn relative_dimensions_from_aabb(
    part_id: &str,
    bounds: &AabbMm,
) -> Result<DimensionsMm, VehicleLoadingGeometryProjectionError> {
    Ok(DimensionsMm {
        length_mm: ceil_non_negative_mm_to_u32(part_id, bounds.max_mm[0] - bounds.min_mm[0])?,
        width_mm: ceil_non_negative_mm_to_u32(part_id, bounds.max_mm[1] - bounds.min_mm[1])?,
        height_mm: ceil_non_negative_mm_to_u32(part_id, bounds.max_mm[2] - bounds.min_mm[2])?,
    })
}

fn aabb_is_inside_usable_space(bounds: &AabbMm, usable_space_bounds: &AabbMm) -> bool {
    bounds
        .min_mm
        .iter()
        .zip(bounds.max_mm.iter())
        .zip(
            usable_space_bounds
                .min_mm
                .iter()
                .zip(usable_space_bounds.max_mm.iter()),
        )
        .all(|((min, max), (usable_min, usable_max))| {
            *min + GEOMETRY_PROJECTION_EPSILON_MM >= *usable_min
                && *max <= *usable_max + GEOMETRY_PROJECTION_EPSILON_MM
        })
}

fn blocked_space_is_inside_usable_space(
    origin_mm: PositionMm,
    dimension: DimensionsMm,
    usable_space: DimensionsMm,
) -> bool {
    origin_mm
        .x_mm
        .checked_add(dimension.length_mm)
        .is_some_and(|end| end <= usable_space.length_mm)
        && origin_mm
            .y_mm
            .checked_add(dimension.width_mm)
            .is_some_and(|end| end <= usable_space.width_mm)
        && origin_mm
            .z_mm
            .checked_add(dimension.height_mm)
            .is_some_and(|end| end <= usable_space.height_mm)
}

fn floor_non_negative_mm_to_u32(
    part_id: &str,
    value: f64,
) -> Result<u32, VehicleLoadingGeometryProjectionError> {
    if !value.is_finite() || value < -GEOMETRY_PROJECTION_EPSILON_MM {
        return Err(VehicleLoadingGeometryProjectionError::DimensionOverflow(
            part_id.to_owned(),
        ));
    }
    let normalized = normalize_near_integer_mm(value).max(0.0).floor();
    if normalized > u32::MAX as f64 {
        return Err(VehicleLoadingGeometryProjectionError::DimensionOverflow(
            part_id.to_owned(),
        ));
    }
    Ok(normalized as u32)
}

fn ceil_non_negative_mm_to_u32(
    part_id: &str,
    value: f64,
) -> Result<u32, VehicleLoadingGeometryProjectionError> {
    if !value.is_finite() || value < -GEOMETRY_PROJECTION_EPSILON_MM {
        return Err(VehicleLoadingGeometryProjectionError::DimensionOverflow(
            part_id.to_owned(),
        ));
    }
    let normalized = normalize_near_integer_mm(value).max(0.0).ceil();
    if normalized > u32::MAX as f64 {
        return Err(VehicleLoadingGeometryProjectionError::DimensionOverflow(
            part_id.to_owned(),
        ));
    }
    Ok(normalized as u32)
}

fn normalize_near_integer_mm(value: f64) -> f64 {
    let nearest_integer = value.round();
    if (value - nearest_integer).abs() <= GEOMETRY_PROJECTION_EPSILON_MM {
        nearest_integer
    } else {
        value
    }
}

fn obb_is_valid(obb: &GeometryObbMm) -> bool {
    obb.center_mm.iter().all(|value| value.is_finite())
        && obb
            .half_extents_mm
            .iter()
            .all(|value| value.is_finite() && *value > 0.0)
        && axes_are_orthonormal(obb.axes)
}

fn obb_broad_aabb(obb: &GeometryObbMm) -> AabbMm {
    let mut radius_mm = [0.0; 3];
    for axis_index in 0..3 {
        for (world_axis_index, radius) in radius_mm.iter_mut().enumerate() {
            *radius +=
                obb.half_extents_mm[axis_index] * obb.axes[axis_index][world_axis_index].abs();
        }
    }

    AabbMm::from_min_max(
        [
            obb.center_mm[0] - radius_mm[0],
            obb.center_mm[1] - radius_mm[1],
            obb.center_mm[2] - radius_mm[2],
        ],
        [
            obb.center_mm[0] + radius_mm[0],
            obb.center_mm[1] + radius_mm[1],
            obb.center_mm[2] + radius_mm[2],
        ],
    )
}

fn axes_are_orthonormal(axes: [[f64; 3]; 3]) -> bool {
    for axis in axes {
        let length = vector_dot(axis, axis).sqrt();
        if !length.is_finite() || (length - 1.0).abs() > 0.0001 {
            return false;
        }
    }
    for left_index in 0..3 {
        for right_index in (left_index + 1)..3 {
            if vector_dot(axes[left_index], axes[right_index]).abs() > 0.0001 {
                return false;
            }
        }
    }
    true
}

fn vector_dot(left: [f64; 3], right: [f64; 3]) -> f64 {
    left[0] * right[0] + left[1] * right[1] + left[2] * right[2]
}

fn part_kind_label(kind: PartKind) -> &'static str {
    match kind {
        PartKind::Obstacle => "obstacle",
        PartKind::KeepOut => "keepOut",
        PartKind::UsableSpace => "usableSpace",
        PartKind::Door => "door",
        PartKind::Reference => "reference",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::geometry::{CoordinateSystem, GeometryWarning};

    fn geometry_with_parts(parts: Vec<GeometryPart>) -> VehicleGeometry {
        VehicleGeometry {
            schema_version: VEHICLE_GEOMETRY_SCHEMA_VERSION.to_owned(),
            source_format: "glb".to_owned(),
            unit: "mm".to_owned(),
            coordinate_system: CoordinateSystem::default(),
            bounds: AabbMm::from_min_max([0.0, 0.0, 0.0], [1_000.0, 600.0, 500.0]),
            parts,
            warnings: Vec::<GeometryWarning>::new(),
        }
    }

    fn part(id: &str, kind: PartKind, collision: CollisionKind, bounds: AabbMm) -> GeometryPart {
        GeometryPart {
            id: id.to_owned(),
            kind,
            collision,
            bounds,
            obb: None,
            position_mm: [0.0, 0.0, 0.0],
            node_index: 0,
            mesh_index: 0,
            vertex_count: 8,
        }
    }

    fn part_with_obb(id: &str, kind: PartKind, bounds: AabbMm, obb: GeometryObbMm) -> GeometryPart {
        GeometryPart {
            id: id.to_owned(),
            kind,
            collision: CollisionKind::Obb,
            bounds,
            obb: Some(obb),
            position_mm: [0.0, 0.0, 0.0],
            node_index: 0,
            mesh_index: 0,
            vertex_count: 8,
        }
    }

    #[test]
    fn projects_blocking_parts_relative_to_usable_space() {
        let geometry = geometry_with_parts(vec![
            part(
                "cargo-space",
                PartKind::UsableSpace,
                CollisionKind::Aabb,
                AabbMm::from_min_max([100.0, 20.0, 0.0], [1_100.0, 620.0, 500.0]),
            ),
            part(
                "left-wheel-well",
                PartKind::Obstacle,
                CollisionKind::Aabb,
                AabbMm::from_min_max([150.2, 20.0, 0.0], [250.8, 180.0, 160.0]),
            ),
        ]);

        let projection =
            project_vehicle_geometry_to_loading_space(&geometry).expect("geometry should project");

        assert_eq!(
            projection.usable_space,
            DimensionsMm {
                length_mm: 1_000,
                width_mm: 600,
                height_mm: 500,
            }
        );
        assert_eq!(projection.blocked_spaces.len(), 1);
        assert_eq!(
            projection.blocked_spaces[0].origin_mm,
            PositionMm {
                x_mm: 50,
                y_mm: 0,
                z_mm: 0,
            }
        );
        assert_eq!(
            projection.blocked_spaces[0].dimension,
            DimensionsMm {
                length_mm: 101,
                width_mm: 160,
                height_mm: 160,
            }
        );
    }

    #[test]
    fn projects_obb_blocking_parts_relative_to_usable_space() {
        let geometry = geometry_with_parts(vec![
            part(
                "cargo-space",
                PartKind::UsableSpace,
                CollisionKind::Aabb,
                AabbMm::from_min_max([100.0, 20.0, 0.0], [1_100.0, 620.0, 500.0]),
            ),
            part_with_obb(
                "rotated-keep-out",
                PartKind::KeepOut,
                AabbMm::from_min_max([250.0, 100.0, 0.0], [550.0, 400.0, 200.0]),
                GeometryObbMm {
                    center_mm: [400.0, 250.0, 100.0],
                    half_extents_mm: [120.0, 40.0, 100.0],
                    axes: [
                        [0.7071067811865476, 0.7071067811865476, 0.0],
                        [-0.7071067811865476, 0.7071067811865476, 0.0],
                        [0.0, 0.0, 1.0],
                    ],
                },
            ),
        ]);

        let projection =
            project_vehicle_geometry_to_loading_space(&geometry).expect("geometry should project");

        assert_eq!(projection.blocked_spaces.len(), 1);
        let blocked_space = &projection.blocked_spaces[0];
        assert_eq!(blocked_space.kind, "keepOut");
        assert_eq!(
            blocked_space.origin_mm,
            PositionMm {
                x_mm: 150,
                y_mm: 80,
                z_mm: 0,
            }
        );
        assert_eq!(
            blocked_space.dimension,
            DimensionsMm {
                length_mm: 300,
                width_mm: 300,
                height_mm: 200,
            }
        );
        let obb = blocked_space
            .obb
            .as_ref()
            .expect("projected blocked space should keep OBB");
        assert_eq!(obb.center_mm, [300.0, 230.0, 100.0]);
        assert_eq!(obb.half_extents_mm, [120.0, 40.0, 100.0]);
    }

    #[test]
    fn rejects_geometry_without_usable_space() {
        let geometry = geometry_with_parts(vec![part(
            "reference",
            PartKind::Reference,
            CollisionKind::None,
            AabbMm::from_min_max([0.0, 0.0, 0.0], [10.0, 10.0, 10.0]),
        )]);

        let error = project_vehicle_geometry_to_loading_space(&geometry)
            .expect_err("usable-space should be required");

        assert_eq!(
            error,
            VehicleLoadingGeometryProjectionError::UsableSpaceMissing
        );
    }

    #[test]
    fn rejects_blocking_part_outside_usable_space() {
        let geometry = geometry_with_parts(vec![
            part(
                "cargo-space",
                PartKind::UsableSpace,
                CollisionKind::Aabb,
                AabbMm::from_min_max([0.0, 0.0, 0.0], [1_000.0, 600.0, 500.0]),
            ),
            part(
                "outside-obstacle",
                PartKind::Obstacle,
                CollisionKind::Aabb,
                AabbMm::from_min_max([990.0, 0.0, 0.0], [1_020.0, 100.0, 100.0]),
            ),
        ]);

        let error = project_vehicle_geometry_to_loading_space(&geometry)
            .expect_err("outside obstacle should reject geometry");

        assert_eq!(
            error,
            VehicleLoadingGeometryProjectionError::BlockedPartOutsideUsableSpace(
                "outside-obstacle".to_owned()
            )
        );
    }

    #[test]
    fn rejects_obb_when_obb_bounds_escape_usable_space() {
        let geometry = geometry_with_parts(vec![
            part(
                "cargo-space",
                PartKind::UsableSpace,
                CollisionKind::Aabb,
                AabbMm::from_min_max([0.0, 0.0, 0.0], [1_000.0, 600.0, 500.0]),
            ),
            part_with_obb(
                "mismatched-obb",
                PartKind::Obstacle,
                AabbMm::from_min_max([100.0, 100.0, 0.0], [200.0, 200.0, 100.0]),
                GeometryObbMm {
                    center_mm: [990.0, 300.0, 50.0],
                    half_extents_mm: [20.0, 20.0, 50.0],
                    axes: [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]],
                },
            ),
        ]);

        let error = project_vehicle_geometry_to_loading_space(&geometry)
            .expect_err("OBB bounds outside usable-space should be rejected");

        assert_eq!(
            error,
            VehicleLoadingGeometryProjectionError::BlockedPartOutsideUsableSpace(
                "mismatched-obb".to_owned()
            )
        );
    }

    #[test]
    fn normalizes_float_noise_around_integer_millimetres() {
        assert_eq!(
            ceil_non_negative_mm_to_u32("test", 1_200.0000476837158).expect("valid size"),
            1_200
        );
        assert_eq!(
            floor_non_negative_mm_to_u32("test", 1_400.0000476837158).expect("valid position"),
            1_400
        );
        assert_eq!(
            ceil_non_negative_mm_to_u32("test", 100.2).expect("valid size"),
            101
        );
    }
}
