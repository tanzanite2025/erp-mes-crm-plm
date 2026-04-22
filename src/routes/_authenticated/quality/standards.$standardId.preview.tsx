import { createFileRoute } from '@tanstack/react-router'
import { StandardPreviewRoutePage } from '@/features/quality/pages/standard-preview-page'

export const Route = createFileRoute(
  '/_authenticated/quality/standards/$standardId/preview'
)({
  component: StandardPreviewRoutePage,
})
