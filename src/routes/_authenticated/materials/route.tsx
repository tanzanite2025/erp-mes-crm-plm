import { createFileRoute, Outlet } from '@tanstack/react-router'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { DictionaryCoreService } from '@/features/basic-settings/services/dictionary-core-service'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Settings2, Package2 } from 'lucide-react'
import { DictionaryEntryManagerDialog } from '@/features/basic-settings/components/dictionary-entry-manager-dialog'
import { PageHeader } from '@/components/layout/page-header'
import { getMaterialStaticTabs } from '@/features/material-archive/tab-config'
import { useLanguage } from '@/context/language-provider'

export const Route = createFileRoute('/_authenticated/materials')({
  component: MaterialsLayout,
})

function MaterialsLayout() {
  const { t } = useLanguage()
  const [tabs, setTabs] = useState<{ key: string; label: string; href: string }[]>([])
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)

  useEffect(() => {
    const updateTabs = () => {
      const options = DictionaryCoreService.getOptions('MATERIAL_CATEGORY')
      const dynamicTabs = options.map((opt) => ({
        key: opt.value.toLowerCase(),
        label: opt.label,
        href: `/materials/${opt.value}`,
      }))

      setTabs([...getMaterialStaticTabs(t), ...dynamicTabs])
    }

    updateTabs()
    window.addEventListener('xdfc_dictionary_updated', updateTabs)
    return () => window.removeEventListener('xdfc_dictionary_updated', updateTabs)
  }, [t])

  return (
    <>
      <ModuleTabbedLayout
        tabs={tabs}
        actions={
          <Button
            variant='ghost'
            size='sm'
            className='h-8 w-8 rounded-full hover:bg-muted/50'
            onClick={() => setIsCategoryDialogOpen(true)}
            title={t('materialArchive.layout.manageCategories')}
          >
            <Settings2 className='size-4 text-muted-foreground' />
          </Button>
        }
      >
        <div className='flex flex-col gap-8'>
          <PageHeader
            icon={Package2}
            title={t('materialArchive.layout.title')}
            description={t('materialArchive.layout.description')}
          />
          <Outlet />
        </div>
      </ModuleTabbedLayout>

      <DictionaryEntryManagerDialog
        open={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        entryCode='MATERIAL_CATEGORY'
        title={t('materialArchive.layout.categoryDialogTitle')}
        description={t('materialArchive.layout.categoryDialogDescription')}
      />
    </>
  )
}
