import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptPath = fileURLToPath(import.meta.url)
const repoRoot = path.resolve(path.dirname(scriptPath), '..')
const outputPath = path.join(
  repoRoot,
  'vehicle-loading-engine',
  'fixtures',
  'real-semantic-van.glb'
)
const SQRT_1_2 = Math.SQRT1_2

const parts = [
  {
    name: 'cargo-space',
    kind: 'usable-space',
    collision: 'aabb',
    min: [0, 0, 0],
    max: [3, 2, 1.2],
  },
  {
    name: 'left-wheel-well',
    kind: 'obstacle',
    collision: 'aabb',
    min: [0, 0, 0],
    max: [0.8, 0.6, 0.6],
  },
  {
    name: 'right-wheel-well',
    kind: 'obstacle',
    collision: 'aabb',
    min: [0, 1.4, 0],
    max: [0.8, 2, 0.6],
  },
  {
    name: 'center-keep-out',
    kind: 'keep-out',
    collision: 'aabb',
    min: [2, 0, 0],
    max: [2.4, 2, 0.4],
  },
  {
    name: 'rotated-keep-out',
    kind: 'keep-out',
    collision: 'obb',
    min: [-0.1, -0.4, 0],
    max: [0.1, 0.4, 0.6],
    matrix: [
      SQRT_1_2,
      SQRT_1_2,
      0,
      0,
      -SQRT_1_2,
      SQRT_1_2,
      0,
      0,
      0,
      0,
      1,
      0,
      1.4,
      1,
      0,
      1,
    ],
  },
]

function cubeVertices(min, max) {
  return [
    [min[0], min[1], min[2]],
    [max[0], min[1], min[2]],
    [min[0], max[1], min[2]],
    [max[0], max[1], min[2]],
    [min[0], min[1], max[2]],
    [max[0], min[1], max[2]],
    [min[0], max[1], max[2]],
    [max[0], max[1], max[2]],
  ]
}

const vertexValues = parts.flatMap((part) =>
  cubeVertices(part.min, part.max).flat()
)
const binary = Buffer.alloc(vertexValues.length * Float32Array.BYTES_PER_ELEMENT)
for (let index = 0; index < vertexValues.length; index += 1) {
  binary.writeFloatLE(vertexValues[index], index * Float32Array.BYTES_PER_ELEMENT)
}

const bufferViews = parts.map((_, index) => ({
  buffer: 0,
  byteOffset: index * 96,
  byteLength: 96,
}))

const accessors = parts.map((part, index) => ({
  bufferView: index,
  componentType: 5126,
  count: 8,
  type: 'VEC3',
  min: part.min,
  max: part.max,
}))

const document = {
  asset: {
    version: '2.0',
    generator: 'xdfc-vehicle-loading-acceptance-fixture',
  },
  scene: 0,
  scenes: [{ nodes: parts.map((_, index) => index) }],
  nodes: parts.map((part, index) => ({
    name: part.name,
    mesh: index,
    ...(part.matrix ? { matrix: part.matrix } : {}),
    extras: {
      xdfc: {
        kind: part.kind,
        collision: part.collision,
      },
    },
  })),
  meshes: parts.map((_, index) => ({
    primitives: [
      {
        attributes: { POSITION: index },
      },
    ],
  })),
  buffers: [{ byteLength: binary.length }],
  bufferViews,
  accessors,
}

const json = Buffer.from(JSON.stringify(document))
const paddedJson = Buffer.concat([
  json,
  Buffer.alloc((4 - (json.length % 4)) % 4, 0x20),
])
const paddedBinary = Buffer.concat([
  binary,
  Buffer.alloc((4 - (binary.length % 4)) % 4),
])
const totalLength = 12 + 8 + paddedJson.length + 8 + paddedBinary.length
const header = Buffer.alloc(12)
header.write('glTF', 0, 'ascii')
header.writeUInt32LE(2, 4)
header.writeUInt32LE(totalLength, 8)

const jsonChunkHeader = Buffer.alloc(8)
jsonChunkHeader.writeUInt32LE(paddedJson.length, 0)
jsonChunkHeader.write('JSON', 4, 'ascii')

const binaryChunkHeader = Buffer.alloc(8)
binaryChunkHeader.writeUInt32LE(paddedBinary.length, 0)
binaryChunkHeader.write('BIN\0', 4, 'ascii')

mkdirSync(path.dirname(outputPath), { recursive: true })
writeFileSync(
  outputPath,
  Buffer.concat([
    header,
    jsonChunkHeader,
    paddedJson,
    binaryChunkHeader,
    paddedBinary,
  ])
)
console.log(`Vehicle loading acceptance GLB generated at ${outputPath}`)
