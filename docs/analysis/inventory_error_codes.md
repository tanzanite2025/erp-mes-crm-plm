# Inventory Error Codes

## Scope

This document covers `INVENTORY_*` error codes returned by inventory-related APIs under `/api/v1/inventory/*`.

It only applies to the inventory domain's real inbound / outbound / transfer / void flows. It does not cover `shipping-management/vehicle-match` or `logistics-config/vehicle-loading`, which are simulation-oriented and should not be interpreted as final shipping confirmation.

Standard error response:

```json
{
  "error": "human readable message",
  "code": "INVENTORY_XXX"
}
```

## Error Code Table

| Error Code | HTTP Status | API Endpoint(s) | Trigger Condition | Frontend Prompt Suggestion |
|---|---:|---|---|---|
| `INVENTORY_QUERY_FAILED` | 500 | `GET /api/v1/inventory` | Database/query failure when loading paginated inventory list. | `库存列表加载失败，请稍后重试。` Show retry button; keep current filters/page state. |
| `INVENTORY_INBOUND_VALIDATION_FAILED` | 400 | `POST /api/v1/inventory/inbound` | Request body schema/field validation failed. | `入库参数有误，请检查后重试。` Highlight invalid form fields. |
| `INVENTORY_INBOUND_FAILED` | 500 | `POST /api/v1/inventory/inbound` | Inbound transaction failed (e.g., material not found, inventory row lock/update failure). | `入库失败，请重试。` If message includes material not found, suggest refreshing material selection. |
| `INVENTORY_SHIPMENT_VALIDATION_FAILED` | 400 | `POST /api/v1/inventory/shipment` | Inventory shipment draft payload validation failed. | `出库单参数有误，请检查后重试。` Keep dialog open and focus first invalid field. |
| `INVENTORY_SHIPMENT_CREATE_FAILED` | 500 | `POST /api/v1/inventory/shipment` | Failed to persist inventory shipment draft. | `出库草稿保存失败，请稍后重试。` Offer retry; avoid clearing user input. |
| `INVENTORY_SHIPMENT_NOT_FOUND` | 404 | `POST /api/v1/inventory/shipment/:id/commit` | Shipment record does not exist for given `:id`. | `出库单不存在或已被删除，请刷新列表。` Auto-refresh table. |
| `INVENTORY_SHIPMENT_NOT_DRAFT` | 400 | `POST /api/v1/inventory/shipment/:id/commit` | Shipment status is not `DRAFT`, so commit is not allowed. | `仅草稿状态可提交，请刷新后确认状态。` Disable commit button for non-draft rows. |
| `INVENTORY_COMMIT_FAILED` | 500 | `POST /api/v1/inventory/shipment/:id/commit` | Commit transaction failed (inventory row missing, stock shortage, DB failure). | `提交出库失败，请重试。` If message contains stock shortage, show `库存不足` with current quantity. |
| `INVENTORY_TRANSFER_VALIDATION_FAILED` | 400 | `POST /api/v1/inventory/transfer` | Transfer payload validation failed. | `调拨参数有误，请检查后重试。` Validate source/target/quantity before submit. |
| `INVENTORY_TRANSFER_FAILED` | 500 | `POST /api/v1/inventory/transfer` | Transfer transaction failed (source row missing, shortage, lock/DB failure). | `库存调拨失败，请重试。` If source shortage, suggest reducing quantity or changing source batch. |
| `INVENTORY_RECONCILE_FAILED` | 500 | `POST /api/v1/inventory/reconcile` | Reconcile operation failed during DB update. | `库存对账失败，请稍后重试。` Show operation log ID if available. |
| `INVENTORY_VOID_FORBIDDEN` | 403 | `POST /api/v1/inventory/shipment/:id/void` | Approval check failed (`CheckAndConsumeApproval`). | `当前账号无权限或审批未通过，无法作废。` Guide user to complete approval flow. |
| `INVENTORY_VOID_IN_PROGRESS` | 409 | `POST /api/v1/inventory/shipment/:id/void` | Distributed lock is held; same shipment void operation is in progress. | `该单据正在处理中，请勿重复操作。` Disable button for a short cooldown (e.g., 3-5s). |
| `INVENTORY_VOID_FAILED` | 500 | `POST /api/v1/inventory/shipment/:id/void` | Void transaction failed (shipment/inventory state conflict or DB failure). | `作废失败，请重试。` If already voided, prompt user to refresh latest status. |
| `INVENTORY_BULK_SYNC_VALIDATION_FAILED` | 400 | `POST /api/v1/inventory/sync` | Bulk sync payload is invalid. | `批量同步参数有误，请检查导入数据格式。` Show first failing row index if possible. |
| `INVENTORY_BULK_SYNC_FAILED` | 500 | `POST /api/v1/inventory/sync` | Bulk sync transaction failed while saving one or more records. | `批量同步失败，请重试。` Recommend partial retry with failed subset. |

## Frontend Handling Baseline

1. For all `400` errors: keep form state, display inline validation hints, do not clear user input.
2. For all `403` errors: block action and display permission/approval guidance.
3. For all `404` errors: refresh list/detail view and disable stale action buttons.
4. For all `409` errors: show non-blocking warning toast and apply short retry cooldown.
5. For all `500` errors: show retry CTA and log `code + error + request id` to frontend monitoring.
