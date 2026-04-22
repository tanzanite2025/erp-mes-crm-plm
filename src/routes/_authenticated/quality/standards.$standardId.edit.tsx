import { createFileRoute } from '@tanstack/react-router'
import { EditStandardEditorRoutePage } from '@/features/quality/pages/standard-editor-page'

export const Route = createFileRoute(
  '/_authenticated/quality/standards/$standardId/edit'
)({
  component: EditStandardEditorRoutePage,
})
