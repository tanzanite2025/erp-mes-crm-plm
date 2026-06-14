import { useState } from 'react'
import type {
  PurchaseLogisticsDialogAdapterOptions,
  PurchaseLogisticsDialogFormValue,
} from '../../adapters/logistics-inbound/purchase-logistics-dialog-adapter'
import { runLogisticsInboundHostScan } from '../../use-cases/logistics-inbound-host-scan'

const DEFAULT_FORM: PurchaseLogisticsDialogFormValue = {
  purchaseOrderId: '',
  orderNo: '',
  carrier: '',
  trackingNo: '',
}

export interface PurchaseLogisticsDialogScanExampleProps {
  initialForm?: PurchaseLogisticsDialogFormValue
  adapterOptions?: PurchaseLogisticsDialogAdapterOptions
}

export function PurchaseLogisticsDialogScanExample({
  initialForm = DEFAULT_FORM,
  adapterOptions,
}: PurchaseLogisticsDialogScanExampleProps) {
  const [form, setForm] =
    useState<PurchaseLogisticsDialogFormValue>(initialForm)
  const [rawCode, setRawCode] = useState('')
  const [summary, setSummary] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])

  const handleScan = async () => {
    const result = await runLogisticsInboundHostScan(rawCode, {
      form,
      adapterOptions,
    })

    setForm(result.nextForm)
    setSummary(result.payload.summary)
    setWarnings(result.warnings)
    setRawCode('')
  }

  return (
    <section>
      <h3>Purchase Logistics Dialog Integration Example</h3>
      <p>
        Use this as a reference when wiring scan-platform into the existing
        purchase logistics dialog.
      </p>

      <div>
        <label>
          Purchase Order ID
          <input
            value={form.purchaseOrderId}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                purchaseOrderId: event.target.value,
              }))
            }
          />
        </label>
      </div>

      <div>
        <label>
          Order No
          <input
            value={form.orderNo}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                orderNo: event.target.value,
              }))
            }
          />
        </label>
      </div>

      <div>
        <label>
          Carrier
          <input
            value={form.carrier}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                carrier: event.target.value,
              }))
            }
          />
        </label>
      </div>

      <div>
        <label>
          Incoming Scan Value
          <input
            value={rawCode}
            onChange={(event) => setRawCode(event.target.value)}
          />
        </label>
        <button type='button' onClick={() => void handleScan()}>
          Resolve Scan
        </button>
      </div>

      <pre>{JSON.stringify({ form, summary, warnings }, null, 2)}</pre>
    </section>
  )
}
