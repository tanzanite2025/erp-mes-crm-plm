import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import type {
  VehicleLoadingPlan,
  VehicleLoadingPlanBlockedSpaceInput,
  VehicleLoadingPlanRequest,
} from '../data/vehicle-loading-wasm-plan.types'
import {
  calculate_vehicle_loading_plan,
  diagnose_vehicle_loading_plan_json,
  initSync,
  parse_vehicle_geometry_glb,
  project_vehicle_geometry_to_loading_space_json,
} from '../wasm/pkg/vehicle_loading_engine_wasm.js'

type GoldenExpectation = {
  maxBoxesPerVehicle: number
  boxesPlacedInPreviewVehicle: number
  remainingBoxesAfterPreviewVehicle: number
  vehiclesNeeded: number
  selectedOrientationLabel: string
  blockedPositions: number
  placementPositions: number[][]
  warningCodes: string[]
}

type GoldenFixture = {
  id: string
  description: string
  request: VehicleLoadingPlanRequest
  expected?: GoldenExpectation
  expectedError?: string
}

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../../'
)
const fixtureRoot = path.join(repoRoot, 'vehicle-loading-engine', 'fixtures')
const wasmBinaryPath = path.join(
  repoRoot,
  'src',
  'features',
  'logistics-config',
  'vehicle-loading',
  'wasm',
  'pkg',
  'vehicle_loading_engine_wasm_bg.wasm'
)

function readJsonFixture(fileName: string): GoldenFixture {
  return JSON.parse(
    readFileSync(path.join(fixtureRoot, 'golden', fileName), 'utf8')
  ) as GoldenFixture
}

function parsePlan(output: string): VehicleLoadingPlan {
  return JSON.parse(output) as VehicleLoadingPlan
}

function placementPositions(plan: VehicleLoadingPlan) {
  return plan.placements.map((placement) => [
    placement.positionMm.xMm,
    placement.positionMm.yMm,
    placement.positionMm.zMm,
  ])
}

function hasIntersection(
  leftOrigin: { xMm: number; yMm: number; zMm: number },
  leftDimension: { lengthMm: number; widthMm: number; heightMm: number },
  rightOrigin: { xMm: number; yMm: number; zMm: number },
  rightDimension: { lengthMm: number; widthMm: number; heightMm: number }
) {
  const overlaps = (
    leftStart: number,
    leftSize: number,
    rightStart: number,
    rightSize: number
  ) => leftStart < rightStart + rightSize && leftStart + leftSize > rightStart

  return (
    overlaps(
      leftOrigin.xMm,
      leftDimension.lengthMm,
      rightOrigin.xMm,
      rightDimension.lengthMm
    ) &&
    overlaps(
      leftOrigin.yMm,
      leftDimension.widthMm,
      rightOrigin.yMm,
      rightDimension.widthMm
    ) &&
    overlaps(
      leftOrigin.zMm,
      leftDimension.heightMm,
      rightOrigin.zMm,
      rightDimension.heightMm
    )
  )
}

type TestObb = NonNullable<VehicleLoadingPlanBlockedSpaceInput['obb']>

function dot(left: [number, number, number], right: [number, number, number]) {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2]
}

function placementAsObb(
  placement: VehicleLoadingPlan['placements'][number]
): TestObb {
  return {
    centerMm: [
      placement.positionMm.xMm + placement.dimension.lengthMm / 2,
      placement.positionMm.yMm + placement.dimension.widthMm / 2,
      placement.positionMm.zMm + placement.dimension.heightMm / 2,
    ],
    halfExtentsMm: [
      placement.dimension.lengthMm / 2,
      placement.dimension.widthMm / 2,
      placement.dimension.heightMm / 2,
    ],
    axes: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
  }
}

function obbIntersects(left: TestObb, right: TestObb) {
  const epsilon = 1e-9
  const rotation = Array.from({ length: 3 }, () => [0, 0, 0])
  const absoluteRotation = Array.from({ length: 3 }, () => [0, 0, 0])

  for (let leftIndex = 0; leftIndex < 3; leftIndex += 1) {
    for (let rightIndex = 0; rightIndex < 3; rightIndex += 1) {
      rotation[leftIndex][rightIndex] = dot(
        left.axes[leftIndex],
        right.axes[rightIndex]
      )
      absoluteRotation[leftIndex][rightIndex] =
        Math.abs(rotation[leftIndex][rightIndex]) + epsilon
    }
  }

  const centerDelta: [number, number, number] = [
    right.centerMm[0] - left.centerMm[0],
    right.centerMm[1] - left.centerMm[1],
    right.centerMm[2] - left.centerMm[2],
  ]
  const translatedCenter = [
    dot(centerDelta, left.axes[0]),
    dot(centerDelta, left.axes[1]),
    dot(centerDelta, left.axes[2]),
  ]

  for (let leftIndex = 0; leftIndex < 3; leftIndex += 1) {
    const leftRadius = left.halfExtentsMm[leftIndex]
    const rightRadius = [0, 1, 2]
      .map(
        (rightIndex) =>
          right.halfExtentsMm[rightIndex] *
          absoluteRotation[leftIndex][rightIndex]
      )
      .reduce((sum, value) => sum + value, 0)
    if (
      Math.abs(translatedCenter[leftIndex]) >=
      leftRadius + rightRadius - epsilon
    ) {
      return false
    }
  }

  for (let rightIndex = 0; rightIndex < 3; rightIndex += 1) {
    const leftRadius = [0, 1, 2]
      .map(
        (leftIndex) =>
          left.halfExtentsMm[leftIndex] *
          absoluteRotation[leftIndex][rightIndex]
      )
      .reduce((sum, value) => sum + value, 0)
    const rightRadius = right.halfExtentsMm[rightIndex]
    if (
      Math.abs(dot(centerDelta, right.axes[rightIndex])) >=
      leftRadius + rightRadius - epsilon
    ) {
      return false
    }
  }

  for (let leftIndex = 0; leftIndex < 3; leftIndex += 1) {
    for (let rightIndex = 0; rightIndex < 3; rightIndex += 1) {
      const leftNext = (leftIndex + 1) % 3
      const leftPrevious = (leftIndex + 2) % 3
      const rightNext = (rightIndex + 1) % 3
      const rightPrevious = (rightIndex + 2) % 3
      const leftRadius =
        left.halfExtentsMm[leftNext] *
          absoluteRotation[leftPrevious][rightIndex] +
        left.halfExtentsMm[leftPrevious] *
          absoluteRotation[leftNext][rightIndex]
      const rightRadius =
        right.halfExtentsMm[rightNext] *
          absoluteRotation[leftIndex][rightPrevious] +
        right.halfExtentsMm[rightPrevious] *
          absoluteRotation[leftIndex][rightNext]
      const distance = Math.abs(
        translatedCenter[leftPrevious] * rotation[leftNext][rightIndex] -
          translatedCenter[leftNext] * rotation[leftPrevious][rightIndex]
      )
      if (distance >= leftRadius + rightRadius - epsilon) {
        return false
      }
    }
  }

  return true
}

function hasBlockedSpaceIntersection(
  placement: VehicleLoadingPlan['placements'][number],
  blockedSpace: VehicleLoadingPlanBlockedSpaceInput
) {
  if (blockedSpace.obb) {
    return obbIntersects(placementAsObb(placement), blockedSpace.obb)
  }

  return hasIntersection(
    placement.positionMm,
    placement.dimension,
    blockedSpace.originMm,
    blockedSpace.dimension
  )
}

describe('vehicle loading geometry acceptance', () => {
  beforeAll(() => {
    initSync({ module: readFileSync(wasmBinaryPath) })
  })

  it('runs a real semantic GLB through parser, projection, and WASM packing', () => {
    const glb = readFileSync(path.join(fixtureRoot, 'real-semantic-van.glb'))
    const geometry = JSON.parse(parse_vehicle_geometry_glb(glb)) as {
      schemaVersion: string
      bounds: {
        lengthMm: number
        widthMm: number
        heightMm: number
      }
      parts: Array<{
        id: string
        kind: string
        collision: string
        obb?: TestObb
      }>
    }

    expect(geometry.schemaVersion).toBe('vehicle-geometry.v1')
    expect(geometry.bounds.lengthMm).toBeCloseTo(3000, 5)
    expect(geometry.bounds.widthMm).toBeCloseTo(2000, 5)
    expect(geometry.bounds.heightMm).toBeCloseTo(1200, 3)
    expect(geometry.parts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'cargo-space',
          kind: 'usable-space',
          collision: 'aabb',
        }),
        expect.objectContaining({
          id: 'left-wheel-well',
          kind: 'obstacle',
          collision: 'aabb',
        }),
        expect.objectContaining({
          id: 'right-wheel-well',
          kind: 'obstacle',
          collision: 'aabb',
        }),
        expect.objectContaining({
          id: 'center-keep-out',
          kind: 'keep-out',
          collision: 'aabb',
        }),
        expect.objectContaining({
          id: 'rotated-keep-out',
          kind: 'keep-out',
          collision: 'obb',
          obb: expect.objectContaining({
            centerMm: expect.any(Array),
            halfExtentsMm: expect.any(Array),
            axes: expect.any(Array),
          }),
        }),
      ])
    )
    const rotatedGeometryPart = geometry.parts.find(
      (part) => part.id === 'rotated-keep-out'
    )
    expect(rotatedGeometryPart?.obb?.centerMm[0]).toBeCloseTo(1400, 3)
    expect(rotatedGeometryPart?.obb?.centerMm[1]).toBeCloseTo(1000, 3)
    expect(rotatedGeometryPart?.obb?.halfExtentsMm[0]).toBeCloseTo(100, 3)
    expect(rotatedGeometryPart?.obb?.halfExtentsMm[1]).toBeCloseTo(400, 3)

    const projection = JSON.parse(
      project_vehicle_geometry_to_loading_space_json(JSON.stringify(geometry))
    ) as {
      usableSpace: {
        lengthMm: number
        widthMm: number
        heightMm: number
      }
      blockedSpaces: Array<{
        id: string
        kind: string
        originMm: { xMm: number; yMm: number; zMm: number }
        dimension: { lengthMm: number; widthMm: number; heightMm: number }
        obb?: TestObb
      }>
    }

    expect(projection.usableSpace).toEqual({
      lengthMm: 3000,
      widthMm: 2000,
      heightMm: 1200,
    })
    expect(
      projection.blockedSpaces.map(
        ({ obb: _obb, ...blockedSpace }) => blockedSpace
      )
    ).toEqual([
      {
        id: 'left-wheel-well',
        kind: 'obstacle',
        originMm: { xMm: 0, yMm: 0, zMm: 0 },
        dimension: { lengthMm: 800, widthMm: 600, heightMm: 600 },
      },
      {
        id: 'right-wheel-well',
        kind: 'obstacle',
        originMm: { xMm: 0, yMm: 1400, zMm: 0 },
        dimension: { lengthMm: 800, widthMm: 600, heightMm: 600 },
      },
      {
        id: 'center-keep-out',
        kind: 'keepOut',
        originMm: { xMm: 2000, yMm: 0, zMm: 0 },
        dimension: { lengthMm: 400, widthMm: 2000, heightMm: 400 },
      },
      {
        id: 'rotated-keep-out',
        kind: 'keepOut',
        originMm: { xMm: 1046, yMm: 646, zMm: 0 },
        dimension: { lengthMm: 708, widthMm: 708, heightMm: 600 },
      },
    ])
    const rotatedBlockedSpace = projection.blockedSpaces.find(
      (blockedSpace) => blockedSpace.id === 'rotated-keep-out'
    )
    expect(rotatedBlockedSpace?.obb?.centerMm[0]).toBeCloseTo(1400, 3)
    expect(rotatedBlockedSpace?.obb?.centerMm[1]).toBeCloseTo(1000, 3)
    expect(rotatedBlockedSpace?.obb?.centerMm[2]).toBeCloseTo(300, 3)
    expect(rotatedBlockedSpace?.obb?.halfExtentsMm[0]).toBeCloseTo(100, 3)
    expect(rotatedBlockedSpace?.obb?.halfExtentsMm[1]).toBeCloseTo(400, 3)
    expect(rotatedBlockedSpace?.obb?.halfExtentsMm[2]).toBeCloseTo(300, 3)
    expect(rotatedBlockedSpace?.obb?.axes[0][0]).toBeCloseTo(Math.SQRT1_2, 5)
    expect(rotatedBlockedSpace?.obb?.axes[0][1]).toBeCloseTo(Math.SQRT1_2, 5)
    expect(rotatedBlockedSpace?.obb?.axes[1][0]).toBeCloseTo(-Math.SQRT1_2, 5)
    expect(rotatedBlockedSpace?.obb?.axes[1][1]).toBeCloseTo(Math.SQRT1_2, 5)

    const request: VehicleLoadingPlanRequest = {
      schemaVersion: 'vehicle-loading-request.v1',
      vehicle: {
        id: 'real-semantic-van',
        name: '真实语义车型 GLB',
        usableSpace: projection.usableSpace,
        blockedSpaces: projection.blockedSpaces,
        payloadKg: 1000,
      },
      package: {
        id: 'acceptance-box',
        name: '验收箱',
        quantity: 12,
        unitWeightKg: 20,
        dimension: {
          lengthMm: 1000,
          widthMm: 600,
          heightMm: 600,
        },
        canRotate: false,
        canInvert: false,
      },
    }

    const plan = parsePlan(
      calculate_vehicle_loading_plan(JSON.stringify(request))
    )
    const baseline = parsePlan(
      calculate_vehicle_loading_plan(
        JSON.stringify({
          ...request,
          vehicle: {
            ...request.vehicle,
            blockedSpaces: undefined,
          },
        })
      )
    )

    expect(plan.grid.blockedPositions).toBeGreaterThan(0)
    expect(plan.maxBoxesPerVehicle).toBeLessThan(baseline.maxBoxesPerVehicle)
    expect(plan.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'BLOCKED_SPACE_REDUCED_CAPACITY' }),
      ])
    )
    for (const placement of plan.placements) {
      for (const blockedSpace of projection.blockedSpaces) {
        expect(hasBlockedSpaceIntersection(placement, blockedSpace)).toBe(false)
      }
    }
  })

  const goldenFileNames = readdirSync(path.join(fixtureRoot, 'golden'))
    .filter((fileName) => fileName.endsWith('.json'))
    .sort()

  for (const fileName of goldenFileNames) {
    const fixture = readJsonFixture(fileName)

    it(`matches golden fixture: ${fixture.id}`, () => {
      try {
        const plan = parsePlan(
          calculate_vehicle_loading_plan(JSON.stringify(fixture.request))
        )

        if (fixture.expectedError) {
          const diagnostics = JSON.parse(
            diagnose_vehicle_loading_plan_json(JSON.stringify(fixture.request))
          ) as {
            schemaVersion: string
            failureCode: string
            orientations: Array<{
              reasonCode: string
              candidateAnchorCount: number
            }>
          }
          expect(diagnostics.schemaVersion).toBe('loading-plan-diagnostics.v1')
          expect(diagnostics.failureCode).toBe('PACKAGE_CANNOT_FIT')
          expect(diagnostics.orientations[0]?.candidateAnchorCount).toBe(0)
          throw new Error('expected calculation to fail')
        }
        expect(fixture.expected).toBeDefined()
        expect(plan).toMatchObject({
          maxBoxesPerVehicle: fixture.expected?.maxBoxesPerVehicle,
          boxesPlacedInPreviewVehicle:
            fixture.expected?.boxesPlacedInPreviewVehicle,
          remainingBoxesAfterPreviewVehicle:
            fixture.expected?.remainingBoxesAfterPreviewVehicle,
          vehiclesNeeded: fixture.expected?.vehiclesNeeded,
          selectedOrientation: {
            label: fixture.expected?.selectedOrientationLabel,
          },
          grid: {
            blockedPositions: fixture.expected?.blockedPositions,
          },
        })
        expect(placementPositions(plan)).toEqual(
          fixture.expected?.placementPositions
        )
        expect(plan.warnings.map((warning) => warning.code)).toEqual(
          fixture.expected?.warningCodes
        )
      } catch (error) {
        if (!fixture.expectedError) throw error
        expect(
          error instanceof Error ? error.message : String(error)
        ).toContain(fixture.expectedError)
      }
    })
  }
})
