import { useState, useEffect, useCallback } from 'react'
import { createLogger } from '@/lib/logger'
import { dictionaryService } from '../services/dictionary-service'
import { DictionaryOption, DictionaryEntry } from '../data/schema'

const logger = createLogger('useDictionary')

/**
 * useDictionary - 工业级参数字典消费钩子
 * @param groupCode 字典组编码 (如 'MATERIALS')
 * @returns { isLoading, options, getLabel, entries }
 */
export function useDictionary(groupCode?: string) {
    const [isLoading, setIsLoading] = useState(true)

    const refresh = useCallback(() => {
        setIsLoading(false)
    }, [])

    useEffect(() => {
        let isMounted = true

        const init = async () => {
            setIsLoading(true)
            try {
                // 核心：调用 Service 的阻塞信号，确保并发组件渲染前数据已就绪
                await dictionaryService.waitUntilReady()
                if (isMounted) {
                    refresh()
                }
            } catch (err) {
                logger.error(`Failed to load dictionary for ${groupCode}`, err)
            } finally {
                if (isMounted) setIsLoading(false)
            }
        }

        init()

        // 监听全局更新事件，实时同步 UI
        window.addEventListener('xdfc_dictionary_updated', refresh)
        return () => {
            isMounted = false
            window.removeEventListener('xdfc_dictionary_updated', refresh)
        }
    }, [groupCode, refresh])

    /**
     * 获取指定条目的选项列表
     */
    const getOptions = (entryCode: string): DictionaryOption[] => {
        return dictionaryService.getOptions(entryCode)
    }

    /**
     * 获取字典转换后的 Label
     */
    const getLabel = (value: string | number): string => {
        if (!groupCode) return String(value)
        return dictionaryService.getLabel(groupCode, value)
    }

    /**
     * 获取该分组下的所有条目
     */
    const getEntries = (): DictionaryEntry[] => {
        if (!groupCode) return []
        const groups = dictionaryService.getGroups()
        const targetGroup = groups.find(g => g.code === groupCode)
        if (!targetGroup) return []
        return dictionaryService.getEntries(targetGroup.id)
    }

    return {
        isLoading,
        getOptions,
        getLabel,
        getEntries,
        // 返回原始 Service 实例以备不时之需
        service: dictionaryService
    }
}
