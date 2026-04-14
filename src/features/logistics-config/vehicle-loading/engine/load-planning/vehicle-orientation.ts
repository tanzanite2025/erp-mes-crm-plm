import type { Orientation, PackageDimension } from './load-planning.types'

function dedupeOrientations(orientations: Orientation[]): Orientation[] {
  const seen = new Set<string>()
  return orientations.filter((item) => {
    const key = `${item.lengthMm}-${item.widthMm}-${item.heightMm}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function getPackageOrientations(dimension: PackageDimension): Orientation[] {
  const { lengthMm, widthMm, heightMm, canRotate } = dimension

  if (!canRotate) {
    return [{ lengthMm, widthMm, heightMm, label: '标准朝向' }]
  }

  return dedupeOrientations([
    { lengthMm, widthMm, heightMm, label: 'L-W-H' },
    { lengthMm, heightMm, widthMm, label: 'L-H-W' },
    { widthMm, lengthMm, heightMm, label: 'W-L-H' },
    { widthMm, heightMm, lengthMm, label: 'W-H-L' },
    { heightMm, lengthMm, widthMm, label: 'H-L-W' },
    { heightMm, widthMm, lengthMm, label: 'H-W-L' },
  ])
}
