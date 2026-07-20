# Purchase logistics TAB boundary

This directory owns the `/purchase/logistics` TAB and only purchase receipt logistics records.

The authoritative read chain is:

`/purchase/logistics` -> `PurchaseLogisticsService.getRecords` -> `GET /api/logistics?type=Receipt` -> permission-aware backend scope -> `logistics_records.type = Receipt`.

Boundaries:

- Purchase logistics requests and renders only `Receipt` records. `Shipment` belongs to sales logistics.
- Users with only `menu_purchase` cannot list or fetch `Shipment` records through the shared logistics API.
- Users with only `menu_trading` cannot list or fetch `Receipt` records.
- Controlled tracking is shared, but the backend authorizes the stored `DeliveryOrder.bizType` before returning or refreshing traces.
- The backend response owns the linked purchase-order summary used by the supplier column.
- Purchase orders are consumed from `@/features/purchase/orders`; carrier inference and controlled tracking are consumed from `features/logistics`.
- Offline drafts may replay the same purchase receipt command, but must not introduce a second API shape or bypass backend scope validation.

Consumers must import the TAB page from `@/features/purchase/logistics`. New purchase-logistics files must not be placed in a top-level `features/purchase-logistics` directory.
