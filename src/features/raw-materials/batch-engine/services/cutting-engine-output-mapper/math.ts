export function round(value: number, digits = 3) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function percent(value: number, total: number) {
  if (total <= 0) return 0
  return round((value / total) * 100, 3)
}
