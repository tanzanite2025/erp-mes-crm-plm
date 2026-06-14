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

export function getPackageOrientations(
  dimension: PackageDimension
): Orientation[] {
  const { lengthMm, widthMm, heightMm, canRotate, canInvert } = dimension

  if (!canRotate) {
    return [{ lengthMm, widthMm, heightMm, label: '标准朝向' }]
  }

  if (!canInvert) {
    return dedupeOrientations([
      { lengthMm, widthMm, heightMm, label: 'L-W-H' },
      { lengthMm: widthMm, widthMm: lengthMm, heightMm, label: 'W-L-H' },
    ])
  }

  return dedupeOrientations([
    { lengthMm, widthMm, heightMm, label: 'L-W-H' },
    { lengthMm, widthMm: heightMm, heightMm: widthMm, label: 'L-H-W' },
    { lengthMm: widthMm, widthMm: lengthMm, heightMm, label: 'W-L-H' },
    {
      lengthMm: widthMm,
      widthMm: heightMm,
      heightMm: lengthMm,
      label: 'W-H-L',
    },
    {
      lengthMm: heightMm,
      widthMm: lengthMm,
      heightMm: widthMm,
      label: 'H-L-W',
    },
    { lengthMm: heightMm, widthMm, heightMm: lengthMm, label: 'H-W-L' },
  ])
}
