use serde::{Deserialize, Serialize};

pub const VEHICLE_GEOMETRY_SCHEMA_VERSION: &str = "vehicle-geometry.v1";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct VehicleGeometry {
    pub schema_version: String,
    pub source_format: String,
    pub unit: String,
    pub coordinate_system: CoordinateSystem,
    pub bounds: AabbMm,
    pub parts: Vec<GeometryPart>,
    pub warnings: Vec<GeometryWarning>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CoordinateSystem {
    pub length_axis: String,
    pub width_axis: String,
    pub height_axis: String,
}

impl Default for CoordinateSystem {
    fn default() -> Self {
        Self {
            length_axis: "x".to_owned(),
            width_axis: "y".to_owned(),
            height_axis: "z".to_owned(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AabbMm {
    pub min_mm: [f64; 3],
    pub max_mm: [f64; 3],
    pub length_mm: f64,
    pub width_mm: f64,
    pub height_mm: f64,
}

impl AabbMm {
    pub fn from_min_max(min_mm: [f64; 3], max_mm: [f64; 3]) -> Self {
        let size = [
            (max_mm[0] - min_mm[0]).max(0.0),
            (max_mm[1] - min_mm[1]).max(0.0),
            (max_mm[2] - min_mm[2]).max(0.0),
        ];
        Self {
            min_mm,
            max_mm,
            length_mm: size[0],
            width_mm: size[1],
            height_mm: size[2],
        }
    }

    pub fn empty() -> Self {
        Self::from_min_max(
            [f64::INFINITY, f64::INFINITY, f64::INFINITY],
            [f64::NEG_INFINITY, f64::NEG_INFINITY, f64::NEG_INFINITY],
        )
    }

    pub fn is_empty(&self) -> bool {
        self.min_mm
            .iter()
            .zip(self.max_mm.iter())
            .any(|(min, max)| !min.is_finite() || !max.is_finite() || min > max)
    }

    pub fn include_point(&mut self, point_mm: [f64; 3]) {
        for (index, value) in point_mm.iter().enumerate() {
            self.min_mm[index] = self.min_mm[index].min(*value);
            self.max_mm[index] = self.max_mm[index].max(*value);
        }
        *self = Self::from_min_max(self.min_mm, self.max_mm);
    }

    pub fn include_aabb(&mut self, other: &Self) {
        if other.is_empty() {
            return;
        }
        self.include_point(other.min_mm);
        self.include_point(other.max_mm);
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct GeometryPart {
    pub id: String,
    pub kind: PartKind,
    pub collision: CollisionKind,
    pub bounds: AabbMm,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub obb: Option<GeometryObbMm>,
    pub position_mm: [f64; 3],
    pub node_index: usize,
    pub mesh_index: usize,
    pub vertex_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct GeometryObbMm {
    pub center_mm: [f64; 3],
    pub half_extents_mm: [f64; 3],
    pub axes: [[f64; 3]; 3],
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum PartKind {
    UsableSpace,
    Obstacle,
    KeepOut,
    Door,
    Reference,
}

impl PartKind {
    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "usable-space" => Some(Self::UsableSpace),
            "obstacle" => Some(Self::Obstacle),
            "keep-out" => Some(Self::KeepOut),
            "door" => Some(Self::Door),
            "reference" => Some(Self::Reference),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum CollisionKind {
    Aabb,
    Obb,
    None,
}

impl CollisionKind {
    pub fn parse(value: Option<&str>, kind: PartKind) -> Option<Self> {
        match value.unwrap_or(if kind == PartKind::Reference {
            "none"
        } else {
            "aabb"
        }) {
            "aabb" => Some(Self::Aabb),
            "obb" => Some(Self::Obb),
            "none" => Some(Self::None),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct GeometryWarning {
    pub code: String,
    pub message: String,
    pub part_id: Option<String>,
}
