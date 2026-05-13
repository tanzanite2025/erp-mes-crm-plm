继续执行 Wave 9# BOM 性能优化集成指南

本文档说明如何将 BOM 性能优化功能集成到现有的 `bom-mgmt.tsx` 组件中。

## 集成概述

性能优化通过功能开关（Feature Flags）进行控制，支持渐进式发布：
1. 开发环境测试
2. 10% 用户灰度
3. 50% 用户扩大
4. 100% 全量发布

## 集成步骤

### 步骤 1：导入性能优化组件和 Hooks

```typescript
// 在 bom-mgmt.tsx 顶部添加导入
import { getBOMPerformanceFeatureFlags } from '../config/feature-flags';
import { useBOMPerformanceMonitor } from '@/lib/performance/use-bom-performance-monitor';
import { BOMPerformanceDashboard } from '../components/bom-performance-dashboard';
import { VirtualScrollerErrorBoundary } from '../components/virtual-scroller-error-boundary';
import { BOMVirtualTable } from '../components/bom-virtual-table';
```

### 步骤 2：在组件中添加性能监控

```typescript
export function BOMMgmt() {
  const { t } = useLanguage();
  
  // 获取功能开关
  const featureFlags = getBOMPerformanceFeatureFlags();
  
  // 添加性能监控（如果启用）
  const { monitor, monitorEdit, monitorCommit } = useBOMPerformanceMonitor({
    enableInitialRenderMonitoring: featureFlags.enablePerformanceMonitoring,
  });
  
  // ... 现有代码 ...
}
```

### 步骤 3：条件渲染优化表格或传统表格

```typescript
{viewMode === 'preview' && previewBOM ? (
  <div className='rounded-[32px] border border-dashed border-muted/50 bg-background/80 overflow-hidden'>
    <BOMPreview
      bom={previewBOM}
      products={bomProducts}
      productDisplayLabelMap={bomProductDisplayLabelMap}
      materials={bomMaterials}
      sections={bomSections}
      onBack={closePreview}
    />
  </div>
) : featureFlags.enableVirtualScrolling ? (
  // 使用优化的虚拟滚动表格
  <VirtualScrollerErrorBoundary>
    <BOMVirtualTable
      data={bomTableData}
      products={bomProducts}
      sections={bomSections}
      isLoading={isLoading}
      onPreview={setPreviewBOM}
      onEdit={openEditDialog}
      onDerive={handleDerive}
      onDelete={deleteBOM}
      performanceMonitor={featureFlags.enablePerformanceMonitoring ? monitor : undefined}
    />
  </VirtualScrollerErrorBoundary>
) : (
  // 使用传统表格（向后兼容）
  <BOMTable
    data={bomTableData}
    products={bomProducts}
    sections={bomSections}
    isLoading={isLoading}
    onPreview={setPreviewBOM}
    onEdit={openEditDialog}
    onDerive={handleDerive}
    onDelete={deleteBOM}
  />
)}
```

### 步骤 4：添加性能仪表板（可选）

```typescript
{featureFlags.showPerformanceDashboard && featureFlags.enablePerformanceMonitoring && (
  <div className='mt-4'>
    <BOMPerformanceDashboard monitor={monitor} />
  </div>
)}
```

## 完整集成示例

```typescript
'use client'

import { useState } from 'react'
import { AlertTriangle, Layers } from 'lucide-react'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { useLanguage } from '@/context/language-provider'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import { BOMActionDialog } from '../components/bom-action-dialog'
import { BOMPreview } from '../components/bom-mgmt/bom-preview'
import { BOMTable } from '../components/bom-mgmt/bom-table'
import { BOMToolbar } from '../components/bom-mgmt/bom-toolbar'
import { useBOMData } from '../hooks/use-bom-data'
import { type BOM } from '../data/schema'
import { type BOMItemDraft, type SaveBOMInput } from '../mutation-types'

// 性能优化导入
import { getBOMPerformanceFeatureFlags } from '../config/feature-flags'
import { useBOMPerformanceMonitor } from '@/lib/performance/use-bom-performance-monitor'
import { BOMPerformanceDashboard } from '../components/bom-performance-dashboard'
import { VirtualScrollerErrorBoundary } from '../components/virtual-scroller-error-boundary'
import { BOMVirtualTable } from '../components/bom-virtual-table'

export function BOMMgmt() {
  const { t } = useLanguage()
  
  // 获取功能开关
  const featureFlags = getBOMPerformanceFeatureFlags()
  
  // 性能监控
  const { monitor, monitorEdit, monitorCommit } = useBOMPerformanceMonitor({
    enableInitialRenderMonitoring: featureFlags.enablePerformanceMonitoring,
  })
  
  const {
    readResource,
    saveBOM,
    deleteBOM,
    promoteBOM,
    deriveMBOM,
    downloadTemplate,
    parseExcel,
  } = useBOMData()

  const [open, setOpen] = useState(false)
  const [currentRow, setCurrentRow] = useState<BOM | undefined>(undefined)
  const [previewBOM, setPreviewBOM] = useState<BOM | null>(null)
  const [initialItems, setInitialItems] = useState<BOMItemDraft[] | undefined>(undefined)
  const [initialProductId, setInitialProductId] = useState<string | undefined>(undefined)

  const resetDialogState = () => {
    setCurrentRow(undefined)
    setInitialItems(undefined)
    setInitialProductId(undefined)
  }

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setOpen(true)
      return
    }

    setOpen(false)
    resetDialogState()
  }

  const openCreateDialog = () => {
    resetDialogState()
    setOpen(true)
  }

  const openEditDialog = (bom: BOM) => {
    // 监控编辑操作
    if (featureFlags.enablePerformanceMonitoring) {
      const endMonitoring = monitorEdit()
      // 在实际编辑完成后调用 endMonitoring()
    }
    
    setInitialItems(undefined)
    setInitialProductId(undefined)
    setCurrentRow(bom)
    setOpen(true)
  }

  const handleUploadExcel = async (file: File) => {
    const result = await parseExcel(file)
    if (!result) return

    setInitialItems(result.items)
    setInitialProductId(result.productId)
    setCurrentRow(undefined)
    setOpen(true)
  }

  const handleFormSubmit = async (formData: SaveBOMInput) => {
    // 监控提交操作
    if (featureFlags.enablePerformanceMonitoring) {
      const saved = await monitorCommit(async () => {
        return await saveBOM({ data: formData })
      })
      if (saved) handleDialogOpenChange(false)
      return saved
    } else {
      const saved = await saveBOM({ data: formData })
      if (saved) handleDialogOpenChange(false)
      return saved
    }
  }

  const closePreview = () => {
    setPreviewBOM(null)
  }

  if (readResource.status === 'error') {
    return (
      <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
        {/* 错误显示 */}
      </div>
    )
  }

  const bomTableData = readResource.status === 'ready' ? readResource.data : []
  const bomProducts = readResource.status === 'ready' ? readResource.products : []
  const bomProductDisplayLabelMap = readResource.status === 'ready' ? readResource.productDisplayLabelMap : new Map<string, string>()
  const bomMaterials = readResource.status === 'ready' ? readResource.materials : []
  const bomSections = readResource.status === 'ready' ? readResource.sections : []
  const isLoading = readResource.status === 'loading'
  const viewMode = previewBOM && readResource.status === 'ready' ? 'preview' : 'list'

  const handleDerive = async (bom: BOM) => {
    if (window.confirm(t('engineering.bomArchive.table.confirmDerive'))) {
      await deriveMBOM(bom.id, {
        description: `Derived from ${bom.bomNo}`,
        revisionNo: 'R1'
      })
    }
  }

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <div className='flex flex-col gap-1 bg-muted/5 p-4 sm:p-6 rounded-[32px] border border-dashed border-muted/50'>
        <div className='flex items-start justify-between gap-3'>
          <div className='flex items-center gap-2 text-primary'>
            <Layers className='size-4 text-primary' />
            <h3 className='text-lg font-black tracking-tighter italic uppercase'>
              {t('engineering.bomArchive.header.title')}
            </h3>
          </div>
          <AuditTimelineTriggerButton
            module={AUDIT_MODULES.bom}
            targetName={t('engineering.bomArchive.header.title')}
            className='h-11 rounded-full border-dashed bg-background/80 px-4 text-[10px] font-black uppercase tracking-widest'
          />
        </div>
        <p className='text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60'>
          {t('engineering.bomArchive.header.description')}
        </p>
      </div>

      {viewMode === 'list' ? (
        <BOMToolbar
          onDownloadTemplate={downloadTemplate}
          onUploadExcel={handleUploadExcel}
          onAddBOM={openCreateDialog}
        />
      ) : null}

      {viewMode === 'preview' && previewBOM ? (
        <div className='rounded-[32px] border border-dashed border-muted/50 bg-background/80 overflow-hidden'>
          <BOMPreview
            bom={previewBOM}
            products={bomProducts}
            productDisplayLabelMap={bomProductDisplayLabelMap}
            materials={bomMaterials}
            sections={bomSections}
            onBack={closePreview}
          />
        </div>
      ) : featureFlags.enableVirtualScrolling ? (
        // 使用优化的虚拟滚动表格
        <VirtualScrollerErrorBoundary>
          <BOMVirtualTable
            data={bomTableData}
            products={bomProducts}
            sections={bomSections}
            isLoading={isLoading}
            onPreview={setPreviewBOM}
            onEdit={openEditDialog}
            onDerive={handleDerive}
            onDelete={deleteBOM}
            performanceMonitor={featureFlags.enablePerformanceMonitoring ? monitor : undefined}
          />
        </VirtualScrollerErrorBoundary>
      ) : (
        // 使用传统表格（向后兼容）
        <BOMTable
          data={bomTableData}
          products={bomProducts}
          sections={bomSections}
          isLoading={isLoading}
          onPreview={setPreviewBOM}
          onEdit={openEditDialog}
          onDerive={handleDerive}
          onDelete={deleteBOM}
        />
      )}

      {/* 性能仪表板（开发/调试用） */}
      {featureFlags.showPerformanceDashboard && featureFlags.enablePerformanceMonitoring && (
        <div className='mt-4'>
          <BOMPerformanceDashboard monitor={monitor} />
        </div>
      )}

      <BOMActionDialog
        open={open}
        onOpenChange={handleDialogOpenChange}
        currentRow={currentRow}
        initialItems={initialItems}
        initialProductId={initialProductId}
        onSubmit={handleFormSubmit}
        onPromote={(id, status, expectedVersion) => promoteBOM(id, status, expectedVersion)}
      />
    </div>
  )
}
```

## 环境变量配置

### 开发环境 (.env.development)
```bash
# 启用所有优化 + 调试工具
VITE_BOM_PERF_ENABLE_ALL=true
VITE_BOM_PERF_SHOW_PERFORMANCE_DASHBOARD=true
VITE_BOM_PERF_ENABLE_DEBUG_LOGGING=true
```

### 预发布环境 (.env.staging)
```bash
# 启用所有优化，隐藏仪表板
VITE_BOM_PERF_ENABLE_ALL=true
VITE_BOM_PERF_SHOW_PERFORMANCE_DASHBOARD=false
VITE_BOM_PERF_ENABLE_DEBUG_LOGGING=false
```

### 生产环境 (.env.production)
```bash
# 灰度发布：先禁用，逐步启用
VITE_BOM_PERF_ENABLE_ALL=false

# 或者启用所有优化
# VITE_BOM_PERF_ENABLE_ALL=true
# VITE_BOM_PERF_SHOW_PERFORMANCE_DASHBOARD=false
# VITE_BOM_PERF_ENABLE_DEBUG_LOGGING=false
```

## 回滚方案

如果发现问题，立即回滚：

```bash
# 方案 1：通过环境变量禁用
VITE_BOM_PERF_ENABLE_ALL=false

# 方案 2：禁用特定优化
VITE_BOM_PERF_ENABLE_VIRTUAL_SCROLLING=false
VITE_BOM_PERF_ENABLE_LAZY_PROXY=false
```

## 监控指标

部署后监控以下指标：
- 初始渲染时间：目标 ≤100ms（1000 行）
- 单字段编辑时间：目标 ≤50ms
- 提交操作时间：目标 ≤50ms（1000 行，10% 脏）
- 活跃 Proxy 数量：目标 ≤4,000（1000 行）
- 错误率：目标 <0.1%

## 注意事项

1. **渐进式发布**：不要一次性全量发布，按照 10% → 50% → 100% 的节奏
2. **监控告警**：设置性能和错误率告警
3. **快速回滚**：准备好回滚脚本，出现问题立即回滚
4. **用户反馈**：收集用户反馈，特别是大数据集用户
5. **兼容性测试**：确保现有功能不受影响

## 下一步

1. 在开发环境测试集成
2. 运行完整的测试套件
3. 进行性能基准测试
4. 准备发布计划
5. 设置监控和告警
