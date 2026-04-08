import { apiFetch } from '@/lib/api-client'
import { createLogger } from '@/lib/logger'
import { DictionaryEntry, DictionaryGroup } from '../data/schema'
import { DictionaryCoreService } from './dictionary-core-service'

const logger = createLogger('DictionaryMaintenanceService')

/**
 * DictionaryMaintenanceService - 字典维护与同步服务
 * 职责: 负责字典数据的增删改 (POST/PATCH) 以及系统级同步。
 * 遵循 [Backend Authority] 核心哲学，维护操作后需强制重新加载或原子更新。
 */
export const DictionaryMaintenanceService = {
    /**
     * 更新单个字典项的选项
     */
    async updateEntry(entryCode: string, options: any[]): Promise<void> {
        const entry = DictionaryCoreService.getEntries().find((item) => item.code === entryCode)
        if (!entry) throw new Error(`[CRITICAL] Dictionary entry ${entryCode} not found for update`)

        const updatedEntry = { ...entry, options }

        try {
            await apiFetch('/dictionary/entries', {
                method: 'POST',
                body: JSON.stringify(updatedEntry),
            })
            
            // 变更后重新初始化 CoreService 以保证数据最终一致性
            await DictionaryCoreService.init()
            window.dispatchEvent(new CustomEvent('xdfc_dictionary_updated'))
        } catch (err) {
            logger.error('Update entry failed', err)
            throw err
        }
    },

    /**
     * 批量保存字典组
     */
    async saveGroups(groups: DictionaryGroup[]): Promise<void> {
        try {
            for (const group of groups) {
                await apiFetch('/dictionary/groups', { 
                    method: 'POST', 
                    body: JSON.stringify(group) 
                })
            }
            await DictionaryCoreService.init()
            window.dispatchEvent(new CustomEvent('xdfc_dictionary_updated'))
        } catch (err) {
            logger.error('Save groups failed', err)
            throw err
        }
    },

    /**
     * 批量保存字典项
     */
    async saveEntries(entries: DictionaryEntry[]): Promise<void> {
        try {
            for (const entry of entries) {
                await apiFetch('/dictionary/entries', { 
                    method: 'POST', 
                    body: JSON.stringify(entry) 
                })
            }
            await DictionaryCoreService.init()
            window.dispatchEvent(new CustomEvent('xdfc_dictionary_updated'))
        } catch (err) {
            logger.error('Save entries failed', err)
            throw err
        }
    },

    /**
     * 系统级字典同步 (离线/云端一致性触发器)
     */
    async syncSystemDictionary(): Promise<void> {
        try {
            await apiFetch('/dictionary/sync', { method: 'POST' })
            // 同步后彻底重置 CoreService
            await DictionaryCoreService.init()
            window.dispatchEvent(new CustomEvent('xdfc_dictionary_updated'))
        } catch (err) {
            logger.error('System sync failed', err)
            throw err
        }
    }
}
