export type PackagingCalculationStrategy = 'min_box_count'

export interface PackagingCalculationProfileInput {
  profileId: string
  profileName: string
  capacity: number
  netWeight: number
  length: number
  width: number
  height: number
  dimensionUnitCode: string
  weightUnitCode: string
}

export interface PackagingCalculationInput {
  orderedQuantity: number
  productWeight: number
  profiles: PackagingCalculationProfileInput[]
  strategy?: PackagingCalculationStrategy
}

export interface PackagingCalculationLine {
  profileId: string
  profileName: string
  capacity: number
  boxCount: number
  packedQuantity: number
  remainderQuantityAfterAllocation: number
  isTailBox: boolean
  volumePerBox: number
  grossWeightPerBox: number
  totalVolume: number
  totalGrossWeight: number
  dimensionUnitCode: string
  weightUnitCode: string
}

export interface PackagingCalculationResult {
  strategy: PackagingCalculationStrategy
  lines: PackagingCalculationLine[]
  packedQuantity: number
  remainderQuantity: number
  boxCount: number
  totalVolume: number
  totalGrossWeight: number
  isExactMatch: boolean
  warnings: string[]
}

function normalizeNumber(value: number): number {
  if (!Number.isFinite(value)) return 0
  return value
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0
}

function calculateVolume(profile: PackagingCalculationProfileInput): number {
  return normalizeNumber(profile.length) * normalizeNumber(profile.width) * normalizeNumber(profile.height)
}

function buildLine(
  profile: PackagingCalculationProfileInput,
  boxCount: number,
  packedQuantity: number,
  remainderQuantityAfterAllocation: number,
  isTailBox: boolean,
  productWeight: number
): PackagingCalculationLine {
  const volumePerBox = calculateVolume(profile)
  const grossWeightPerBox = normalizeNumber(profile.netWeight) + normalizeNumber(productWeight) * normalizeNumber(profile.capacity)

  return {
    profileId: profile.profileId,
    profileName: profile.profileName,
    capacity: profile.capacity,
    boxCount,
    packedQuantity,
    remainderQuantityAfterAllocation,
    isTailBox,
    volumePerBox,
    grossWeightPerBox,
    totalVolume: volumePerBox * boxCount,
    totalGrossWeight: grossWeightPerBox * boxCount,
    dimensionUnitCode: profile.dimensionUnitCode,
    weightUnitCode: profile.weightUnitCode,
  }
}

function validateProfiles(profiles: PackagingCalculationProfileInput[]): {
  validProfiles: PackagingCalculationProfileInput[]
  warnings: string[]
} {
  const warnings: string[] = []

  if (profiles.length === 0) {
    warnings.push('No packaging profiles provided.')
    return { validProfiles: [], warnings }
  }

  const dimensionUnits = new Set<string>()
  const weightUnits = new Set<string>()
  const validProfiles: PackagingCalculationProfileInput[] = []

  profiles.forEach((profile) => {
    if (!isPositiveInteger(profile.capacity)) {
      warnings.push(`Packaging profile ${profile.profileName} has invalid capacity and was ignored.`)
      return
    }

    dimensionUnits.add(profile.dimensionUnitCode)
    weightUnits.add(profile.weightUnitCode)
    validProfiles.push(profile)
  })

  if (dimensionUnits.size > 1) {
    warnings.push('Packaging profiles use inconsistent dimension units.')
  }

  if (weightUnits.size > 1) {
    warnings.push('Packaging profiles use inconsistent weight units.')
  }

  return { validProfiles, warnings }
}

export function calculatePackagingPlan(
  input: PackagingCalculationInput
): PackagingCalculationResult {
  const strategy = input.strategy ?? 'min_box_count'
  const warnings: string[] = []
  const orderedQuantity = Math.max(0, Math.floor(normalizeNumber(input.orderedQuantity)))
  const productWeight = Math.max(0, normalizeNumber(input.productWeight))

  if (orderedQuantity === 0) {
    return {
      strategy,
      lines: [],
      packedQuantity: 0,
      remainderQuantity: 0,
      boxCount: 0,
      totalVolume: 0,
      totalGrossWeight: 0,
      isExactMatch: true,
      warnings,
    }
  }

  const { validProfiles, warnings: profileWarnings } = validateProfiles(input.profiles)
  warnings.push(...profileWarnings)

  if (validProfiles.length === 0) {
    return {
      strategy,
      lines: [],
      packedQuantity: 0,
      remainderQuantity: orderedQuantity,
      boxCount: 0,
      totalVolume: 0,
      totalGrossWeight: 0,
      isExactMatch: false,
      warnings,
    }
  }

  const sortedProfiles = [...validProfiles].sort((left, right) => {
    if (right.capacity !== left.capacity) return right.capacity - left.capacity
    return left.profileName.localeCompare(right.profileName)
  })

  let remainingQuantity = orderedQuantity
  const lines: PackagingCalculationLine[] = []

  sortedProfiles.forEach((profile, index) => {
    if (remainingQuantity <= 0) return

    const isLastProfile = index === sortedProfiles.length - 1
    const boxCount = isLastProfile
      ? Math.floor(remainingQuantity / profile.capacity)
      : Math.floor(remainingQuantity / profile.capacity)

    if (boxCount <= 0) return

    const packedQuantity = boxCount * profile.capacity
    remainingQuantity -= packedQuantity

    lines.push(buildLine(profile, boxCount, packedQuantity, remainingQuantity, false, productWeight))
  })

  const packedQuantity = orderedQuantity - remainingQuantity
  const boxCount = lines.reduce((sum, line) => sum + line.boxCount, 0)
  const totalVolume = lines.reduce((sum, line) => sum + line.totalVolume, 0)
  const totalGrossWeight = lines.reduce((sum, line) => sum + line.totalGrossWeight, 0)

  if (remainingQuantity > 0) {
    warnings.push('Remaining quantity could not be packed exactly with current packaging profiles.')
  }

  return {
    strategy,
    lines,
    packedQuantity,
    remainderQuantity: remainingQuantity,
    boxCount,
    totalVolume,
    totalGrossWeight,
    isExactMatch: remainingQuantity === 0,
    warnings,
  }
}

export function calculatePackagingPreviewForSingleProfile(args: {
  orderedQuantity: number
  productWeight: number
  profile: PackagingCalculationProfileInput
}): PackagingCalculationResult {
  return calculatePackagingPlan({
    orderedQuantity: args.orderedQuantity,
    productWeight: args.productWeight,
    profiles: [args.profile],
    strategy: 'min_box_count',
  })
}
