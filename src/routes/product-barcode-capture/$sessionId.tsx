import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ProductBarcodeMobileCapturePage } from '@/features/cutting-operations/tabs/product-binding/pages/product-barcode-mobile-capture-page'

const searchSchema = z.object({
  token: z.string().optional(),
})

export const Route = createFileRoute('/product-barcode-capture/$sessionId')({
  validateSearch: searchSchema,
  component: ProductBarcodeCaptureRoute,
})

function ProductBarcodeCaptureRoute() {
  const { sessionId } = Route.useParams()
  const { token = '' } = Route.useSearch()

  return <ProductBarcodeMobileCapturePage sessionId={sessionId} token={token} />
}
