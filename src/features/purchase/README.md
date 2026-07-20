# Purchase domain boundary

This directory owns the `/purchase` module and its TAB-level business boundaries.

## TAB ownership

- `suppliers`: supplier master data, supplier lifecycle, and supplier numbering.
- `orders`: purchase orders, purchase returns, and their audit history.
- `logistics`: purchase-side logistics views. Shared logistics execution remains in its dedicated logistics domain.

Supplier, purchase-order, and purchase-logistics implementations and their detailed contracts live in `suppliers/`, `orders/`, and `logistics/`. New purchase-owned code must be placed under `features/purchase`.
