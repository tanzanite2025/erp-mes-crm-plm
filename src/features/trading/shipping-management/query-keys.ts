export const shippingManagementQueryKeys = {
  all: ['shipping-management'] as const,
  vehicleMatchItems: () =>
    [...shippingManagementQueryKeys.all, 'vehicle-match-items'] as const,
}
