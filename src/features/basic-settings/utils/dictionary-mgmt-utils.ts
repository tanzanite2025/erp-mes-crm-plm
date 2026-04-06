import { type DictionaryEntry, type DictionaryGroup } from '../data/schema'

export function filterEntries(
    entries: DictionaryEntry[],
    activeGroupId: string,
    searchTerm: string
): DictionaryEntry[] {
    const normalizedSearchTerm = searchTerm.toLowerCase()

    return entries
        .filter(entry => entry.groupId === activeGroupId)
        .filter(entry =>
            entry.label.toLowerCase().includes(normalizedSearchTerm) ||
            (entry.options || []).some(option =>
                (typeof option === 'string' ? option : option.label)
                    .toLowerCase()
                    .includes(normalizedSearchTerm)
            )
        )
}

export function createNewGroup(name: string): DictionaryGroup {
    return {
        id: crypto.randomUUID(),
        name,
        code: `CODE_${Date.now()}`,
        active: true,
        isSystem: false,
        createdAt: new Date().toISOString()
    }
}

export function createDraftEntry(activeGroupId: string): DictionaryEntry {
    return {
        id: '',
        code: `ATTR_${Date.now()}`,
        label: '',
        active: true,
        sortOrder: 1,
        groupId: activeGroupId
    } as DictionaryEntry
}
