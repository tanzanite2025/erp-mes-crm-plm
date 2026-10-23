// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { translate } from '@/locales'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { toast } from 'sonner'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '@/lib/api-client'
import {
  bomSectionConfigSchema,
  type BOMSectionConfig,
} from '../../data/bom-section-schema'
import { BOMSectionConfigTab } from '../../tabs/bom-section-config'

vi.mock('@/lib/api-client', () => ({ apiFetch: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    t: (
      key: Parameters<typeof translate>[1],
      values?: Parameters<typeof translate>[2]
    ) => translate('zh-CN', key, values),
  }),
}))
vi.mock('@/features/authz/hooks/use-permission-access', () => ({
  usePermissionActions: () => ({ allowsAction: () => canManageSharedSections }),
}))

let canManageSharedSections: boolean
let sections: BOMSectionConfig[]
let catalogWriteFailure: unknown
const clients: QueryClient[] = []

function renderSharedSectionConfigurationPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  clients.push(client)
  render(
    <QueryClientProvider client={client}>
      <BOMSectionConfigTab />
    </QueryClientProvider>
  )
}

function getSharedSectionCatalogWriteRequests() {
  return vi
    .mocked(apiFetch)
    .mock.calls.filter(
      ([, options]) => options?.method && options.method !== 'GET'
    )
}

beforeEach(() => {
  vi.clearAllMocks()
  canManageSharedSections = true
  catalogWriteFailure = undefined
  sections = [
    bomSectionConfigSchema.parse({
      id: 'layup',
      code: 'LAYUP',
      name: '叠层',
      isSystem: true,
      isDefault: true,
    }),
    bomSectionConfigSchema.parse({
      id: 'packing',
      code: 'PACKING',
      name: '包装',
      sortOrder: 10,
    }),
  ]
  vi.mocked(apiFetch).mockImplementation(async (path, options) => {
    if (options?.method && options.method !== 'GET' && catalogWriteFailure)
      throw catalogWriteFailure
    if (path === '/engineering/bom-sections' && options?.method === 'POST') {
      const created = bomSectionConfigSchema.parse({
        ...JSON.parse(options.body as string),
        id: 'created-group',
        version: 1,
      })
      sections = [...sections, created]
      return created
    }
    if (
      path.startsWith('/engineering/bom-sections/') &&
      options?.method === 'PATCH'
    ) {
      const payload = JSON.parse(options.body as string)
      const selected = sections.find(
        (section) => section.id === path.split('/').slice(-1)[0]
      )!
      const updated = { ...selected, version: selected.version + 1 }
      for (const [field, change] of Object.entries(payload.delta) as Array<
        [string, { n: unknown }]
      >)
        Object.assign(updated, { [field]: change.n })
      sections = sections.map((section) =>
        section.id === updated.id
          ? updated
          : {
              ...section,
              isDefault: updated.isDefault ? false : section.isDefault,
            }
      )
      return updated
    }
    if (
      path.startsWith('/engineering/bom-sections/') &&
      options?.method === 'DELETE'
    ) {
      sections = sections.filter(
        (section) => section.id !== path.split('/').slice(-1)[0]
      )
      return undefined
    }
    if (path === '/engineering/bom-sections')
      return { items: sections, total: sections.length, page: 1, pageSize: 50 }
    throw new Error(`Unexpected shared section API: ${path}`)
  })
})

afterEach(() => {
  cleanup()
  clients.splice(0).forEach((client) => client.clear())
})

describe('Shared BOM section inline management permissions and catalog writes', () => {
  it('reuses the inline panel on the configuration page and creates a group without another dialog', async () => {
    renderSharedSectionConfigurationPage()
    await screen.findByRole('button', { name: '叠层' })
    fireEvent.click(screen.getByRole('button', { name: '新增分组' }))
    fireEvent.change(screen.getByRole('textbox', { name: '分组编码' }), {
      target: { value: 'custom_group' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: '分组名称' }), {
      target: { value: '附加材料' },
    })
    fireEvent.click(screen.getByRole('button', { name: '保存配置' }))
    await screen.findByRole('button', { name: '附加材料' })
    expect(screen.queryByRole('dialog')).toBeNull()
    const [[path, options]] = getSharedSectionCatalogWriteRequests()
    expect(path).toBe('/engineering/bom-sections')
    expect(JSON.parse(options!.body as string)).toMatchObject({
      code: 'CUSTOM_GROUP',
      name: '附加材料',
      isSystem: false,
    })
    expect(
      (screen.getByRole('textbox', { name: '分组编码' }) as HTMLInputElement)
        .disabled
    ).toBe(true)
  })

  it('keeps the code stable and sends a versioned change for the selected group', async () => {
    renderSharedSectionConfigurationPage()
    fireEvent.click(await screen.findByRole('button', { name: '包装' }))
    expect(
      (screen.getByRole('textbox', { name: '分组编码' }) as HTMLInputElement)
        .disabled
    ).toBe(true)
    fireEvent.change(screen.getByRole('textbox', { name: '分组名称' }), {
      target: { value: '包装与附件' },
    })
    fireEvent.click(screen.getByRole('switch', { name: '默认分组' }))
    fireEvent.click(screen.getByRole('button', { name: '保存配置' }))
    await screen.findByRole('button', { name: '包装与附件' })
    const [[path, options]] = getSharedSectionCatalogWriteRequests()
    expect(path).toBe('/engineering/bom-sections/packing')
    const payload = JSON.parse(options!.body as string)
    expect(payload).toMatchObject({
      metadata: { version: 1 },
      delta: { name: { o: '包装', n: '包装与附件' }, isDefault: { n: true } },
    })
    expect(payload.delta.code).toBeUndefined()
  })

  it('protects system and last active groups and confirms removable groups inside the panel', async () => {
    sections[1].active = false
    renderSharedSectionConfigurationPage()
    await screen.findByRole('button', { name: '叠层' })
    expect(
      (screen.getByRole('switch', { name: '启用状态' }) as HTMLButtonElement)
        .disabled
    ).toBe(true)
    expect(
      (
        screen.getByRole('button', {
          name: '删除',
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: '包装' }))
    fireEvent.click(screen.getByRole('button', { name: '删除' }))
    expect(getSharedSectionCatalogWriteRequests()).toHaveLength(0)
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(
      within(screen.getByRole('alert')).getByRole('button', {
        name: '确认删除',
      })
    )
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: '包装' })).toBeNull()
    )
    expect(getSharedSectionCatalogWriteRequests()[0][1]?.method).toBe('DELETE')
  })

  it('keeps drafts available after concurrent update and linked-record deletion failures', async () => {
    renderSharedSectionConfigurationPage()
    fireEvent.click(await screen.findByRole('button', { name: '包装' }))
    fireEvent.change(screen.getByRole('textbox', { name: '分组名称' }), {
      target: { value: '待保存修改' },
    })
    catalogWriteFailure = { status: 409, message: 'version conflict' }
    fireEvent.click(screen.getByRole('button', { name: '保存配置' }))
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        '该分组配置已被其他人更新，请刷新后重试。'
      )
    )
    expect(
      (screen.getByRole('textbox', { name: '分组名称' }) as HTMLInputElement)
        .value
    ).toBe('待保存修改')
    await waitFor(() =>
      expect(
        (
          screen.getByRole('button', {
            name: '删除',
          }) as HTMLButtonElement
        ).disabled
      ).toBe(false)
    )
    catalogWriteFailure = new Error('BOM section 已被配方引用，无法删除')
    fireEvent.click(screen.getByRole('button', { name: '删除' }))
    fireEvent.click(screen.getByRole('button', { name: '确认删除' }))
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        '该 BOM 分组已被历史配方引用，暂时无法删除。'
      )
    )
    expect(screen.getByRole('button', { name: '包装' })).toBeTruthy()
  })

  it('allows catalog viewing while disabling all maintenance without management permission', async () => {
    canManageSharedSections = false
    renderSharedSectionConfigurationPage()
    fireEvent.click(await screen.findByRole('button', { name: '包装' }))
    expect(
      screen.getByText('当前账号可查看共用分组，维护需要管理权限。')
    ).toBeTruthy()
    for (const name of ['新增分组', '保存配置', '删除'])
      expect(
        (screen.getByRole('button', { name }) as HTMLButtonElement).disabled
      ).toBe(true)
    expect(
      (screen.getByRole('textbox', { name: '分组名称' }) as HTMLInputElement)
        .disabled
    ).toBe(true)
    expect(getSharedSectionCatalogWriteRequests()).toHaveLength(0)
  })
})
