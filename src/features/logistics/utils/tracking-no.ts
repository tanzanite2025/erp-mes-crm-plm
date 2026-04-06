import { commonCarriers } from '../types'

const carrierLookup = {
  sf: commonCarriers[0] || '顺丰速运',
  ky: commonCarriers[1] || '跨越速运',
  db: commonCarriers[2] || '德邦快递',
  zto: commonCarriers[3] || '中通快递',
  yto: commonCarriers[4] || '圆通速递',
} as const

export function normalizeTrackingNo(rawValue: string) {
  return rawValue.replace(/\s+/g, '').trim().toUpperCase()
}

export function inferCarrierFromTrackingNo(rawValue: string) {
  const trackingNo = normalizeTrackingNo(rawValue)

  if (!trackingNo) {
    return null
  }

  if (/^SF\d{8,}$/.test(trackingNo)) {
    return carrierLookup.sf
  }

  if (/^(KYE|KY)[A-Z0-9]{6,}$/.test(trackingNo)) {
    return carrierLookup.ky
  }

  if (/^(DPK|DBL|DB)[A-Z0-9]{6,}$/.test(trackingNo)) {
    return carrierLookup.db
  }

  if (/^ZT[A-Z0-9]{8,}$/.test(trackingNo)) {
    return carrierLookup.zto
  }

  if (/^YT[A-Z0-9]{8,}$/.test(trackingNo)) {
    return carrierLookup.yto
  }

  // 结合当前业务场景做轻量偏置:
  // 1. 顺丰最稳定的是 SF 前缀，继续保持高置信度识别。
  // 2. 中通现场常见为纯数字面单，长度多在 12-14 位，这里做中等置信度兜底。
  // 3. 为避免误判，10 位及以下、15 位及以上纯数字单号不自动带出承运商。
  if (/^\d{12,14}$/.test(trackingNo)) {
    return carrierLookup.zto
  }

  return null
}
