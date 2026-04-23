import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { PrepregLabelMobileCapturePage } from '@/features/raw-materials/pages/prepreg-label-mobile-capture-page'

const searchSchema = z.object({
  token: z.string().optional(),
})

export const Route = createFileRoute('/prepreg-label-capture/$sessionId')({
  validateSearch: searchSchema,
  component: PrepregLabelCaptureRoute,
})

function PrepregLabelCaptureRoute() {
  const { sessionId } = Route.useParams()
  const { token = '' } = Route.useSearch()

  return <PrepregLabelMobileCapturePage sessionId={sessionId} token={token} />
}
