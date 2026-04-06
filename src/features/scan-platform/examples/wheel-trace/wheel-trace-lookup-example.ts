import { runWheelTraceLookup } from '../../use-cases/wheel-trace-lookup'
import { mockWheelTraceGateway } from './mock-wheel-trace-gateway'

export async function runWheelTraceLookupExample(rawCode: string) {
  return runWheelTraceLookup(
    {
      rawCode,
      source: 'camera',
      surface: 'standalone',
      context: {
        products: [
          {
            id: 'product-wheel-01',
            sku: 'WH-01',
            modelCode: '01',
            name: '700C 公路轮圈',
          },
        ],
        appearanceMapping: {
          '1': { label: 'UD' },
          '2': { label: '3K' },
        },
      },
    },
    mockWheelTraceGateway
  )
}
