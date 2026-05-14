'use client'

import { type BOM } from '../data/schema'
import { type SaveBOMInput } from '../mutation-types'
import { useBOMImportExport } from './use-bom-import-export'
import { useBOMReadData, type BOMReadDataResource } from './use-bom-read-data'
import { useBOMWriteActions } from './use-bom-write-actions'

interface BOMDataResult {
  readResource: BOMReadDataResource
  saveBOM: (params: { data: SaveBOMInput }) => Promise<boolean>
  deleteBOM: (id: string) => Promise<boolean>
  promoteBOM: (id: string, status: string, expectedVersion: number) => Promise<boolean>
  deriveMBOM: (id: string, params: { description: string; revisionNo: string }) => Promise<boolean>
  reviseMBOM: (
    id: string,
    params: { reason: string; changeOrderNo?: string; revisionNo?: string }
  ) => Promise<boolean>
  downloadTemplate: () => Promise<void>
  parseExcel: ReturnType<typeof useBOMImportExport>['parseExcel']
}

/**
 * BOM 模块的"门面"hook：
 *
 * 职责仅限：
 *   1. 把 useBOMReadData / useBOMWriteActions / useBOMImportExport 三个底层 hook 串起来
 *   2. 从 readResource 中提取 previousBom 快照透传给 write action（让事件派发能拿到上下文）
 *   3. 把所有 mutation 的成功 / 失败统一映射为 `Promise<boolean>`
 *
 * Toast 与具体错误分支由 useBOMWriteActions 内部的 onSuccess / onError 处理；
 * 本 hook **不**再做 toast，避免双重通知。调用方只需要看返回的 boolean
 * 决定是否关闭弹窗或刷新。
 */
export function useBOMData(): BOMDataResult {
  const readResource = useBOMReadData()
  const {
    saveBOM: persistBOM,
    deleteBOM: removeBOM,
    promoteBOM: promoteStatus,
    deriveMBOM: deriveMBOMAction,
    reviseMBOM: reviseMBOMAction,
  } = useBOMWriteActions()
  const { downloadTemplate, parseExcel } = useBOMImportExport({
    products: readResource.status === 'ready' ? readResource.products : [],
    productDisplayLabelMap: readResource.status === 'ready' ? readResource.productDisplayLabelMap : new Map(),
    sections: readResource.status === 'ready' ? readResource.sections : [],
  })

  /**
   * 从已加载的 BOM 列表里取出指定 ID 的当前快照，让 useBOMWriteActions 派发
   * 路由事件时知道 previousStatus / sourceEbom 等上下文。读不到时返回 undefined
   * 不影响主写入流程。
   */
  const getCurrentBomSnapshot = (id: string): BOM | undefined => {
    if (readResource.status !== 'ready') return undefined
    return readResource.data.find((bom) => bom.id === id)
  }

  /** 把 mutation 的 promise 转成 boolean。Toast 已由 mutation 内部 onError 负责。 */
  const resolveAsBool = async (op: () => Promise<unknown>): Promise<boolean> => {
    try {
      await op()
      return true
    } catch {
      return false
    }
  }

  const saveBOM = (params: { data: SaveBOMInput }) => {
    const candidateId = (params.data.id || '').trim()
    const previousBom = candidateId ? getCurrentBomSnapshot(candidateId) : undefined
    return resolveAsBool(() => persistBOM({ data: params.data, previousBom }))
  }

  const deleteBOM = (id: string) => {
    const previousBom = getCurrentBomSnapshot(id)
    return resolveAsBool(() => removeBOM({ id, previousBom }))
  }

  const promoteBOM = (id: string, status: string, expectedVersion: number) => {
    const previousBom = getCurrentBomSnapshot(id)
    return resolveAsBool(() => promoteStatus({ id, status, expectedVersion, previousBom }))
  }

  const deriveMBOM = (id: string, params: { description: string; revisionNo: string }) => {
    const sourceEbom = getCurrentBomSnapshot(id)
    return resolveAsBool(() => deriveMBOMAction({ ebomId: id, input: params, sourceEbom }))
  }

  const reviseMBOM = (
    id: string,
    params: { reason: string; changeOrderNo?: string; revisionNo?: string }
  ) => {
    const previousMbom = getCurrentBomSnapshot(id)
    return resolveAsBool(() =>
      reviseMBOMAction({
        mbomId: id,
        input: { ...params, expectedVersion: previousMbom?.version },
        previousMbom,
      })
    )
  }

  return {
    readResource,
    saveBOM,
    deleteBOM,
    promoteBOM,
    deriveMBOM,
    reviseMBOM,
    downloadTemplate,
    parseExcel,
  }
}
