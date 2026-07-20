# Supplier TAB boundary

This directory owns the `/purchase/suppliers` TAB end to end:

- `components`: supplier management UI only.
- `data`, `contracts`, and `adapters`: supplier domain and API shapes.
- `services` and `hooks`: the only frontend supplier read/write entry points.
- `query-keys.ts`: supplier cache ownership.
- `index.ts`: the public API for purchase orders and cross-domain read consumers.

Consumers must import from `@/features/purchase/suppliers`. They must not import internal files or create an alternative supplier service, schema, query key, or write path.

## Creation contract

The authoritative write chain is:

`/purchase/suppliers` -> `POST /api/suppliers` -> `services.SaveSupplier` -> one database transaction containing both `numbering.GenerateNextNumberTx(PURCHASE_SUPPLIER)` and the supplier insert.

Boundaries:

- The client may leave `code` empty; it must not predict or calculate the next supplier code.
- The backend owns automatic supplier numbering with format `XD-S-YYYYMMDD-NNNN` and a daily sequence reset.
- Number reservation and supplier insertion must commit or roll back together.
- The supplier `code` unique index is a final integrity constraint, not the sequence allocator.
- Purchase orders and raw-material screens are read consumers; they must not implement supplier writes or numbering.
