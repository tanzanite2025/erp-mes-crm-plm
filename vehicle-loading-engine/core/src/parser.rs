use crate::geometry::{
    AabbMm, CollisionKind, CoordinateSystem, GeometryObbMm, GeometryPart, PartKind,
    VehicleGeometry, VEHICLE_GEOMETRY_SCHEMA_VERSION,
};
use gltf::mesh::Mode;
use gltf::scene::Node;
use serde_json::Value;
use std::fmt::{Display, Formatter};

const GLB_MAGIC: &[u8; 4] = b"glTF";
const GLB_VERSION: u32 = 2;
const METERS_TO_MILLIMETERS: f64 = 1_000.0;
const MAX_NODE_DEPTH: usize = 64;
const OBB_AFFINE_EPSILON: f32 = 1e-6;
const OBB_AXIS_EPSILON: f64 = 1e-9;
const OBB_ORTHOGONAL_EPSILON: f64 = 0.0001;

#[derive(Debug, Clone, Copy)]
pub struct ParserLimits {
    pub max_file_bytes: usize,
    pub max_buffers: usize,
    pub max_nodes: usize,
    pub max_parts: usize,
    pub max_vertices: usize,
}

impl Default for ParserLimits {
    fn default() -> Self {
        Self {
            max_file_bytes: 8 << 20,
            max_buffers: 1,
            max_nodes: 512,
            max_parts: 256,
            max_vertices: 2_000_000,
        }
    }
}

#[derive(Debug)]
pub enum ParseError {
    InputTooLarge {
        actual: usize,
        maximum: usize,
    },
    NotGlb,
    UnsupportedGlbVersion(u32),
    InvalidDocument(String),
    MissingBinaryChunk,
    ExternalBuffer(String),
    LimitExceeded {
        resource: &'static str,
        actual: usize,
        maximum: usize,
    },
    UnsupportedFeature(&'static str),
    MissingDefaultScene,
    MissingSemantic {
        node_index: usize,
    },
    InvalidSemantic {
        node_index: usize,
        reason: String,
    },
    MissingPositions {
        node_index: usize,
        mesh_index: usize,
        primitive_index: usize,
    },
    UnsupportedPrimitiveMode {
        node_index: usize,
        mesh_index: usize,
        primitive_index: usize,
    },
    InvalidCoordinate {
        node_index: usize,
    },
    InvalidObb {
        node_index: usize,
        reason: String,
    },
    EmptyPart {
        node_index: usize,
    },
    MissingUsableSpace,
}

impl Display for ParseError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InputTooLarge { actual, maximum } => {
                write!(formatter, "GLB 文件大小 {} 超过上限 {}", actual, maximum)
            }
            Self::NotGlb => write!(formatter, "车型模板必须是 GLB 二进制文件"),
            Self::UnsupportedGlbVersion(version) => {
                write!(formatter, "不支持的 GLB 版本 {}", version)
            }
            Self::InvalidDocument(message) => write!(formatter, "GLB 文档无效: {}", message),
            Self::MissingBinaryChunk => write!(formatter, "GLB 缺少内置 BIN 数据块"),
            Self::ExternalBuffer(uri) => write!(formatter, "GLB 禁止外部缓冲资源: {}", uri),
            Self::LimitExceeded {
                resource,
                actual,
                maximum,
            } => write!(
                formatter,
                "{} 数量 {} 超过上限 {}",
                resource, actual, maximum
            ),
            Self::UnsupportedFeature(feature) => {
                write!(formatter, "GLB 使用了不支持的特性: {}", feature)
            }
            Self::MissingDefaultScene => write!(formatter, "GLB 必须声明默认场景"),
            Self::MissingSemantic { node_index } => {
                write!(formatter, "网格节点 {} 缺少 extras.xdfc 语义", node_index)
            }
            Self::InvalidSemantic { node_index, reason } => {
                write!(
                    formatter,
                    "网格节点 {} 的 extras.xdfc 无效: {}",
                    node_index, reason
                )
            }
            Self::MissingPositions {
                node_index,
                mesh_index,
                primitive_index,
            } => write!(
                formatter,
                "节点 {} 的网格 {} 原语 {} 缺少 POSITION",
                node_index, mesh_index, primitive_index
            ),
            Self::UnsupportedPrimitiveMode {
                node_index,
                mesh_index,
                primitive_index,
            } => write!(
                formatter,
                "节点 {} 的网格 {} 原语 {} 不是三角形",
                node_index, mesh_index, primitive_index
            ),
            Self::InvalidCoordinate { node_index } => {
                write!(formatter, "节点 {} 产生了非法坐标", node_index)
            }
            Self::InvalidObb { node_index, reason } => {
                write!(formatter, "节点 {} 的 OBB 无效: {}", node_index, reason)
            }
            Self::EmptyPart { node_index } => write!(formatter, "节点 {} 没有有效几何", node_index),
            Self::MissingUsableSpace => write!(formatter, "GLB 至少需要一个 usable-space 节点"),
        }
    }
}

impl std::error::Error for ParseError {}

pub fn parse_glb(bytes: &[u8], limits: &ParserLimits) -> Result<VehicleGeometry, ParseError> {
    if bytes.len() > limits.max_file_bytes {
        return Err(ParseError::InputTooLarge {
            actual: bytes.len(),
            maximum: limits.max_file_bytes,
        });
    }
    if bytes.len() < 12 || &bytes[..4] != GLB_MAGIC {
        return Err(ParseError::NotGlb);
    }

    let version = u32::from_le_bytes([bytes[4], bytes[5], bytes[6], bytes[7]]);
    if version != GLB_VERSION {
        return Err(ParseError::UnsupportedGlbVersion(version));
    }

    let document = gltf::Gltf::from_slice(bytes)
        .map_err(|error| ParseError::InvalidDocument(error.to_string()))?;
    let blob = document
        .blob
        .as_deref()
        .ok_or(ParseError::MissingBinaryChunk)?;

    let buffers = document.buffers().collect::<Vec<_>>();
    if buffers.len() > limits.max_buffers {
        return Err(ParseError::LimitExceeded {
            resource: "buffer",
            actual: buffers.len(),
            maximum: limits.max_buffers,
        });
    }
    for buffer in &buffers {
        if let gltf::buffer::Source::Uri(uri) = buffer.source() {
            return Err(ParseError::ExternalBuffer(uri.to_owned()));
        }
        if buffer.length() > blob.len() {
            return Err(ParseError::InvalidDocument(format!(
                "buffer {} 超出 BIN 数据块",
                buffer.index()
            )));
        }
    }

    if document.images().next().is_some() {
        return Err(ParseError::UnsupportedFeature("images"));
    }
    if document.animations().next().is_some() {
        return Err(ParseError::UnsupportedFeature("animations"));
    }
    if document.skins().next().is_some() {
        return Err(ParseError::UnsupportedFeature("skins"));
    }

    let nodes = document.nodes().count();
    if nodes > limits.max_nodes {
        return Err(ParseError::LimitExceeded {
            resource: "node",
            actual: nodes,
            maximum: limits.max_nodes,
        });
    }

    let scene = document
        .default_scene()
        .ok_or(ParseError::MissingDefaultScene)?;
    let mut output = VehicleGeometry {
        schema_version: VEHICLE_GEOMETRY_SCHEMA_VERSION.to_owned(),
        source_format: "glb".to_owned(),
        unit: "mm".to_owned(),
        coordinate_system: CoordinateSystem::default(),
        bounds: AabbMm::empty(),
        parts: Vec::new(),
        warnings: Vec::new(),
    };
    let mut vertex_total = 0usize;

    for root in scene.nodes() {
        visit_node(
            root,
            identity_matrix(),
            blob,
            limits,
            &mut vertex_total,
            &mut output,
            0,
        )?;
    }

    if !output
        .parts
        .iter()
        .any(|part| part.kind == PartKind::UsableSpace)
    {
        return Err(ParseError::MissingUsableSpace);
    }
    if output.bounds.is_empty() {
        return Err(ParseError::MissingUsableSpace);
    }

    Ok(output)
}

fn visit_node(
    node: Node<'_>,
    parent_matrix: [[f32; 4]; 4],
    blob: &[u8],
    limits: &ParserLimits,
    vertex_total: &mut usize,
    output: &mut VehicleGeometry,
    depth: usize,
) -> Result<(), ParseError> {
    if depth > MAX_NODE_DEPTH {
        return Err(ParseError::LimitExceeded {
            resource: "node depth",
            actual: depth,
            maximum: MAX_NODE_DEPTH,
        });
    }

    let world_matrix = multiply_matrix(parent_matrix, node.transform().matrix());
    if let Some(mesh) = node.mesh() {
        if output.parts.len() >= limits.max_parts {
            return Err(ParseError::LimitExceeded {
                resource: "geometry part",
                actual: output.parts.len() + 1,
                maximum: limits.max_parts,
            });
        }

        let (kind, collision) = parse_semantic(&node)?;
        let mut bounds = AabbMm::empty();
        let mut local_min_m = [f64::INFINITY, f64::INFINITY, f64::INFINITY];
        let mut local_max_m = [f64::NEG_INFINITY, f64::NEG_INFINITY, f64::NEG_INFINITY];
        let mut node_vertex_count = 0usize;

        for primitive in mesh.primitives() {
            if primitive.mode() != Mode::Triangles {
                return Err(ParseError::UnsupportedPrimitiveMode {
                    node_index: node.index(),
                    mesh_index: mesh.index(),
                    primitive_index: primitive.index(),
                });
            }
            let reader = primitive.reader(|buffer| {
                if buffer.index() == 0 {
                    Some(blob)
                } else {
                    None
                }
            });
            let positions = reader
                .read_positions()
                .ok_or(ParseError::MissingPositions {
                    node_index: node.index(),
                    mesh_index: mesh.index(),
                    primitive_index: primitive.index(),
                })?;
            let mut primitive_vertices = 0usize;
            for position in positions {
                primitive_vertices += 1;
                node_vertex_count += 1;
                *vertex_total += 1;
                if *vertex_total > limits.max_vertices {
                    return Err(ParseError::LimitExceeded {
                        resource: "vertex",
                        actual: *vertex_total,
                        maximum: limits.max_vertices,
                    });
                }
                include_local_point(&mut local_min_m, &mut local_max_m, position);
                let transformed = transform_point(world_matrix, position);
                if transformed.iter().any(|value| !value.is_finite()) {
                    return Err(ParseError::InvalidCoordinate {
                        node_index: node.index(),
                    });
                }
                bounds.include_point([
                    transformed[0] as f64 * METERS_TO_MILLIMETERS,
                    transformed[1] as f64 * METERS_TO_MILLIMETERS,
                    transformed[2] as f64 * METERS_TO_MILLIMETERS,
                ]);
            }
            if primitive_vertices == 0 {
                return Err(ParseError::EmptyPart {
                    node_index: node.index(),
                });
            }
        }

        if bounds.is_empty() {
            return Err(ParseError::EmptyPart {
                node_index: node.index(),
            });
        }

        let id = node
            .name()
            .filter(|name| !name.trim().is_empty())
            .map(str::to_owned)
            .unwrap_or_else(|| format!("node-{}", node.index()));
        let obb = if collision == CollisionKind::Obb {
            Some(derive_obb_from_local_bounds(
                node.index(),
                world_matrix,
                local_min_m,
                local_max_m,
            )?)
        } else {
            None
        };
        let position_mm = bounds.min_mm;
        output.bounds.include_aabb(&bounds);
        output.parts.push(GeometryPart {
            id,
            kind,
            collision,
            bounds,
            obb,
            position_mm,
            node_index: node.index(),
            mesh_index: mesh.index(),
            vertex_count: node_vertex_count,
        });
    }

    for child in node.children() {
        visit_node(
            child,
            world_matrix,
            blob,
            limits,
            vertex_total,
            output,
            depth + 1,
        )?;
    }
    Ok(())
}

fn parse_semantic(node: &Node<'_>) -> Result<(PartKind, CollisionKind), ParseError> {
    let value =
        serde_json::to_value(node.extras()).map_err(|error| ParseError::InvalidSemantic {
            node_index: node.index(),
            reason: error.to_string(),
        })?;
    let xdfc = value
        .get("xdfc")
        .and_then(Value::as_object)
        .ok_or(ParseError::MissingSemantic {
            node_index: node.index(),
        })?;
    let kind_value =
        xdfc.get("kind")
            .and_then(Value::as_str)
            .ok_or_else(|| ParseError::InvalidSemantic {
                node_index: node.index(),
                reason: "kind 必须是字符串".to_owned(),
            })?;
    let kind = PartKind::parse(kind_value).ok_or_else(|| ParseError::InvalidSemantic {
        node_index: node.index(),
        reason: format!("不支持的 kind: {}", kind_value),
    })?;
    let collision_value = xdfc.get("collision").and_then(Value::as_str);
    let collision =
        CollisionKind::parse(collision_value, kind).ok_or_else(|| ParseError::InvalidSemantic {
            node_index: node.index(),
            reason: "collision 必须是 aabb、obb 或 none".to_owned(),
        })?;
    Ok((kind, collision))
}

fn include_local_point(local_min_m: &mut [f64; 3], local_max_m: &mut [f64; 3], point: [f32; 3]) {
    for (index, value) in point.iter().enumerate() {
        let value = *value as f64;
        local_min_m[index] = local_min_m[index].min(value);
        local_max_m[index] = local_max_m[index].max(value);
    }
}

fn derive_obb_from_local_bounds(
    node_index: usize,
    world_matrix: [[f32; 4]; 4],
    local_min_m: [f64; 3],
    local_max_m: [f64; 3],
) -> Result<GeometryObbMm, ParseError> {
    if !matrix_is_affine(world_matrix) {
        return Err(ParseError::InvalidObb {
            node_index,
            reason: "collision=obb 只支持仿射节点矩阵".to_owned(),
        });
    }

    let mut local_center_m = [0.0; 3];
    let mut local_half_extents_m = [0.0; 3];
    for index in 0..3 {
        if !local_min_m[index].is_finite()
            || !local_max_m[index].is_finite()
            || local_max_m[index] <= local_min_m[index]
        {
            return Err(ParseError::InvalidObb {
                node_index,
                reason: "本地网格包围盒必须在三个方向都有正尺寸".to_owned(),
            });
        }
        local_center_m[index] = (local_min_m[index] + local_max_m[index]) / 2.0;
        local_half_extents_m[index] = (local_max_m[index] - local_min_m[index]) / 2.0;
    }

    let mut axes = [[0.0; 3]; 3];
    let mut half_extents_mm = [0.0; 3];
    for axis_index in 0..3 {
        let basis = matrix_basis_axis(world_matrix, axis_index);
        let length = vector_length(basis);
        if !length.is_finite() || length <= OBB_AXIS_EPSILON {
            return Err(ParseError::InvalidObb {
                node_index,
                reason: "节点变换包含零长度轴".to_owned(),
            });
        }
        axes[axis_index] = [basis[0] / length, basis[1] / length, basis[2] / length];
        half_extents_mm[axis_index] =
            local_half_extents_m[axis_index] * length * METERS_TO_MILLIMETERS;
        if !half_extents_mm[axis_index].is_finite() || half_extents_mm[axis_index] <= 0.0 {
            return Err(ParseError::InvalidObb {
                node_index,
                reason: "半长轴必须是大于 0 的有限毫米值".to_owned(),
            });
        }
    }

    for left_index in 0..3 {
        for right_index in (left_index + 1)..3 {
            if vector_dot(axes[left_index], axes[right_index]).abs() > OBB_ORTHOGONAL_EPSILON {
                return Err(ParseError::InvalidObb {
                    node_index,
                    reason: "collision=obb 不支持剪切或非正交节点变换".to_owned(),
                });
            }
        }
    }

    let center_m = transform_point_f64(world_matrix, local_center_m);
    if center_m.iter().any(|value| !value.is_finite()) {
        return Err(ParseError::InvalidObb {
            node_index,
            reason: "中心点必须是有限毫米值".to_owned(),
        });
    }

    Ok(GeometryObbMm {
        center_mm: [
            center_m[0] * METERS_TO_MILLIMETERS,
            center_m[1] * METERS_TO_MILLIMETERS,
            center_m[2] * METERS_TO_MILLIMETERS,
        ],
        half_extents_mm,
        axes,
    })
}

fn matrix_is_affine(matrix: [[f32; 4]; 4]) -> bool {
    matrix[0][3].abs() <= OBB_AFFINE_EPSILON
        && matrix[1][3].abs() <= OBB_AFFINE_EPSILON
        && matrix[2][3].abs() <= OBB_AFFINE_EPSILON
        && (matrix[3][3] - 1.0).abs() <= OBB_AFFINE_EPSILON
}

fn matrix_basis_axis(matrix: [[f32; 4]; 4], axis_index: usize) -> [f64; 3] {
    [
        matrix[axis_index][0] as f64,
        matrix[axis_index][1] as f64,
        matrix[axis_index][2] as f64,
    ]
}

fn vector_dot(left: [f64; 3], right: [f64; 3]) -> f64 {
    left[0] * right[0] + left[1] * right[1] + left[2] * right[2]
}

fn vector_length(vector: [f64; 3]) -> f64 {
    vector_dot(vector, vector).sqrt()
}

fn identity_matrix() -> [[f32; 4]; 4] {
    [
        [1.0, 0.0, 0.0, 0.0],
        [0.0, 1.0, 0.0, 0.0],
        [0.0, 0.0, 1.0, 0.0],
        [0.0, 0.0, 0.0, 1.0],
    ]
}

fn multiply_matrix(left: [[f32; 4]; 4], right: [[f32; 4]; 4]) -> [[f32; 4]; 4] {
    let mut result = [[0.0; 4]; 4];
    for column in 0..4 {
        for row in 0..4 {
            result[column][row] = (0..4)
                .map(|index| left[index][row] * right[column][index])
                .sum();
        }
    }
    result
}

fn transform_point(matrix: [[f32; 4]; 4], point: [f32; 3]) -> [f32; 3] {
    let x =
        matrix[0][0] * point[0] + matrix[1][0] * point[1] + matrix[2][0] * point[2] + matrix[3][0];
    let y =
        matrix[0][1] * point[0] + matrix[1][1] * point[1] + matrix[2][1] * point[2] + matrix[3][1];
    let z =
        matrix[0][2] * point[0] + matrix[1][2] * point[1] + matrix[2][2] * point[2] + matrix[3][2];
    let w =
        matrix[0][3] * point[0] + matrix[1][3] * point[1] + matrix[2][3] * point[2] + matrix[3][3];
    if w.abs() > f32::EPSILON && (w - 1.0).abs() > f32::EPSILON {
        [x / w, y / w, z / w]
    } else {
        [x, y, z]
    }
}

fn transform_point_f64(matrix: [[f32; 4]; 4], point: [f64; 3]) -> [f64; 3] {
    let x = matrix[0][0] as f64 * point[0]
        + matrix[1][0] as f64 * point[1]
        + matrix[2][0] as f64 * point[2]
        + matrix[3][0] as f64;
    let y = matrix[0][1] as f64 * point[0]
        + matrix[1][1] as f64 * point[1]
        + matrix[2][1] as f64 * point[2]
        + matrix[3][1] as f64;
    let z = matrix[0][2] as f64 * point[0]
        + matrix[1][2] as f64 * point[1]
        + matrix[2][2] as f64 * point[2]
        + matrix[3][2] as f64;
    [x, y, z]
}

#[cfg(test)]
mod tests {
    use super::*;

    fn minimal_glb(extras: Option<&str>) -> Vec<u8> {
        minimal_glb_with_node_fields(extras, "")
    }

    fn minimal_glb_with_node_fields(extras: Option<&str>, node_fields: &str) -> Vec<u8> {
        let positions: [[f32; 3]; 8] = [
            [0.0, 0.0, 0.0],
            [1.0, 0.0, 0.0],
            [0.0, 2.0, 0.0],
            [1.0, 2.0, 0.0],
            [0.0, 0.0, 3.0],
            [1.0, 0.0, 3.0],
            [0.0, 2.0, 3.0],
            [1.0, 2.0, 3.0],
        ];
        let mut bin = Vec::with_capacity(positions.len() * 12);
        for position in positions {
            for value in position {
                bin.extend_from_slice(&value.to_le_bytes());
            }
        }
        let extras = extras.unwrap_or(r#""#);
        let extras_field = if extras.is_empty() {
            String::new()
        } else {
            format!(r#", "extras":{}"#, extras)
        };
        let node_fields = if node_fields.is_empty() {
            String::new()
        } else {
            format!(", {}", node_fields)
        };
        let json = format!(
            r#"{{"asset":{{"version":"2.0"}},"scene":0,"scenes":[{{"nodes":[0]}}],"nodes":[{{"name":"cargo-floor","mesh":0{extras_field}{node_fields}}}],"meshes":[{{"primitives":[{{"attributes":{{"POSITION":0}}}}]}}],"buffers":[{{"byteLength":{}}}],"bufferViews":[{{"buffer":0,"byteOffset":0,"byteLength":96}}],"accessors":[{{"bufferView":0,"componentType":5126,"count":8,"type":"VEC3","min":[0,0,0],"max":[1,2,3]}}]}}"#,
            bin.len()
        );
        let mut json_bytes = json.into_bytes();
        while json_bytes.len() % 4 != 0 {
            json_bytes.push(b' ');
        }
        while bin.len() % 4 != 0 {
            bin.push(0);
        }
        let total_length = 12 + 8 + json_bytes.len() + 8 + bin.len();
        let mut glb = Vec::with_capacity(total_length);
        glb.extend_from_slice(GLB_MAGIC);
        glb.extend_from_slice(&GLB_VERSION.to_le_bytes());
        glb.extend_from_slice(&(total_length as u32).to_le_bytes());
        glb.extend_from_slice(&(json_bytes.len() as u32).to_le_bytes());
        glb.extend_from_slice(b"JSON");
        glb.extend_from_slice(&json_bytes);
        glb.extend_from_slice(&(bin.len() as u32).to_le_bytes());
        glb.extend_from_slice(b"BIN\0");
        glb.extend_from_slice(&bin);
        glb
    }

    #[test]
    fn parses_semantic_glb_into_millimetre_bounds() {
        let bytes = minimal_glb(Some(
            r#"{"xdfc":{"kind":"usable-space","collision":"aabb"}}"#,
        ));
        let geometry = parse_glb(&bytes, &ParserLimits::default()).expect("GLB should parse");
        assert_eq!(geometry.schema_version, VEHICLE_GEOMETRY_SCHEMA_VERSION);
        assert_eq!(geometry.parts.len(), 1);
        assert_eq!(geometry.parts[0].bounds.length_mm, 1000.0);
        assert_eq!(geometry.parts[0].bounds.width_mm, 2000.0);
        assert_eq!(geometry.parts[0].bounds.height_mm, 3000.0);
    }

    #[test]
    fn serializes_vehicle_geometry_protocol_as_camel_case_json() {
        let bytes = minimal_glb(Some(
            r#"{"xdfc":{"kind":"usable-space","collision":"aabb"}}"#,
        ));
        let geometry = parse_glb(&bytes, &ParserLimits::default()).expect("GLB should parse");
        let json = serde_json::to_value(&geometry).expect("geometry should serialize");

        assert!(json.get("schemaVersion").is_some());
        assert!(json.get("sourceFormat").is_some());
        assert!(json.get("coordinateSystem").is_some());
        assert!(json["bounds"].get("lengthMm").is_some());
        assert!(json["parts"][0].get("positionMm").is_some());
        assert!(json.get("schema_version").is_none());
        assert!(json["bounds"].get("length_mm").is_none());
        assert!(json["parts"][0].get("obb").is_none());
    }

    #[test]
    fn parses_obb_semantic_from_node_transform() {
        let bytes = minimal_glb_with_node_fields(
            Some(r#"{"xdfc":{"kind":"usable-space","collision":"obb"}}"#),
            r#""matrix":[0,1,0,0,-1,0,0,0,0,0,1,0,2,0,0,1]"#,
        );
        let geometry = parse_glb(&bytes, &ParserLimits::default()).expect("GLB should parse");
        let part = &geometry.parts[0];

        assert_eq!(part.collision, CollisionKind::Obb);
        assert!((part.bounds.length_mm - 2_000.0).abs() < 0.0001);
        let obb = part.obb.as_ref().expect("OBB metadata should be present");
        assert!((obb.center_mm[0] - 1_000.0).abs() < 0.0001);
        assert!((obb.center_mm[1] - 500.0).abs() < 0.0001);
        assert!((obb.center_mm[2] - 1_500.0).abs() < 0.0001);
        assert_eq!(obb.half_extents_mm, [500.0, 1_000.0, 1_500.0]);
        assert_eq!(
            obb.axes,
            [[0.0, 1.0, 0.0], [-1.0, 0.0, 0.0], [0.0, 0.0, 1.0]]
        );

        let json = serde_json::to_value(&geometry).expect("geometry should serialize");
        assert!(json["parts"][0].get("obb").is_some());
        assert!(json["parts"][0]["obb"].get("halfExtentsMm").is_some());
    }

    #[test]
    fn rejects_sheared_obb_node_transform() {
        let bytes = minimal_glb_with_node_fields(
            Some(r#"{"xdfc":{"kind":"usable-space","collision":"obb"}}"#),
            r#""matrix":[1,0,0,0,1,1,0,0,0,0,1,0,0,0,0,1]"#,
        );
        let error =
            parse_glb(&bytes, &ParserLimits::default()).expect_err("shear should be rejected");

        assert!(matches!(
            error,
            ParseError::InvalidObb { node_index: 0, .. }
        ));
    }

    #[test]
    fn rejects_mesh_without_semantic_metadata() {
        let bytes = minimal_glb(None);
        let error = parse_glb(&bytes, &ParserLimits::default()).expect_err("semantic is required");
        assert!(matches!(
            error,
            ParseError::MissingSemantic { node_index: 0 }
        ));
    }

    #[test]
    fn rejects_non_glb_input() {
        let error = parse_glb(br#"{"asset":{"version":"2.0"}}"#, &ParserLimits::default())
            .expect_err("only GLB is supported");
        assert!(matches!(error, ParseError::NotGlb));
    }
}
