import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/purchase/suppliers')({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      search: (search.search as string) || '',
      detailId: (search.detailId as string) || '',
    }
  },
})
