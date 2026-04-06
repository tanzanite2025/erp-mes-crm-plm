import { createLazyFileRoute } from '@tanstack/react-router'
import { ProductTypes } from '@/features/engineering/tabs'

export const Route = createLazyFileRoute('/_authenticated/engineering/types')({
  component: ProductTypes,
})
