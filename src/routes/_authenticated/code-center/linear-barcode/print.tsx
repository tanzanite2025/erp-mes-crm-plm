import { createFileRoute } from '@tanstack/react-router'
import { LinearBarcodePrintMgmt } from '@/features/code-center/linear-barcode-print-mgmt'

export const Route = createFileRoute(
  '/_authenticated/code-center/linear-barcode/print'
)({
  component: LinearBarcodePrintMgmt,
})
