import type { Mold } from '../data/schema'

export function groupMoldMasterLibraryRecordsByGroupName(molds: Mold[]) {
  const groups = new Map<string, Mold[]>()
  for (const mold of molds) {
    const groupName = mold.groupName?.trim()
    if (!groupName) continue
    const members = groups.get(groupName) ?? []
    members.push(mold)
    groups.set(groupName, members)
  }
  return [...groups.entries()]
    .map(([name, members]) => ({ name, members }))
    .sort((left, right) => left.name.localeCompare(right.name))
}
