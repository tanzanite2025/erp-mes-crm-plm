import { ArrowRight, Laptop, Moon, Sun } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import type { SearchItem } from './layout/data/search-data'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { ScrollArea } from './ui/scroll-area'

interface CommandMenuViewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  searchValue: string
  onSearchChange: (value: string) => void
  isSearching: boolean
  groupedItems: Record<string, SearchItem[]>
  asyncResults: SearchItem[]
  onItemSelect: (href: string) => void
  onThemeSelect: (theme: 'light' | 'dark' | 'system') => void
}

export function CommandMenuView({
  open,
  onOpenChange,
  searchValue,
  onSearchChange,
  isSearching,
  groupedItems,
  asyncResults,
  onItemSelect,
  onThemeSelect,
}: CommandMenuViewProps) {
  const { t } = useLanguage()

  const categoryLabels: Record<string, string> = {
    navigation: t('commandMenu.headings.navigation'),
    modules: t('commandMenu.headings.modules'),
    actions: t('commandMenu.headings.actions'),
  }

  return (
    <CommandDialog
      modal
      open={open}
      onOpenChange={onOpenChange}
      className='max-w-[calc(100%-2rem)] overflow-hidden rounded-[32px] border-none p-0 shadow-2xl sm:max-w-4xl [&_[data-slot=command-input-wrapper]]:h-16 [&_[data-slot=command-input-wrapper]]:px-6 [&_[data-slot=command-input-wrapper]_svg]:size-5'
    >
      <div className='pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent' />

      <div className='relative border-b border-dashed'>
        <CommandInput
          placeholder={t('commandMenu.placeholder')}
          className='h-16 border-none bg-transparent text-base focus:ring-0'
          value={searchValue}
          onValueChange={onSearchChange}
        />
        {isSearching && (
          <div className='absolute right-4 top-1/2 -translate-y-1/2'>
            <div className='size-5 animate-spin rounded-full border-2 border-primary/20 border-t-primary' />
          </div>
        )}
      </div>

      <CommandList className='max-h-none overflow-hidden'>
        <ScrollArea>
          <div className='h-[480px]'>
            <CommandEmpty className='py-24 text-sm italic text-muted-foreground/50'>
              {t('commandMenu.empty')}
            </CommandEmpty>

            <div className='grid min-h-[480px] grid-cols-1 divide-x divide-dashed divide-muted md:grid-cols-3'>
              <div className='space-y-2 p-2'>
                {groupedItems.navigation && (
                  <CommandGroup
                    heading={categoryLabels.navigation}
                    className='[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-3 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-black [&_[cmdk-group-heading]]:italic [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.2em] [&_[cmdk-group-heading]]:text-primary/60'
                  >
                    {groupedItems.navigation.map((item) => (
                      <SearchListItem key={item.id} item={item} onSelect={() => onItemSelect(item.href)} />
                    ))}
                  </CommandGroup>
                )}
              </div>

              <div className='space-y-2 bg-muted/5 p-2'>
                {groupedItems.modules && (
                  <CommandGroup
                    heading={categoryLabels.modules}
                    className='[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-3 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-black [&_[cmdk-group-heading]]:italic [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.2em] [&_[cmdk-group-heading]]:text-indigo-600/70'
                  >
                    {groupedItems.modules.map((item) => (
                      <SearchListItem key={item.id} item={item} onSelect={() => onItemSelect(item.href)} />
                    ))}
                  </CommandGroup>
                )}

                {asyncResults.length > 0 && (
                  <CommandGroup
                    heading={t('commandMenu.headings.data')}
                    className='[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-3 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-black [&_[cmdk-group-heading]]:italic [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.2em] [&_[cmdk-group-heading]]:text-emerald-600/70'
                  >
                    {asyncResults.map((item) => (
                      <SearchListItem
                        key={item.id}
                        item={item}
                        onSelect={() => onItemSelect(item.href)}
                        isData
                      />
                    ))}
                  </CommandGroup>
                )}
              </div>

              <div className='space-y-2 p-2'>
                {groupedItems.actions && (
                  <CommandGroup
                    heading={categoryLabels.actions}
                    className='[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-3 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-black [&_[cmdk-group-heading]]:italic [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.2em] [&_[cmdk-group-heading]]:text-amber-600/70'
                  >
                    {groupedItems.actions.map((item) => (
                      <SearchListItem
                        key={item.id}
                        item={item}
                        onSelect={() => onItemSelect(item.href)}
                        isAction
                      />
                    ))}
                  </CommandGroup>
                )}

                <CommandSeparator className='my-2 border-dashed' />

                <CommandGroup
                  heading={t('commandMenu.headings.system')}
                  className='[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-3 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-black [&_[cmdk-group-heading]]:italic [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.2em] [&_[cmdk-group-heading]]:text-primary/40'
                >
                  <ThemeItem
                    icon={Sun}
                    label={t('common.theme.light')}
                    onSelect={() => onThemeSelect('light')}
                  />
                  <ThemeItem
                    icon={Moon}
                    label={t('common.theme.dark')}
                    onSelect={() => onThemeSelect('dark')}
                  />
                  <ThemeItem
                    icon={Laptop}
                    label={t('common.theme.system')}
                    onSelect={() => onThemeSelect('system')}
                  />
                </CommandGroup>
              </div>
            </div>
          </div>
        </ScrollArea>
      </CommandList>

      <div className='flex items-center justify-between border-t border-dashed bg-muted/20 px-6 p-3'>
        <div className='flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 italic'>
          <span className='flex items-center gap-1.5'>
            <kbd className='rounded border border-dashed bg-background px-1.5 py-0.5 font-mono text-[8px]'>
              Enter
            </kbd>
            {t('commandMenu.footer.enter')}
          </span>
          <span className='flex items-center gap-1.5'>
            <kbd className='rounded border border-dashed bg-background px-1.5 py-0.5 font-mono text-[8px]'>
              ↑↓
            </kbd>
            {t('commandMenu.footer.arrows')}
          </span>
          <span className='flex items-center gap-1.5'>
            <kbd className='rounded border border-dashed bg-background px-1.5 py-0.5 font-mono text-[8px]'>
              Tab
            </kbd>
            {t('commandMenu.footer.tab')}
          </span>
        </div>
        <div className='text-[10px] font-black uppercase tracking-[0.2em] text-primary/30 italic'>
          XDFC Intelligent Search v2.1
        </div>
      </div>
    </CommandDialog>
  )
}

function SearchListItem({
  item,
  onSelect,
  isAction = false,
  isData = false,
}: {
  item: SearchItem
  onSelect: () => void
  isAction?: boolean
  isData?: boolean
}) {
  return (
    <CommandItem
      value={`${item.title} ${item.parentTitle || ''} ${item.keywords?.join(' ') || ''} ${item.pinyin || ''}`}
      className='group flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-all data-[selected=true]:scale-[1.01] data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary'
      onSelect={onSelect}
    >
      <div
        className={cn(
          'flex size-8 items-center justify-center rounded-lg border border-dashed transition-colors',
          isAction
            ? 'border-amber-500/20 bg-amber-500/5 group-data-[selected=true]:border-amber-500/40'
            : isData
              ? 'border-emerald-500/20 bg-emerald-500/5 group-data-[selected=true]:border-emerald-500/40'
              : 'border-muted-foreground/10 bg-muted/30 group-data-[selected=true]:border-primary/20'
        )}
      >
        {item.icon ? (
          <item.icon
            className={cn(
              'size-4',
              isAction
                ? 'text-amber-600'
                : isData
                  ? 'text-emerald-600'
                  : 'text-muted-foreground/80'
            )}
          />
        ) : (
          <ArrowRight className='size-3 text-muted-foreground/80' />
        )}
      </div>
      <div className='flex flex-1 items-center justify-between overflow-hidden'>
        <div className='flex flex-col truncate'>
          <span className='truncate text-sm font-bold tracking-tight'>{item.title}</span>
          {item.parentTitle && (
            <span className='truncate text-[9px] font-black uppercase tracking-widest text-muted-foreground/50'>
              {item.parentTitle}
            </span>
          )}
        </div>
      </div>
    </CommandItem>
  )
}

function ThemeItem({
  icon: Icon,
  label,
  onSelect,
}: {
  icon: typeof Sun
  label: string
  onSelect: () => void
}) {
  return (
    <CommandItem
      onSelect={onSelect}
      className='group flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 transition-all data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary'
    >
      <div className='flex size-7 items-center justify-center rounded-lg border border-dashed border-muted-foreground/10 bg-muted/30 group-data-[selected=true]:border-primary/20'>
        <Icon className='size-3.5 text-muted-foreground/80' />
      </div>
      <span className='text-xs font-bold tracking-tight'>{label}</span>
    </CommandItem>
  )
}
