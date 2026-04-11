import { ShipmentTransactionService } from '../shipment'
import { InventoryTransactionService as InventoryTransactionDomainService } from '../inventory'

export type { InboundRecord } from '../inventory'
export type { ShipmentRecord, ShipmentStatus } from '../shipment'

export const InventoryTransactionService = {
  recordInbound: InventoryTransactionDomainService.recordInbound,

  recordShipment: ShipmentTransactionService.recordShipment,

  commitShipment: ShipmentTransactionService.commitShipment,

  transferInventory: InventoryTransactionDomainService.transferInventory,
}
