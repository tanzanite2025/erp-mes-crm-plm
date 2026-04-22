import { useState } from 'react'
import {
  CheckCircle2,
  FolderTree,
  ListChecks,
  Plus,
  ShieldAlert,
} from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { IndustrialActionBar } from '@/components/uds/industrial-action-bar'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { CommandCategoryCard } from './components/command-category-card'
import { CommandCategoryFormDialog } from './components/command-category-form-dialog'
import { CommandLibraryCard } from './components/command-library-card'
import { CommandLibraryFormDialog } from './components/command-library-form-dialog'
import { SidebarCommandShell } from './components/sidebar-command-shell'
import { useSidebarCommandLibraryViewModel } from './hooks/use-sidebar-command-library'

export function SidebarCommandLibraryPage() {
  const { t } = useLanguage()
  const [librarySection, setLibrarySection] = useState<
    'commands' | 'categories'
  >('commands')
  const {
    query,
    setQuery,
    isFormOpen,
    isCategoryFormOpen,
    formRevision,
    categoryFormRevision,
    editingCommand,
    editingCategory,
    commands,
    categories,
    commandsQuery,
    categoriesQuery,
    totalCount,
    totalCategoryCount,
    enabledCount,
    enabledCategoryCount,
    assignableCount,
    isSaving,
    isCategorySaving,
    openCreateForm,
    openEditForm,
    openCreateCategoryForm,
    openEditCategoryForm,
    closeForm,
    closeCategoryForm,
    saveCommand,
    saveCategory,
    toggleCommandEnabled,
    toggleCategoryEnabled,
    moveCommand,
  } = useSidebarCommandLibraryViewModel()
  const defaultSortOrder =
    commands.reduce((max, command) => Math.max(max, command.sortOrder), 0) + 10
  const defaultCategorySortOrder =
    categories.reduce((max, category) => Math.max(max, category.sortOrder), 0) +
    10
  const isCategorySection = librarySection === 'categories'

  return (
    <SidebarCommandShell>
      <IndustrialHeader
        icon={ListChecks}
        title={t('sidebarCommandAssignment.library.title')}
        description={t('sidebarCommandAssignment.library.description')}
        gradient
        statusBadge={
          <div className='flex w-fit shrink-0 items-center gap-4 rounded-full border border-primary/10 bg-primary/5 px-4 py-1'>
            <span className='text-[10px] font-black tracking-widest text-primary/60 uppercase italic'>
              {isCategorySection ? enabledCategoryCount : enabledCount} ENABLED
            </span>
            <div className='size-1.5 animate-pulse rounded-full bg-emerald-500' />
          </div>
        }
      />

      <IndustrialActionBar
        searchPlaceholder={t(
          'sidebarCommandAssignment.library.searchPlaceholder'
        )}
        searchValue={query}
        onSearchChange={setQuery}
        leftContent={
          <div className='flex min-w-fit items-center gap-2 rounded-full border border-dashed border-muted/50 bg-background/60 px-4 py-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase shadow-sm'>
            {isCategorySection ? (
              <FolderTree className='size-3.5' />
            ) : (
              <CheckCircle2 className='size-3.5' />
            )}
            {isCategorySection
              ? t('sidebarCommandAssignment.library.categoryTotal', {
                  count: totalCategoryCount,
                })
              : t('sidebarCommandAssignment.library.total', {
                  count: totalCount,
                })}
          </div>
        }
        rightContent={
          <>
            <div className='flex min-w-fit items-center gap-2 rounded-full border border-dashed border-muted/50 bg-background/60 px-4 py-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase shadow-sm'>
              {isCategorySection
                ? t('sidebarCommandAssignment.library.enabledCategories', {
                    count: enabledCategoryCount,
                  })
                : t('sidebarCommandAssignment.library.assignable', {
                    count: assignableCount,
                  })}
            </div>
            <Button
              className='h-11 rounded-full px-6 text-[10px] font-black tracking-widest shadow-lg shadow-primary/10 active:scale-95'
              onClick={
                isCategorySection ? openCreateCategoryForm : openCreateForm
              }
            >
              <Plus className='size-4' />
              {isCategorySection
                ? t('sidebarCommandAssignment.library.addCategory')
                : t('sidebarCommandAssignment.library.add')}
            </Button>
          </>
        }
      />

      <Tabs
        value={librarySection}
        onValueChange={(value) =>
          setLibrarySection(value === 'categories' ? 'categories' : 'commands')
        }
        className='gap-5'
      >
        <TabsList className='grid h-11 w-full max-w-md grid-cols-2 rounded-full bg-muted/50 p-1'>
          <TabsTrigger
            value='commands'
            className='rounded-full text-[10px] font-black tracking-widest'
          >
            {t('sidebarCommandAssignment.library.sections.commands')}
          </TabsTrigger>
          <TabsTrigger
            value='categories'
            className='rounded-full text-[10px] font-black tracking-widest'
          >
            {t('sidebarCommandAssignment.library.sections.categories')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value='commands' className='m-0'>
          <div className='grid gap-3 xl:grid-cols-2 2xl:grid-cols-3'>
            {commands.map((command) => (
              <CommandLibraryCard
                key={command.commandId}
                command={command}
                isSaving={isSaving}
                onEdit={openEditForm}
                onToggleEnabled={toggleCommandEnabled}
                onMove={moveCommand}
              />
            ))}

            {commands.length === 0 ? (
              <div className='rounded-[32px] border border-dashed border-muted/50 bg-muted/5 px-4 py-16 text-center shadow-inner xl:col-span-2'>
                <ShieldAlert className='mx-auto mb-4 size-8 text-muted-foreground/40' />
                <p className='text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                  {commandsQuery.isLoading
                    ? t('sidebarCommandAssignment.library.loading')
                    : t('sidebarCommandAssignment.library.empty')}
                </p>
              </div>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value='categories' className='m-0'>
          <div className='grid gap-3 xl:grid-cols-2 2xl:grid-cols-3'>
            {categories.map((category) => (
              <CommandCategoryCard
                key={category.categoryId}
                category={category}
                isSaving={isCategorySaving}
                onEdit={openEditCategoryForm}
                onToggleEnabled={toggleCategoryEnabled}
              />
            ))}

            {categories.length === 0 ? (
              <div className='rounded-[32px] border border-dashed border-muted/50 bg-muted/5 px-4 py-16 text-center shadow-inner xl:col-span-2'>
                <ShieldAlert className='mx-auto mb-4 size-8 text-muted-foreground/40' />
                <p className='text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                  {categoriesQuery.isLoading
                    ? t('sidebarCommandAssignment.library.categoryLoading')
                    : t('sidebarCommandAssignment.library.categoryEmpty')}
                </p>
              </div>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>

      <CommandLibraryFormDialog
        key={`command-form-${formRevision}`}
        open={isFormOpen}
        command={editingCommand}
        categories={categories}
        defaultSortOrder={defaultSortOrder}
        isSaving={isSaving}
        onOpenChange={(open) => {
          if (!open) {
            closeForm()
            return
          }
          openCreateForm()
        }}
        onSubmit={saveCommand}
      />
      <CommandCategoryFormDialog
        key={`category-form-${categoryFormRevision}`}
        open={isCategoryFormOpen}
        category={editingCategory}
        defaultSortOrder={defaultCategorySortOrder}
        isSaving={isCategorySaving}
        onOpenChange={(open) => {
          if (!open) {
            closeCategoryForm()
            return
          }
          openCreateCategoryForm()
        }}
        onSubmit={saveCategory}
      />
    </SidebarCommandShell>
  )
}
