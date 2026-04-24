import { createLazyFileRoute } from '@tanstack/react-router'
import { BatchEnginePage } from '@/features/raw-materials/batch-engine/batch-engine-page'

export const Route = createLazyFileRoute('/_authenticated/raw-materials/batch-engine')({
  component: BatchEnginePage,
})
