// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '@/lib/api-client'
import { ProductMaintenanceService } from '@/features/engineering/services/product-maintenance-service'
import { createProductDraft } from '@/features/engineering/utils/default-builders'
import { createMoldDraft } from '../data/schema'
import { MoldCoreService } from './mold-core-service'
import { MoldTransactionService } from './mold-transaction-service'

vi.mock('@/lib/api-client', () => ({ apiFetch: vi.fn() }))

describe('产品建档复用模具主库 HTTP 契约', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset()
  })

  it('选用分组读取全量模具，不受默认第一页限制', async () => {
    const molds = Array.from({ length: 61 }, (_, index) =>
      createMoldDraft({
        id: `mold-${index}`,
        sn: `SN-${index}`,
        name: `模具 ${index}`,
        groupName: `组 ${index}`,
      })
    )
    vi.mocked(apiFetch).mockResolvedValue({
      items: molds,
      total: 61,
      page: 1,
      pageSize: 61,
      version: 1,
    })
    const options = await MoldCoreService.getMoldMasterLibrarySelectionOptions()
    expect(apiFetch).toHaveBeenCalledWith('/molds?options=true')
    expect(options).toHaveLength(61)
    expect(options[60].groupName).toBe('组 60')
  })

  it('分组来自模具主库组名接口，读取失败不能伪装成空列表', async () => {
    vi.mocked(apiFetch).mockResolvedValue(['车圈模具组'])
    await expect(MoldCoreService.getGroupNames()).resolves.toEqual([
      '车圈模具组',
    ])
    expect(apiFetch).toHaveBeenCalledWith('/molds/group-names')
    vi.mocked(apiFetch).mockRejectedValue(new Error('模具主库不可用'))
    await expect(MoldCoreService.getGroupNames()).rejects.toThrow(
      '模具主库不可用'
    )
  })

  it('模具管理、图纸关联和借还选择读取完整目录，与产品分组选用范围一致', async () => {
    const molds = Array.from({ length: 61 }, (_, index) =>
      createMoldDraft({
        id: `library-mold-${index}`,
        sn: `LIBRARY-${index}`,
        name: `主库模具 ${index}`,
        groupName: `主库组 ${index}`,
      })
    )
    vi.mocked(apiFetch).mockImplementation(async (endpoint) => ({
      items: endpoint === '/molds?options=true' ? molds : molds.slice(0, 50),
      total: molds.length,
      page: 1,
      pageSize: endpoint === '/molds?options=true' ? molds.length : 50,
      version: 789,
    }))
    const masterLibrary = await MoldCoreService.getMolds()
    const selection =
      await MoldCoreService.getMoldMasterLibrarySelectionOptions()
    const snapshot = await MoldCoreService.getMoldsWithVersion()
    expect(masterLibrary).toHaveLength(61)
    expect(masterLibrary).toEqual(selection)
    expect(snapshot).toEqual({ molds: masterLibrary, version: 789 })
  })

  it('模具按独立分组 ID 新增，不通过名称隐式建组，并使用服务器返回的身份', async () => {
    const draft = createMoldDraft({
      sn: 'SN-NEW',
      name: '新增模具',
      groupId: '60b7446e-55f7-4c02-b287-c20d60a01002',
      groupName: '新分组',
    })
    vi.mocked(apiFetch).mockResolvedValue({ ...draft, id: 'server-mold-id' })
    const saved = await MoldTransactionService.createMold(draft)
    const [endpoint, request] = vi.mocked(apiFetch).mock.calls[0]
    expect(endpoint).toBe('/molds')
    expect(request?.method).toBe('POST')
    expect(JSON.parse(request?.body as string)).toMatchObject({
      sn: 'SN-NEW',
      name: '新增模具',
      groupId: '60b7446e-55f7-4c02-b287-c20d60a01002',
    })
    expect(JSON.parse(request?.body as string).id).toBeUndefined()
    expect(saved.id).toBe('server-mold-id')
  })

  it('产品编辑按 moldGroupId 差分保存分组，名称不作为写入关联依据', async () => {
    const product = createProductDraft({
      id: 'product-with-mold-group',
      name: 'R50 碟刹',
      sku: 'R50-01',
      typeId: 'R50-base-model',
      version: 3,
      moldGroupId: '60b7446e-55f7-4c02-b287-c20d60a01001',
      moldGroup: '原分组',
    })
    vi.mocked(apiFetch).mockResolvedValueOnce({
      ...product,
      moldGroupId: '60b7446e-55f7-4c02-b287-c20d60a01002',
      moldGroup: '新分组',
      version: 4,
    })
    const saved = await ProductMaintenanceService.patchProduct(product, {
      ...product,
      moldGroupId: '60b7446e-55f7-4c02-b287-c20d60a01002',
      moldGroup: '新分组',
    })
    const [endpoint, request] = vi.mocked(apiFetch).mock.calls[0]
    expect(endpoint).toBe('/engineering/products/product-with-mold-group')
    expect(request?.method).toBe('PATCH')
    expect(JSON.parse(request?.body as string)).toMatchObject({
      delta: {
        moldGroupId: {
          o: '60b7446e-55f7-4c02-b287-c20d60a01001',
          n: '60b7446e-55f7-4c02-b287-c20d60a01002',
        },
      },
      metadata: { id: product.id, version: 3 },
    })
    expect(saved.moldGroup).toBe('新分组')
    expect(saved.moldGroupId).toBe('60b7446e-55f7-4c02-b287-c20d60a01002')
    expect(saved.version).toBe(4)
  })
})
