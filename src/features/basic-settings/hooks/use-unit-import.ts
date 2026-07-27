import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { translate, type AppLocale, type TranslationKey } from '@/locales'
import type { CellValue, Worksheet } from 'exceljs'
import { toast } from 'sonner'
import { loadExcelJS } from '@/lib/lazy-vendors'
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

function stringifyExcelCellValue(value: CellValue): string {
  if (value === null || value === undefined) {
    return ''
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }

  if (typeof value === 'object') {
    if ('text' in value && value.text !== undefined) {
      return String(value.text)
    }
    if ('result' in value) {
      return stringifyExcelCellValue(value.result as CellValue)
    }
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join('')
    }
  }

  return String(value)
}

function worksheetToRows(sheet: Worksheet): Array<Record<string, unknown>> {
  const headers = new Map<number, string>()
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const header = stringifyExcelCellValue(cell.value).trim()
    if (header) {
      headers.set(colNumber, header)
    }
  })

  const rows: Array<Record<string, unknown>> = []
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) {
      return
    }

    const item: Record<string, unknown> = {}
    let hasValue = false
    headers.forEach((header, colNumber) => {
      const value = stringifyExcelCellValue(row.getCell(colNumber).value).trim()
      item[header] = value
      hasValue ||= value !== ''
    })

    if (hasValue) {
      rows.push(item)
    }
  })

  return rows
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
      const { default: ExcelJS } = await loadExcelJS()
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(buffer)
      const firstSheet = workbook.worksheets[0]
      const rows = firstSheet ? worksheetToRows(firstSheet) : []

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
