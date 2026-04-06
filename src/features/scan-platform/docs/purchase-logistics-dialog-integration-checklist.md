# Purchase Logistics Dialog Integration Checklist

This checklist describes how the existing purchase logistics dialog should be
wired to scan-platform without refactoring the whole page into a standalone scan
flow.

## Goal

Keep the purchase logistics dialog as the host page and let scan-platform only
handle scan capture, normalization, and draft patch generation.

## Existing Host State

Current dialog form shape should remain the source of truth:

```ts
type PurchaseLogisticsDialogFormValue = {
  purchaseOrderId: string
  orderNo: string
  carrier: string
  trackingNo: string
}
```

## Integration Steps

1. Keep the dialog-local form state in the host page.
2. When an order is selected, build `adapterOptions.selectedOrder`.
3. On scan success, call `runLogisticsInboundHostScan(rawCode, session)`.
4. Replace host form state with `result.nextForm`.
5. Show `result.payload.summary` as the primary scan feedback.
6. Show `result.warnings` as non-blocking guidance.
7. Submit `result.submitDraft` into the existing purchase logistics save flow.
8. If you want the host page to avoid manual wiring, use the helper:
   `createPurchaseLogisticsDialogScanHelper(...)`.

## Recommended Wiring Points

- `TrackingNumberInput.onValueChange`
  Use raw scanner output as the input to `runLogisticsInboundHostScan`.
- Order selector change handler
  Keep `purchaseOrderId` and `orderNo` synced before the scan use-case runs.
- Submit handler
  Prefer `purchaseLogisticsDialogAdapter.toSubmissionDraft(...)` or the latest
  `result.submitDraft` so the final payload is derived from the same adapter.

## Host Responsibilities

The host dialog should continue to own:
- open/close state
- order selection
- supplier display
- mutation lifecycle
- success and error toast behavior

scan-platform should own:
- scan normalization
- host context projection
- draft patch generation
- warnings and summary generation

## Anti-Patterns To Avoid

- Do not move purchase-order selection into the scan plugin.
- Do not let the scan plugin own dialog-local React state.
- Do not make `/scan/logistics-inbound` the only way to scan if the dialog flow
  still needs order context from the host page.
- Do not submit raw scan text directly when a normalized draft is available.

## Minimal Host Pseudocode

```ts
const scanHelper = createPurchaseLogisticsDialogScanHelper({
  getForm: () => form,
  setForm,
  getAdapterOptions: () => ({
    selectedOrder,
    operatorId,
    operatorName,
  }),
  onSummaryChange: setScanSummary,
  onWarningsChange: setScanWarnings,
})

await scanHelper.handleScannedValue(rawCode)

const submitDraft = scanHelper.buildSubmitDraft()
```

## Ready-To-Integrate References

- `adapters/logistics-inbound/purchase-logistics-dialog-adapter.ts`
- `helpers/logistics-inbound/purchase-logistics-dialog-scan-helper.ts`
- `use-cases/logistics-inbound-host-scan.ts`
- `examples/logistics-inbound/purchase-logistics-dialog-example.tsx`
