import { createLazyFileRoute } from '@tanstack/react-router'
import { RawMaterialsCatalogPage } from '@/features/raw-materials/pages/raw-materials-catalog-page'

export const Route = createLazyFileRoute(
  '/_authenticated/raw-materials/catalog'
)({
  component: RawMaterialsCatalogPage,
})
