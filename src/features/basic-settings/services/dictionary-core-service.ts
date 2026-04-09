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

    async refresh(): Promise<void> {
        this.isInitialized = false
        await this.init()
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
                    let rawOptions: any = entry.options

                    // [BACKEND-AUTHORITY]: 基础元数据解析逻辑
                    if (typeof rawOptions === 'string') {
                        try {
                            rawOptions = JSON.parse(rawOptions)
                        } catch {
                            try {
                                rawOptions = JSON.parse(atob(rawOptions))
                            } catch (err) {
                                logger.error('Options parse failed', entry.code)
                                // [FAIL-LOUDLY]: 元数据损坏必须阻断系统运行
                                throw new Error(`[CRITICAL] Dictionary Entry "${entry.code}" has corrupted options: ${err}`)
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
        // [FAIL-LOUDLY]: 分组不存在说明业务代码引用了无效的元数据系统定义
        if (!targetGroup) {
            logger.error(`[CRITICAL] Dictionary Group "${groupCode}" not found in current index`)
            return `[MISSING_GROUP:${groupCode}]`
        }

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

        // [FAIL-LOUDLY]: 明确未匹配状态
        return `[UNDEFINED_VAL:${value}]`
    }

    getGroups(): DictionaryGroup[] {
        return this.groups
    }

    getGroupById(groupId: string): DictionaryGroup | undefined {
        return this.groups.find((group) => group.id === groupId)
    }

    getGroupByCode(groupCode: string): DictionaryGroup | undefined {
        return this.groups.find((group) => group.code === groupCode)
    }

    getEntries(groupId?: string): DictionaryEntry[] {
        return groupId 
            ? this.entries.filter(e => e.groupId === groupId)
            : this.entries
    }

    getEntryById(entryId: string): DictionaryEntry | undefined {
        return this.entries.find((entry) => entry.id === entryId)
    }

    getEntryByCode(entryCode: string): DictionaryEntry | undefined {
        return this.entries.find((entry) => entry.code === entryCode)
    }

    /**
     * 获取指定编码的下拉选项
     */
    getOptions(entryCode: string): DictionaryOption[] {
        const entry = this.entries.find(e => e.code === entryCode)
        // [FAIL-LOUDLY]: 业务逻辑请求不存在的字典 Entry 编码，严禁返回 [] 导致渲染空列表引起误操作
        if (!entry) {
            const msg = `[CRITICAL] Required Dictionary Entry "${entryCode}" is missing from system`
            logger.error(msg)
            throw new Error(msg)
        }
        return (entry.options || []) as DictionaryOption[]
    }
}

export const DictionaryCoreService = new DictionaryCoreServiceImpl()
