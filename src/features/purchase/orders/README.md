# Purchase orders TAB boundary

This directory owns the `/purchase/orders` TAB end to end:

- `components`: purchase orders, receipt confirmation, deleted-order logs, and purchase returns.
- `data`: purchase-order contracts, statuses, and state-machine rules.
- `contracts`, `adapters`, and `services`: purchase-order and purchase-return API boundaries.
- `hooks`: purchase-order forms, queries, mutations, and return workflows.
- `query-keys.ts` and `query-params.ts`: purchase cache and request parameter ownership.
- `index.ts`: the public API for routes and cross-domain consumers.

Consumers must import from `@/features/purchase/orders`. They must not import internal files or create alternative purchase-order schemas, query keys, services, or write paths.

## Shared dependencies

- Suppliers are consumed from `@/features/purchase/suppliers`.
- Evidence shapes and UI are consumed from `features/sales-document`.
- Currency, payment method, and payment term resources are consumed from `features/finance`.
- The purchase-order list may open the existing accounts-payable detail bridge. This is the only allowed dependency from this TAB into the legacy `features/trading/payables` location until the payables domain is migrated.

The frontend may calculate preview amounts for immediate UI feedback, but the backend remains authoritative for persisted purchase totals, receipt quantities, return quantities, status transitions, and version checks.
