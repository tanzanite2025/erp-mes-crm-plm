import { InventoryTransactionService as InventoryTransactionDomainService } from '../inventory'
import { ShipmentTransactionService } from '../shipment'

export type { InboundRecord, InboundTDO } from '../inventory'
export type { ShipmentRecord, ShipmentStatus } from '../shipment'

export const InventoryTransactionService = {
  recordInbound: InventoryTransactionDomainService.recordInbound,

  recordShipment: ShipmentTransactionService.recordShipment,

  commitShipment: ShipmentTransactionService.commitShipment,

  transferInventory: InventoryTransactionDomainService.transferInventory,
}
