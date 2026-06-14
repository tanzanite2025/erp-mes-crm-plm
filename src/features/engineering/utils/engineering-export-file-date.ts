import { formatEngineeringDateProtocol } from '@/lib/codecs/code-normalization'

export function formatEngineeringExportFileDate(
  date: Date = new Date()
): string {
  return formatEngineeringDateProtocol(date)
}
