import { createFileRoute } from '@tanstack/react-router'
import { LinearBarcodeStatusMgmt } from '@/features/code-center/linear-barcode-status-mgmt'

export const Route = createFileRoute(
  '/_authenticated/code-center/linear-barcode/status'
)({
  component: LinearBarcodeStatusMgmt,
})
