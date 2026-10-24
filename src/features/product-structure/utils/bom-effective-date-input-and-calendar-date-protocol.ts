/** Parse year-first user input without Date's automatic rollover or timezone conversion. */
export function parseBOMEffectiveDateInputToDateProtocol(
  value: string
): string | null {
  const text = value.trim()
  if (!text) return ''
  const separated = /^(\d{4})([-/])(\d{1,2})\2(\d{1,2})$/.exec(text)
  const compact = /^(\d{4})(\d{2})(\d{2})$/.exec(text)
  if (!separated && !compact) return null

  const year = Number(separated?.[1] ?? compact![1])
  const month = Number(separated?.[3] ?? compact![2])
  const day = Number(separated?.[4] ?? compact![3])
  if (year < 1 || month < 1 || month > 12 || day < 1) return null
  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const daysInMonth = [
    31,
    isLeapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ]
  if (day > daysInMonth[month - 1]) return null

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Calendar dates are local wall dates; never parse date-only text as UTC. */
export function getBOMEffectiveDateCalendarSelection(
  value?: string | null
): Date | undefined {
  const protocolDate = parseBOMEffectiveDateInputToDateProtocol(value ?? '')
  if (!protocolDate) return undefined
  const [year, month, day] = protocolDate.split('-').map(Number)
  const date = new Date(0)
  date.setHours(0, 0, 0, 0)
  date.setFullYear(year, month - 1, day)
  return date
}

/** API responses carry RFC3339 timestamps; retain their declared calendar date. */
export function mapBOMEffectiveDateAPIValueToDateProtocol(
  value: unknown
): unknown {
  if (typeof value !== 'string') return value
  const timestamp =
    /^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.exec(
      value
    )
  return timestamp
    ? (parseBOMEffectiveDateInputToDateProtocol(timestamp[1]) ?? value)
    : value
}
