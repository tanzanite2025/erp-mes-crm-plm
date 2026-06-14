import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { translate, type AppLocale, type TranslationKey } from '@/locales'
import { toast } from 'sonner'
import { loadXLSX } from '@/lib/lazy-vendors'
import { createLogger } from '@/lib/logger'
import { useLanguage } from '@/context/language-provider'
import { BASIC_SETTINGS_UNITS_QUERY_KEY } from '../query-keys'
import {
  unitService,
  type Unit,
  type UnitCategory,
} from '../services/unit-service'

const logger = createLogger('useUnitImport')

const LOCALES: AppLocale[] = ['zh-CN', 'en-US']

const CATEGORY_OPTIONS: Array<{
  value: UnitCategory
  labelKey: TranslationKey
}> = [
  { value: 'QUANTITY', labelKey: 'basicSettings.units.categories.quantity' },
  { value: 'WEIGHT', labelKey: 'basicSettings.units.categories.weight' },
  { value: 'LENGTH', labelKey: 'basicSettings.units.categories.length' },
  { value: 'AREA', labelKey: 'basicSettings.units.categories.area' },
  { value: 'VOLUME', labelKey: 'basicSettings.units.categories.volume' },
  { value: 'TIME', labelKey: 'basicSettings.units.categories.time' },
  { value: 'OTHER', labelKey: 'basicSettings.units.categories.other' },
]

/**
 * 助手函数：获取特定多语言键的所有变体（用于表头匹配）
 */
function getHeaderAliases(key: Parameters<typeof translate>[1]) {
  return Array.from(new Set(LOCALES.map((locale) => translate(locale, key))))
}

/**
 * 助手函数：从 Excel 行中尝试读取多个可能的列名
 */
function readRowValue(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim()
    }
  }
  return ''
}

/**
 * 助手函数：将 Excel 中的分类文本标准化为 UnitCategory 枚举
 */
function normalizeCategory(input: string): UnitCategory {
  const normalized = input.trim().toLowerCase()

  for (const option of CATEGORY_OPTIONS) {
    const aliases = new Set(
      LOCALES.map((locale) =>
        translate(locale, option.labelKey).toLowerCase()
      ).concat(option.value.toLowerCase())
    )

    if (aliases.has(normalized)) {
      return option.value
    }
  }

  return 'OTHER'
}

export function useUnitImport(onSuccess: () => void) {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [isImporting, setIsImporting] = useState(false)

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    const toastId = toast.loading(t('basicSettings.units.import.parsing'))

    try {
      const buffer = await file.arrayBuffer()
      const XLSX = await loadXLSX()
      const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(firstSheet) as Array<
        Record<string, unknown>
      >

      const unitsToSync: Array<Omit<Unit, 'id' | 'isSystem'>> = []
      const validationErrors: string[] = []

      rows.forEach((row, index) => {
        const code = readRowValue(row, [
          ...getHeaderAliases('basicSettings.units.excel.headers.code'),
          '单位编码',
        ]).toUpperCase()
        const name = readRowValue(row, [
          ...getHeaderAliases('basicSettings.units.excel.headers.name'),
          '显示名称',
        ])
        const categoryRaw = readRowValue(row, [
          ...getHeaderAliases('basicSettings.units.excel.headers.category'),
          '所属分类',
        ])
        const precisionRaw = readRowValue(row, [
          ...getHeaderAliases('basicSettings.units.excel.headers.precision'),
          '小数精度',
        ])
        const description = readRowValue(row, [
          ...getHeaderAliases('basicSettings.units.excel.headers.description'),
          '备注',
        ])

        if (!code || !name) {
          validationErrors.push(
            t('basicSettings.units.import.missingRequired', { line: index + 2 })
          )
          return
        }

        unitsToSync.push({
          code,
          name,
          category: normalizeCategory(categoryRaw),
          precision: parseInt(precisionRaw || '0', 10) || 0,
          description,
          status: 'active',
        })
      })

      if (validationErrors.length > 0) {
        toast.error(
          `${validationErrors[0]}${
            validationErrors.length > 1
              ? ` ${t('basicSettings.units.import.moreIssues', {
                  count: validationErrors.length - 1,
                })}`
              : ''
          }`,
          { id: toastId }
        )

        if (unitsToSync.length === 0) {
          setIsImporting(false)
          e.target.value = ''
          return
        }
      }

      if (unitsToSync.length === 0) {
        toast.error(t('basicSettings.units.import.noValidData'), {
          id: toastId,
        })
        setIsImporting(false)
        e.target.value = ''
        return
      }

      toast.loading(
        t('basicSettings.units.import.syncing', { count: unitsToSync.length }),
        {
          id: toastId,
        }
      )

      await unitService.sync(unitsToSync)
      await queryClient.invalidateQueries({
        queryKey: BASIC_SETTINGS_UNITS_QUERY_KEY,
      })
      toast.success(
        t('basicSettings.units.import.success', { count: unitsToSync.length }),
        {
          id: toastId,
        }
      )
      onSuccess()
    } catch (error: unknown) {
      logger.error('Unit import failed', error)
      const message =
        error instanceof Error && error.message.trim()
          ? error.message
          : t('basicSettings.units.import.parseFailed')
      toast.error(t('basicSettings.units.import.syncFailed', { message }), {
        id: toastId,
        duration: 5000,
      })
    } finally {
      setIsImporting(false)
      e.target.value = ''
    }
  }

  return {
    isImporting,
    handleExcelImport,
  }
}
