// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '@/lib/api-client'
import { engineeringSpecService } from '@/features/engineering/services/engineering-spec-service'
import type { TechnicalSpec } from '../data/schema'
import { FileResolverService } from './file-resolver-service'
import { SpecsService } from './specs-service'
import { uploadTechnicalSpecificationDocumentSourceFile } from './technical-specification-document-source-file-upload-service'

vi.mock('@/lib/api-client', () => ({ apiFetch: vi.fn() }))

function buildTechnicalSpecificationMasterLibraryResponse() {
  return {
    id: 'saved-specification',
    code: 'SPEC-SERVER-CODE',
    type: 'TECH_SPEC',
    name: '主库权威名称',
    active: true,
    version: 8,
    createdAt: '2026-10-23T08:00:00Z',
    description: '主库说明',
    masterDataControl: { revisionNo: 'V2.3' },
    specData: {
      name: '过期嵌套名称',
      category: 'SOP',
      version: 99,
      revisionNo: 'V0',
      fileUrl: '/uploads/shared.pdf',
      fileExtension: 'pdf',
    },
  }
}

describe('技术规范唯一主库 HTTP 与服务器附件契约', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset()
  })

  it('全量读取 TECH_SPEC，名称、修订号及保存版本以主库顶层为准', async () => {
    vi.mocked(apiFetch).mockResolvedValue([
      buildTechnicalSpecificationMasterLibraryResponse(),
    ])
    const [document] = await SpecsService.getSpecs()
    expect(apiFetch).toHaveBeenCalledWith(
      '/engineering/specs?options=true&type=TECH_SPEC'
    )
    expect(document).toMatchObject({
      name: '主库权威名称',
      revisionNo: 'V2.3',
      version: 8,
      code: 'SPEC-SERVER-CODE',
    })
  })

  it('主库读取失败向调用方传播，不能伪装成空主库', async () => {
    vi.mocked(apiFetch).mockRejectedValue(new Error('主库服务不可用'))
    await expect(SpecsService.getSpecs()).rejects.toThrow('主库服务不可用')
  })

  it('顶层说明已清空时不从旧嵌套副本恢复，停用状态也保留', async () => {
    const response = buildTechnicalSpecificationMasterLibraryResponse()
    vi.mocked(apiFetch).mockResolvedValue({
      ...response,
      description: undefined,
      active: false,
      specData: { ...response.specData, description: '已被清空的旧说明' },
    })
    const document = await SpecsService.getSpec(response.id)
    expect(document.description).toBe('')
    expect(document.active).toBe(false)
    await SpecsService.saveSpec(document)
    const request = vi.mocked(apiFetch).mock.calls[1][1]
    const payload = JSON.parse(request?.body as string)
    expect(payload).toMatchObject({ active: false, description: '' })
    expect(payload.specData).toEqual({
      category: 'SOP',
      fileUrl: '/uploads/shared.pdf',
      fileExtension: 'pdf',
    })
  })

  it('技术规范专用字段由主库服务校验，错误类型不会进入通用传输层', async () => {
    await expect(
      SpecsService.saveSpec({
        id: '',
        name: '无效文档',
        category: null,
        createdAt: '',
      } as unknown as TechnicalSpec)
    ).rejects.toThrow()
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it('通用工程传输层允许其他工程域维护自己的数据结构', async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      ...buildTechnicalSpecificationMasterLibraryResponse(),
      type: 'OTHER_ENGINEERING_PARAMETERS',
      specData: {
        category: { primary: '自有分类结构' },
        version: '自有版本字段',
      },
    })
    await engineeringSpecService.saveSpec({
      name: '其他工程数据',
      type: 'OTHER_ENGINEERING_PARAMETERS',
      active: true,
      version: 1,
      specData: {
        category: { primary: '自有分类结构' },
        version: '自有版本字段',
      },
    })
    const request = vi.mocked(apiFetch).mock.calls[0][1]
    expect(JSON.parse(request?.body as string).specData).toEqual({
      category: { primary: '自有分类结构' },
      version: '自有版本字段',
    })
  })

  it('按 id 查看时拒绝其他工程数据类型', async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      ...buildTechnicalSpecificationMasterLibraryResponse(),
      type: 'DRILLING_PLAN',
    })
    await expect(SpecsService.getSpec('saved-specification')).rejects.toThrow(
      '不属于'
    )
  })

  it('新建发送主库保存请求并采用服务端身份，不在客户端伪造编码', async () => {
    vi.mocked(apiFetch).mockResolvedValue(
      buildTechnicalSpecificationMasterLibraryResponse()
    )
    const saved = await SpecsService.saveSpec({
      id: '',
      name: '新增工艺',
      category: 'SOP',
      revisionNo: 'V1.0',
      version: 1,
      createdAt: '',
      fileUrl: '/uploads/shared.pdf',
    })
    const [endpoint, request] = vi.mocked(apiFetch).mock.calls[0]
    expect(endpoint).toBe('/engineering/specs')
    expect(request?.method).toBe('POST')
    expect(JSON.parse(request?.body as string)).toMatchObject({
      id: '',
      type: 'TECH_SPEC',
      name: '新增工艺',
      revisionNo: 'V1.0',
      specData: { fileUrl: '/uploads/shared.pdf' },
    })
    expect(JSON.parse(request?.body as string).code).toBeUndefined()
    expect(saved.code).toBe('SPEC-SERVER-CODE')
  })

  it('修改使用主库 PATCH、并发版本及正确字段路径', async () => {
    vi.mocked(apiFetch).mockResolvedValue(
      buildTechnicalSpecificationMasterLibraryResponse()
    )
    await SpecsService.patchSpec(
      'saved-specification',
      {
        name: { o: '旧名称', n: '新名称' },
        revisionNo: { o: 'V1', n: 'V2' },
        fileUrl: { o: '/uploads/old.pdf', n: '/uploads/new.pdf' },
      },
      7
    )
    const [endpoint, request] = vi.mocked(apiFetch).mock.calls[0]
    expect(endpoint).toBe('/engineering/specs/saved-specification')
    expect(JSON.parse(request?.body as string)).toMatchObject({
      op: 'PATCH',
      metadata: { id: 'saved-specification', version: 7 },
      delta: {
        name: { n: '新名称' },
        revisionNo: { n: 'V2' },
        'specData.fileUrl': { n: '/uploads/new.pdf' },
      },
    })
  })

  it('附件通过通用服务器上传，以便跨电脑读取', async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      url: '/uploads/server.pdf',
      fileName: '成型工艺.pdf',
      status: 'ok',
      size: 10,
    })
    const attachment = new File(['%PDF-1.4'], '成型工艺.pdf', {
      type: 'application/pdf',
    })
    await expect(
      uploadTechnicalSpecificationDocumentSourceFile(attachment)
    ).resolves.toEqual({
      url: '/uploads/server.pdf',
      extension: 'pdf',
      fileName: '成型工艺.pdf',
    })
    const [endpoint, request] = vi.mocked(apiFetch).mock.calls[0]
    expect(endpoint).toBe('/assets/upload')
    expect(request?.body).toBeInstanceOf(FormData)
    expect((request?.body as FormData).get('file')).toBe(attachment)
  })

  it('不支持的附件格式不会发起上传', async () => {
    await expect(
      uploadTechnicalSpecificationDocumentSourceFile(
        new File(['x'], '工艺.exe')
      )
    ).rejects.toThrow('支持 PDF')
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it('服务器相对附件地址解析到 API 服务，拒绝本地临时地址和路径穿越', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://engineering.example.test')
    try {
      await expect(
        FileResolverService.resolveFileUrl('/uploads/shared.pdf')
      ).resolves.toBe('https://engineering.example.test/uploads/shared.pdf')
      for (const invalid of [
        'file-browser-only',
        'javascript:alert(1)',
        '/uploads/../private.pdf',
        '/uploads/%2e%2e/private.pdf',
        '/uploads/..\\private.pdf',
      ]) {
        await expect(
          FileResolverService.resolveFileUrl(invalid)
        ).resolves.toBeNull()
      }
    } finally {
      vi.unstubAllEnvs()
    }
  })
})
