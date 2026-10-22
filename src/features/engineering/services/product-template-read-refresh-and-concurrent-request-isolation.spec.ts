import { QueryClient } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type ProductTemplateApiDTO } from '../contracts/product-template-api-dto'
import { PRODUCT_TEMPLATES_QUERY_KEY } from '../query-keys'
import { productTemplateService } from './product-template-service'

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: {
    getState: () => ({ accessToken: 'template-refresh-contract-token' }),
  },
}))

function buildProductTemplateReadResponseForRefreshTest(
  optionLabel: string
): ProductTemplateApiDTO[] {
  return [
    {
      id: 'rim-template',
      name: '车圈',
      code: 'rim',
      componentKey: 'RIM',
      active: true,
      version: 1,
      attributeBindings: [
        {
          categoryKey: 'brakeType',
          nameZh: '制动类型',
          required: false,
          active: true,
          sortOrder: 1,
          options: [
            { value: 'disc', labelZh: optionLabel, active: true, sortOrder: 1 },
          ],
        },
      ],
    },
  ]
}

const templateReadRequests = vi.fn<typeof fetch>()

beforeEach(() => {
  templateReadRequests.mockReset()
  vi.stubGlobal('fetch', templateReadRequests)
})

afterEach(() => vi.unstubAllGlobals())

describe('product template refresh and concurrent read isolation', () => {
  it('reads another client’s updated definitions after query invalidation', async () => {
    templateReadRequests
      .mockResolvedValueOnce(
        Response.json(buildProductTemplateReadResponseForRefreshTest('原碟刹'))
      )
      .mockResolvedValueOnce(
        Response.json(
          buildProductTemplateReadResponseForRefreshTest('更新碟刹')
        )
      )
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    })
    try {
      await queryClient.fetchQuery({
        queryKey: PRODUCT_TEMPLATES_QUERY_KEY,
        queryFn: () => productTemplateService.getTemplates({ fresh: true }),
      })
      await queryClient.invalidateQueries({
        queryKey: PRODUCT_TEMPLATES_QUERY_KEY,
      })
      const refreshed = await queryClient.fetchQuery({
        queryKey: PRODUCT_TEMPLATES_QUERY_KEY,
        queryFn: () => productTemplateService.getTemplates(),
      })
      expect(refreshed[0].attributeBindings[0].options[0].labelZh).toBe(
        '更新碟刹'
      )
      expect(templateReadRequests).toHaveBeenCalledTimes(2)
    } finally {
      queryClient.clear()
    }
  })

  it('shares only a pending request and starts a new read after it completes', async () => {
    let completeTemplateRead!: (response: Response) => void
    templateReadRequests.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          completeTemplateRead = resolve
        })
    )
    const firstRead = productTemplateService.getTemplates({ fresh: true })
    const concurrentRead = productTemplateService.getTemplates()
    expect(templateReadRequests).toHaveBeenCalledOnce()
    completeTemplateRead(
      Response.json(buildProductTemplateReadResponseForRefreshTest('原碟刹'))
    )
    await Promise.all([firstRead, concurrentRead])
    templateReadRequests.mockResolvedValueOnce(
      Response.json(buildProductTemplateReadResponseForRefreshTest('远端碟刹'))
    )
    const nextRead = await productTemplateService.getTemplates()
    expect(nextRead[0].attributeBindings[0].options[0].labelZh).toBe('远端碟刹')
    expect(templateReadRequests).toHaveBeenCalledTimes(2)
  })

  it('keeps a newer pending refresh isolated when an older read completes', async () => {
    const pendingReads: Array<(response: Response) => void> = []
    templateReadRequests.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          pendingReads.push(resolve)
        })
    )
    const olderRead = productTemplateService.getTemplates({ fresh: true })
    const newerRead = productTemplateService.getTemplates({ fresh: true })
    pendingReads[0](
      Response.json(buildProductTemplateReadResponseForRefreshTest('旧响应'))
    )
    await olderRead
    const sharedNewerRead = productTemplateService.getTemplates()
    pendingReads[1](
      Response.json(buildProductTemplateReadResponseForRefreshTest('新响应'))
    )
    const results = await Promise.all([newerRead, sharedNewerRead])
    expect(templateReadRequests).toHaveBeenCalledTimes(2)
    expect(
      results.map(
        (templates) => templates[0].attributeBindings[0].options[0].labelZh
      )
    ).toEqual(['新响应', '新响应'])
  })
})
