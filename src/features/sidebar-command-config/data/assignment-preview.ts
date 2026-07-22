import type { SidebarCommandCategoryDto } from '../services'
import type { PresentedSidebarCommand } from '../types'

export type AssignmentPreviewCommand = PresentedSidebarCommand & {
  assignmentSource: 'category' | 'direct'
  sourceCategoryName?: string
}

export function buildSidebarCommandAssignmentPreview({
  commands,
  categoryIds,
  commandIds,
  categories,
}: {
  commands: PresentedSidebarCommand[]
  categoryIds: string[]
  commandIds: string[]
  categories: SidebarCommandCategoryDto[]
}): AssignmentPreviewCommand[] {
  const selectedCategories = new Set(categoryIds)
  const commandById = new Map(
    commands.map((command) => [command.code, command])
  )
  const categoryNameById = new Map(
    categories.map((category) => [category.categoryId, category.name])
  )
  const seen = new Set<string>()
  const result: AssignmentPreviewCommand[] = []

  for (const command of commands) {
    if (!selectedCategories.has(command.category) || seen.has(command.code)) {
      continue
    }
    seen.add(command.code)
    result.push({
      ...command,
      assignmentSource: 'category',
      sourceCategoryName: categoryNameById.get(command.category),
    })
  }

  for (const commandId of commandIds) {
    const command = commandById.get(commandId)
    if (!command || seen.has(command.code)) {
      continue
    }
    seen.add(command.code)
    result.push({
      ...command,
      assignmentSource: 'direct',
    })
  }

  return result
}
