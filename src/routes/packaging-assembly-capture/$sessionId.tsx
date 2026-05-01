import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { PackagingAssemblyMobileCapturePage } from '@/features/warehouse/pages/packaging-assembly-mobile-capture-page'

const searchSchema = z.object({
  token: z.string().optional(),
  packageCode: z.string().optional(),
})

export const Route = createFileRoute('/packaging-assembly-capture/$sessionId')({
  validateSearch: searchSchema,
  component: PackagingAssemblyCaptureRoute,
})

function PackagingAssemblyCaptureRoute() {
  const { sessionId } = Route.useParams()
  const { token = '', packageCode = '' } = Route.useSearch()

  return (
    <PackagingAssemblyMobileCapturePage
      sessionId={sessionId}
      token={token}
      packageCode={packageCode}
    />
  )
}
