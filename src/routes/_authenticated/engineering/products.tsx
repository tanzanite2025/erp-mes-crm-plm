import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/engineering/products')({
  validateSearch: (
    search: Record<string, unknown>
  ): { productId?: string } => ({
    productId:
      typeof search.productId === 'string' ? search.productId : undefined,
  }),
})
