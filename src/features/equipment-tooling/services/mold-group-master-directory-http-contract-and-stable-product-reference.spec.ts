// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '@/lib/api-client'
import { ProductMaintenanceService } from '@/features/engineering/services/product-maintenance-service'
import { createProductDraft } from '@/features/engineering/utils/default-builders'
import { MoldGroupMasterService } from './mold-group-master-service'

vi.mock('@/lib/api-client', () => ({ apiFetch: vi.fn() }))
const groupId = '60b7446e-55f7-4c02-b287-c20d60a01001'
const group = {
  id: groupId,
  name: '独立分组',
  description: '',
  active: true,
  version: 2,
  moldCount: 0,
  productCount: 3,
}

beforeEach(() => vi.mocked(apiFetch).mockReset())

describe('模具分组主档 HTTP 契约', () => {
  it('读取独立目录保留空组、停用状态及引用数量', async () => {
    vi.mocked(apiFetch).mockResolvedValue([
      group,
      { ...group, id: '60b7446e-55f7-4c02-b287-c20d60a01002', active: false },
    ])
    const directory = await MoldGroupMasterService.getMoldGroupDirectory()
    expect(apiFetch).toHaveBeenCalledWith('/mold-groups')
    expect(directory).toHaveLength(2)
    expect(directory[0]).toMatchObject({ moldCount: 0, productCount: 3 })
    expect(directory[1].active).toBe(false)
  })

  it('分组保存使用服务器 ID 和版本号，删除携带版本', async () => {
    vi.mocked(apiFetch).mockResolvedValue(group)
    const saved = await MoldGroupMasterService.saveMoldGroup(
      { name: group.name, description: '', active: true, version: 1 },
      groupId
    )
    expect(apiFetch).toHaveBeenCalledWith(
      `/mold-groups/${groupId}`,
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          name: group.name,
          description: '',
          active: true,
          version: 1,
        }),
      })
    )
    expect(saved.id).toBe(groupId)
    await MoldGroupMasterService.deleteMoldGroup(saved)
    expect(apiFetch).toHaveBeenLastCalledWith(
      `/mold-groups/${groupId}?version=2`,
      { method: 'DELETE' }
    )
  })

  it('目录读取失败或返回旧名称数组时明确报错', async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error('目录读取失败'))
    await expect(
      MoldGroupMasterService.getMoldGroupDirectory()
    ).rejects.toThrow('目录读取失败')
    vi.mocked(apiFetch).mockResolvedValue(['旧组名'])
    await expect(
      MoldGroupMasterService.getMoldGroupDirectory()
    ).rejects.toThrow()
  })

  it('产品清除分组提交空 ID，名称改动不生成关联修改', async () => {
    const current = createProductDraft({
      id: 'product-with-group',
      sku: 'R50-01',
      name: '产品',
      typeId: 'R50',
      version: 1,
      moldGroupId: groupId,
      moldGroup: '原名称',
    })
    const unchanged = await ProductMaintenanceService.patchProduct(current, {
      ...current,
      moldGroup: '新显示名称',
    })
    expect(unchanged).toBe(current)
    expect(apiFetch).not.toHaveBeenCalled()
    vi.mocked(apiFetch).mockResolvedValue({
      ...current,
      moldGroupId: '',
      moldGroup: '',
      version: 2,
    })
    await ProductMaintenanceService.patchProduct(current, {
      ...current,
      moldGroupId: '',
      moldGroup: '',
    })
    const request = vi.mocked(apiFetch).mock.calls[0][1]
    expect(JSON.parse(request?.body as string).delta).toEqual({
      moldGroupId: { o: groupId, n: '' },
    })
  })
})
