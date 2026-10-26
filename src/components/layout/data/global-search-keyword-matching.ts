import type { SearchItem } from './search-data'

export function matchesGlobalSearchItemKeywords(
  item: SearchItem,
  query: string
) {
  const keywords = query
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase()
    .split(/\s+/)
  const searchableText = [
    item.title,
    item.parentTitle,
    item.href,
    item.pinyin,
    ...(item.keywords ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .normalize('NFKC')
    .toLocaleLowerCase()

  return keywords.every((keyword) => searchableText.includes(keyword))
}
