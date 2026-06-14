import { createFileRoute } from '@tanstack/react-router'
import { LinearBarcodeLayout } from '@/features/code-center/linear-barcode-layout'

export const Route = createFileRoute(
  '/_authenticated/code-center/linear-barcode'
)({
  component: LinearBarcodeLayout,
})
