import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse } from '@/lib/api-response'
import { createLogger } from '@/lib/logger'
import { 
    type DictionaryEntry, 
    type DictionaryGroup, 
    type DictionaryOption,
    dictionaryGroupSchema,
    dictionaryEntrySchema
} from '../data/schema'

const logger = createLogger('DictionaryCoreService')

/**
 * DictionaryCoreServiceImpl - 字典核心查询服务实现类
 * 职责: 负责字典数据的只读拉取、内存缓存与高性能解析。
 */
class DictionaryCoreServiceImpl {
    private groups: DictionaryGroup[] = []
    private entries: DictionaryEntry[] = []
    private isInitialized = false
    private initPromise: Promise<void> | null = null

    /**
     * 初始化字典数据 (并发保护)
     */
    async init(): Promise<void> {
        if (this.isInitialized) return
        if (this.initPromise) return this.initPromise

        this.initPromise = this.loadFromBackend()
        try {
            await this.initPromise
        } finally {
            this.initPromise = null
        }
    }

    /**
     * 等待初始化完成 (外部 Hook 调用点)
     */
    async waitUntilReady(): Promise<void> {
        if (this.isInitialized) return
        return this.init()
    }

    private async loadFromBackend(): Promise<void> {
        try {
            const [rawGroups, rawEntries] = await Promise.all([
                apiFetch<unknown[]>('/dictionary/groups'),
                apiFetch<unknown[]>('/dictionary/entries'),
            ])

            // 强制 Zod 校验与数据解析
            this.groups = ensureArrayResponse<unknown>(rawGroups, 'DictionaryCoreService.groups')
                .map(g => {
                    const result = dictionaryGroupSchema.safeParse(g)
                    if (!result.success) {
                        logger.error('Group validation failed', result.error)
                        throw new Error(`[CRITICAL] Dictionary Group ${JSON.stringify(g)} failed validation`)
                    }
                    return result.data
                })

            this.entries = ensureArrayResponse<unknown>(rawEntries, 'DictionaryCoreService.entries')
                .map(e => {
                    const result = dictionaryEntrySchema.safeParse(e)
                    if (!result.success) {
                        logger.error('Entry validation failed', result.error)
                        throw new Error(`[CRITICAL] Dictionary Entry ${JSON.stringify(e)} failed validation`)
                    }
                    
                    const entry = result.data
                    // 继承并优化解析逻辑
                    let rawOptions: any = entry.options

                    if (typeof rawOptions === 'string') {
                        try {
                            rawOptions = JSON.parse(rawOptions)
                        } catch {
                            try {
                                rawOptions = JSON.parse(atob(rawOptions))
                            } catch {
                                logger.error('Options parse failed', entry.code)
                                rawOptions = []
                            }
                        }
                    }

                    return { 
                        ...entry, 
                        options: Array.isArray(rawOptions) ? rawOptions : [] 
                    } as DictionaryEntry
                })

            this.isInitialized = true
            // 发送全局更新信号
            window.dispatchEvent(new CustomEvent('xdfc_dictionary_updated'))
            logger.info(`Initialized: ${this.groups.length} groups, ${this.entries.length} entries.`)
        } catch (err) {
            logger.error('Dictionary load failed', err)
            throw err
        }
    }

    /**
     * 获取指定分组下值的显示文本
     */
    getLabel(groupCode: string, value: string | number): string {
        const targetGroup = this.groups.find(g => g.code === groupCode)
        if (!targetGroup) return String(value || '')

        const entry = this.entries.find(item => 
            item.groupId === targetGroup.id &&
            (item.options as any[])?.some((option: any) =>
                (typeof option === 'string' ? option : option.value) === String(value)
            )
        )

        if (entry) {
            const option = (entry.options as any[]).find(
                (item: any) => (typeof item === 'string' ? item : item.value) === String(value)
            )
            if (option) {
                return typeof option === 'string' ? option : option.label
            }
        }

        return String(value || '未定义')
    }

    getGroups(): DictionaryGroup[] {
        return this.groups
    }

    getEntries(groupId?: string): DictionaryEntry[] {
        return groupId 
            ? this.entries.filter(e => e.groupId === groupId)
            : this.entries
    }

    /**
     * 获取指定编码的下拉选项
     */
    getOptions(entryCode: string): DictionaryOption[] {
        const entry = this.entries.find(e => e.code === entryCode)
        if (!entry) return []
        return (entry.options || []) as DictionaryOption[]
    }
}

export const DictionaryCoreService = new DictionaryCoreServiceImpl()
