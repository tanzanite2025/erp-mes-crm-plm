'use client'

import { useEffect, useState } from 'react'
import { Loader2, FileSpreadsheet, AlertCircle } from 'lucide-react'
import { loadExcelJS } from '@/lib/lazy-vendors'
import { createLogger } from '@/lib/logger'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const logger = createLogger('ExcelViewer')

interface ExcelViewerProps {
  fileUrl: string
  className?: string
}

interface StyleInfo {
  backgroundColor?: string
  color?: string
  fontWeight?: string
  textAlign?: 'left' | 'center' | 'right'
  verticalAlign?: 'top' | 'middle' | 'bottom'
  borderTop?: string
  borderRight?: string
  borderBottom?: string
  borderLeft?: string
  fontSize?: string
  width?: string
  height?: string
}

interface CellData {
  value: string
  style: StyleInfo
  rowSpan: number
  colSpan: number
  isMerged: boolean
}

interface SheetData {
  name: string
  rows: CellData[][]
  maxCols: number
  colWidths: number[] // 存储物理列宽
}

/**
 * ExcelViewer 组件
 * 解析并展示 Excel 文件内容 (xlsx, xls, csv)
 */
export function ExcelViewer({ fileUrl, className }: ExcelViewerProps) {
  const [sheets, setSheets] = useState<SheetData[]>([])
  const [currentSheetIndex, setCurrentSheetIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadExcel = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch(fileUrl)
        const arrayBuffer = await response.arrayBuffer()

        const { default: ExcelJS } = await loadExcelJS()
        const workbook = new ExcelJS.Workbook()
        await workbook.xlsx.load(arrayBuffer)

        const sheetsData: SheetData[] = workbook.worksheets.map(
          (worksheet: any) => {
            const rows: CellData[][] = []
            let maxCols = 0

            // 1. 提取列宽
            const colWidths: number[] = []
            worksheet.columns?.forEach((col: any, idx: number) => {
              // exceljs 的 width 单位是字符数，粗略转换为 px (基数 7-8px)
              colWidths[idx] = (col.width || 15) * 8
            })

            worksheet.eachRow(
              { includeEmpty: true },
              (row: any, rowNumber: number) => {
                const rowData: CellData[] = []
                maxCols = Math.max(maxCols, row.cellCount)

                row.eachCell(
                  { includeEmpty: true },
                  (cell: any, colNumber: number) => {
                    const address = cell.address
                    const isMaster = cell.address === cell.master.address
                    const isMerged = !isMaster

                    const style: StyleInfo = {
                      // 默认行高映射 (exceljs 单位是磅，1pt ≈ 1.33px)
                      height: row.height ? `${row.height * 1.33}px` : undefined,
                    }

                    // 背景色
                    if (
                      cell.fill?.type === 'pattern' &&
                      cell.fill.fgColor?.argb
                    ) {
                      style.backgroundColor = `#${cell.fill.fgColor.argb.substring(2)}`
                    }

                    // 字体
                    if (cell.font) {
                      if (cell.font.color?.argb)
                        style.color = `#${cell.font.color.argb.substring(2)}`
                      if (cell.font.bold) style.fontWeight = 'bold'
                      if (cell.font.size) style.fontSize = `${cell.font.size}px`
                    }

                    // 对齐
                    if (cell.alignment) {
                      if (cell.alignment.horizontal)
                        style.textAlign = cell.alignment.horizontal as any
                      if (cell.alignment.vertical)
                        style.verticalAlign = cell.alignment.vertical as any
                    }

                    // 精细边框映射
                    if (cell.border) {
                      const mapBorder = (b: any) => {
                        if (!b || b.style === 'none') return undefined
                        const color = b.color?.argb
                          ? `#${b.color.argb.substring(2)}`
                          : '#e2e8f0'
                        const width =
                          b.style === 'thick' || b.style === 'medium'
                            ? '2px'
                            : '1px'
                        return `${width} ${b.style === 'dashed' ? 'dashed' : 'solid'} ${color}`
                      }
                      style.borderTop = mapBorder(cell.border.top)
                      style.borderRight = mapBorder(cell.border.right)
                      style.borderBottom = mapBorder(cell.border.bottom)
                      style.borderLeft = mapBorder(cell.border.left)
                    }

                    let rowSpan = 1
                    let colSpan = 1
                    if (isMaster && cell.isMerged) {
                      const mergeRange = (worksheet as any)._merges?.[address]
                      if (mergeRange) {
                        rowSpan = mergeRange.bottom - mergeRange.top + 1
                        colSpan = mergeRange.right - mergeRange.left + 1
                      }
                    }

                    rowData[colNumber - 1] = {
                      value: cell.text || '',
                      style,
                      rowSpan,
                      colSpan,
                      isMerged,
                    }
                  }
                )
                rows[rowNumber - 1] = rowData
              }
            )

            return { name: worksheet.name, rows, maxCols, colWidths }
          }
        )

        if (!cancelled) {
          setSheets(sheetsData)
          if (sheetsData.length > 0) setCurrentSheetIndex(0)
        }
      } catch (err) {
        logger.error('Failed to parse excel', err)
        setError(
          '无法解析 Excel 文件内容，可能文件已损坏、受加密保护或格式不支持。'
        )
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadExcel()

    return () => {
      cancelled = true
    }
  }, [fileUrl])

  if (isLoading) {
    return (
      <div className='flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/5'>
        <Loader2 className='mb-3 size-8 animate-spin text-emerald-500' />
        <p className='text-xs font-black tracking-widest text-muted-foreground uppercase'>
          分析表格数据结构中...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-red-200 bg-red-500/5 text-red-600'>
        <AlertCircle className='mb-2 size-8 opacity-40' />
        <p className='text-xs font-bold'>{error}</p>
      </div>
    )
  }

  const currentSheet = sheets[currentSheetIndex]

  // 计算当前工作表的最大列数
  const maxCols = currentSheet?.maxCols || 0
  const colIndices = Array.from({ length: maxCols }, (_, i) => i)

  return (
    <div
      className={`flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-inner ${className}`}
    >
      {/* 工作表切换栏 */}
      {sheets.length > 1 && (
        <div className='scrollbar-none overflow-x-auto border-b bg-muted/30 px-4 py-2'>
          <Tabs
            value={currentSheetIndex.toString()}
            onValueChange={(val) => setCurrentSheetIndex(parseInt(val))}
          >
            <TabsList className='h-8 gap-1 bg-transparent p-0'>
              {sheets.map((sheet, idx) => (
                <TabsTrigger
                  key={idx}
                  value={idx.toString()}
                  className='h-7 px-4 text-[10px] font-bold tracking-wider uppercase data-[state=active]:bg-white data-[state=active]:shadow-sm'
                >
                  {sheet.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* 数据展示区 */}
      <div className='min-h-0 flex-1 overflow-auto bg-white'>
        <div className='min-w-full p-4'>
          {currentSheet && currentSheet.rows.length > 0 ? (
            <Table
              className='w-max min-w-full table-auto border-collapse border'
              style={{ borderCollapse: 'collapse' }}
            >
              <TableHeader>
                <TableRow className='h-10 bg-muted/50 hover:bg-transparent'>
                  {/* 生成虚拟列头 (A, B, C...) */}
                  <TableHead className='sticky left-0 z-20 w-12 min-w-[48px] border-r border-b bg-muted/80 text-center font-mono text-[9px] text-muted-foreground'>
                    #
                  </TableHead>
                  {colIndices.map((idx) => {
                    const width = currentSheet.colWidths[idx] || 150
                    return (
                      <TableHead
                        key={idx}
                        className='border-r border-b bg-muted/30 px-4 text-center font-mono text-[9px] whitespace-nowrap text-muted-foreground uppercase'
                        style={{ width: `${width}px`, minWidth: `${width}px` }}
                      >
                        {idx < 26
                          ? String.fromCharCode(65 + idx)
                          : `${String.fromCharCode(64 + Math.floor(idx / 26))}${String.fromCharCode(65 + (idx % 26))}`}
                      </TableHead>
                    )
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentSheet.rows.map((row, rowIdx) => (
                  <TableRow
                    key={rowIdx}
                    className='border-b transition-colors hover:bg-muted/30'
                    style={{ height: row[0]?.style.height }}
                  >
                    <TableCell className='sticky left-0 z-10 w-12 min-w-[48px] border-r bg-muted/10 text-center font-mono text-[9px] font-bold text-muted-foreground/60'>
                      {rowIdx + 1}
                    </TableCell>
                    {colIndices.map((colIdx) => {
                      const cell = row[colIdx]
                      const colWidth = currentSheet.colWidths[colIdx] || 150
                      if (!cell)
                        return (
                          <TableCell
                            key={colIdx}
                            className='border-r border-b'
                            style={{
                              width: `${colWidth}px`,
                              minWidth: `${colWidth}px`,
                            }}
                          />
                        )
                      if (cell.isMerged) return null // 跳过被合并的单元格

                      return (
                        <TableCell
                          key={colIdx}
                          rowSpan={cell.rowSpan}
                          colSpan={cell.colSpan}
                          className='overflow-hidden border-r border-b px-4 text-ellipsis whitespace-nowrap'
                          style={{
                            backgroundColor: cell.style.backgroundColor,
                            color: cell.style.color,
                            fontWeight: cell.style.fontWeight as any,
                            textAlign: cell.style.textAlign,
                            verticalAlign: cell.style.verticalAlign,
                            fontSize: cell.style.fontSize,
                            borderTop: cell.style.borderTop,
                            borderRight: cell.style.borderRight,
                            borderBottom: cell.style.borderBottom,
                            borderLeft: cell.style.borderLeft,
                            width: `${colWidth}px`,
                            minWidth: `${colWidth}px`,
                          }}
                        >
                          {cell.value}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className='flex flex-col items-center justify-center py-20 text-muted-foreground/30'>
              <FileSpreadsheet className='mb-2 size-12 opacity-10' />
              <p className='text-[10px] font-black tracking-widest uppercase'>
                当前工作表无有效数据
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 状态栏 */}
      <div className='flex items-center justify-between border-t bg-emerald-500/5 px-6 py-2 text-[9px] font-bold tracking-tighter text-emerald-700/50 uppercase'>
        <div className='flex items-center gap-2'>
          <div className='size-1.5 animate-pulse rounded-full bg-emerald-500' />
          RENDERED VIA EXCELJS HIGH-FIDELITY ENGINE
        </div>
        <span>
          Rows: {currentSheet?.rows.length || 0} | Max Cols:{' '}
          {currentSheet?.maxCols || 0}
        </span>
      </div>
    </div>
  )
}
