export type PrepregBindingQrItem = {
  id: string
  token: string
  expiresAt: string
}

export function clampPrepregBindingQrQuantity(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.min(200, Math.max(1, Math.floor(value)))
}
