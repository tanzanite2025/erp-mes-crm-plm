import { createFileRoute } from '@tanstack/react-router'
import { FurnaceAssetsCenterPage } from '@/features/tooling-furnaces/pages/furnace-assets-center-page'

export const Route = createFileRoute('/_authenticated/tooling-furnaces/center')(
  {
    component: FurnaceAssetsCenterPage,
  }
)
