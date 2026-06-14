import { createLazyFileRoute } from '@tanstack/react-router'
import { CutSizeLibraryPage } from '@/features/raw-materials/cut-size-library/cut-size-library-page'

export const Route = createLazyFileRoute(
  '/_authenticated/raw-materials/cut-size-library'
)({
  component: CutSizeLibraryPage,
})
