import { createFileRoute } from '@tanstack/react-router'
import { CreateStandardEditorRoutePage } from '@/features/quality/pages/standard-editor-page'

export const Route = createFileRoute('/_authenticated/quality/standards/new')({
  component: CreateStandardEditorRoutePage,
})
