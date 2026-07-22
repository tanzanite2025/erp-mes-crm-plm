import { type SVGProps } from 'react'
import { Item, Root as Radio } from '@radix-ui/react-radio-group'
import { CircleCheck, RotateCcw, Settings } from 'lucide-react'
import { IconDir } from '@/assets/custom/icon-dir'
import { IconLayoutDefault } from '@/assets/custom/icon-layout-default'
import { IconLayoutFull } from '@/assets/custom/icon-layout-full'
import { IconSidebarFloating } from '@/assets/custom/icon-sidebar-floating'
import { IconSidebarInset } from '@/assets/custom/icon-sidebar-inset'
import { IconSidebarSidebar } from '@/assets/custom/icon-sidebar-sidebar'
import { IconThemeDark } from '@/assets/custom/icon-theme-dark'
import { IconThemeLight } from '@/assets/custom/icon-theme-light'
import { IconThemeSystem } from '@/assets/custom/icon-theme-system'
import { cn } from '@/lib/utils'
import { useDirection } from '@/context/direction-provider'
import { useLanguage } from '@/context/language-provider'
import { type Collapsible, useLayout } from '@/context/layout-provider'
import { useTheme } from '@/context/theme-provider'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useSidebar } from './ui/sidebar'

export function ConfigDrawer() {
  const { t } = useLanguage()
  const { setOpen } = useSidebar()
  const { resetDir } = useDirection()
  const { resetTheme } = useTheme()
  const { resetLayout } = useLayout()

  const handleReset = () => {
    setOpen(true)
    resetDir()
    resetTheme()
    resetLayout()
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          size='icon'
          variant='ghost'
          aria-label={t('configDrawer.triggerLabel')}
          aria-describedby='config-drawer-description'
          className='rounded-full'
        >
          <Settings aria-hidden='true' />
        </Button>
      </SheetTrigger>
      <SheetContent className='flex w-[350px] flex-col overflow-hidden sm:w-[450px]'>
        <SheetHeader className='pb-0 text-start'>
          <SheetTitle>{t('configDrawer.title')}</SheetTitle>
          <SheetDescription id='config-drawer-description'>
            {t('configDrawer.description')}
          </SheetDescription>
        </SheetHeader>
        <div className='flex-1 space-y-6 overflow-y-auto px-1 py-1'>
          <ThemeConfig />
          <SidebarConfig />
          <LayoutConfig />
          <DirConfig />
        </div>
        <SheetFooter className='gap-2 border-t pt-4'>
          <Button
            variant='destructive'
            size='sm'
            onClick={handleReset}
            aria-label={t('configDrawer.resetAriaLabel')}
          >
            {t('configDrawer.resetAll')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function SectionTitle({
  title,
  showReset = false,
  onReset,
  className,
}: {
  title: string
  showReset?: boolean
  onReset?: () => void
  className?: string
}) {
  return (
    <div
      className={cn(
        'mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground',
        className
      )}
    >
      {title}
      {showReset && onReset && (
        <Button
          size='icon'
          variant='secondary'
          className='size-4 rounded-full'
          onClick={onReset}
        >
          <RotateCcw className='size-3' />
        </Button>
      )}
    </div>
  )
}

function RadioGroupItem({
  item,
  isTheme = false,
}: {
  item: {
    value: string
    label: string
    icon: (props: SVGProps<SVGSVGElement>) => React.ReactElement
  }
  isTheme?: boolean
}) {
  return (
    <Item
      value={item.value}
      className={cn('group outline-none', 'transition duration-200 ease-in')}
      aria-label={item.label}
      aria-describedby={`${item.value}-description`}
    >
      <div
        className={cn(
          'relative rounded-[6px] ring-[1px] ring-border',
          'group-data-[state=checked]:shadow-2xl group-data-[state=checked]:ring-primary',
          'group-focus-visible:ring-2'
        )}
        role='img'
        aria-hidden='false'
        aria-label={item.label}
      >
        <CircleCheck
          className={cn(
            'size-6 fill-primary stroke-white',
            'group-data-[state=unchecked]:hidden',
            'absolute top-0 right-0 translate-x-1/2 -translate-y-1/2'
          )}
          aria-hidden='true'
        />
        <item.icon
          className={cn(
            !isTheme &&
              'fill-primary stroke-primary group-data-[state=unchecked]:fill-muted-foreground group-data-[state=unchecked]:stroke-muted-foreground'
          )}
          aria-hidden='true'
        />
      </div>
      <div
        className='mt-1 text-xs'
        id={`${item.value}-description`}
        aria-live='polite'
      >
        {item.label}
      </div>
    </Item>
  )
}

function ThemeConfig() {
  const { t } = useLanguage()
  const { defaultTheme, theme, setTheme } = useTheme()

  return (
    <div>
      <SectionTitle
        title={t('configDrawer.sections.theme')}
        showReset={theme !== defaultTheme}
        onReset={() => setTheme(defaultTheme)}
      />
      <Radio
        value={theme}
        onValueChange={setTheme}
        className='grid w-full max-w-md grid-cols-3 gap-4'
        aria-label={t('configDrawer.sections.theme')}
        aria-describedby='theme-description'
      >
        {[
          {
            value: 'system',
            label: t('common.theme.system'),
            icon: IconThemeSystem,
          },
          {
            value: 'light',
            label: t('common.theme.light'),
            icon: IconThemeLight,
          },
          { value: 'dark', label: t('common.theme.dark'), icon: IconThemeDark },
        ].map((item) => (
          <RadioGroupItem key={item.value} item={item} isTheme />
        ))}
      </Radio>
      <div id='theme-description' className='sr-only'>
        {t('configDrawer.themeDescription')}
      </div>
    </div>
  )
}

function SidebarConfig() {
  const { t } = useLanguage()
  const { defaultVariant, variant, setVariant } = useLayout()

  return (
    <div className='max-md:hidden'>
      <SectionTitle
        title={t('configDrawer.sections.sidebar')}
        showReset={defaultVariant !== variant}
        onReset={() => setVariant(defaultVariant)}
      />
      <Radio
        value={variant}
        onValueChange={setVariant}
        className='grid w-full max-w-md grid-cols-3 gap-4'
        aria-label={t('configDrawer.sections.sidebar')}
        aria-describedby='sidebar-description'
      >
        {[
          {
            value: 'inset',
            label: t('configDrawer.sidebarOptions.inset'),
            icon: IconSidebarInset,
          },
          {
            value: 'floating',
            label: t('configDrawer.sidebarOptions.floating'),
            icon: IconSidebarFloating,
          },
          {
            value: 'sidebar',
            label: t('configDrawer.sidebarOptions.sidebar'),
            icon: IconSidebarSidebar,
          },
        ].map((item) => (
          <RadioGroupItem key={item.value} item={item} />
        ))}
      </Radio>
      <div id='sidebar-description' className='sr-only'>
        {t('configDrawer.sidebarDescription')}
      </div>
    </div>
  )
}

function LayoutConfig() {
  const { t } = useLanguage()
  const { open, setOpen } = useSidebar()
  const { defaultCollapsible, collapsible, setCollapsible } = useLayout()

  const radioState = open ? 'default' : collapsible

  return (
    <div className='max-md:hidden'>
      <SectionTitle
        title={t('configDrawer.sections.layout')}
        showReset={radioState !== 'default'}
        onReset={() => {
          setOpen(true)
          setCollapsible(defaultCollapsible)
        }}
      />
      <Radio
        value={radioState}
        onValueChange={(value) => {
          if (value === 'default') {
            setOpen(true)
            return
          }
          setOpen(false)
          setCollapsible(value as Collapsible)
        }}
        className='grid w-full max-w-md grid-cols-2 gap-4'
        aria-label={t('configDrawer.sections.layout')}
        aria-describedby='layout-description'
      >
        {[
          {
            value: 'default',
            label: t('configDrawer.layoutOptions.default'),
            icon: IconLayoutDefault,
          },
          {
            value: 'offcanvas',
            label: t('configDrawer.layoutOptions.fullLayout'),
            icon: IconLayoutFull,
          },
        ].map((item) => (
          <RadioGroupItem key={item.value} item={item} />
        ))}
      </Radio>
      <div id='layout-description' className='sr-only'>
        {t('configDrawer.layoutDescription')}
      </div>
    </div>
  )
}

function DirConfig() {
  const { t } = useLanguage()
  const { defaultDir, dir, setDir } = useDirection()

  return (
    <div>
      <SectionTitle
        title={t('configDrawer.sections.direction')}
        showReset={defaultDir !== dir}
        onReset={() => setDir(defaultDir)}
      />
      <Radio
        value={dir}
        onValueChange={setDir}
        className='grid w-full max-w-md grid-cols-2 gap-4'
        aria-label={t('configDrawer.sections.direction')}
        aria-describedby='direction-description'
      >
        {[
          {
            value: 'ltr',
            label: t('configDrawer.directionOptions.ltr'),
            icon: (props: SVGProps<SVGSVGElement>) => (
              <IconDir dir='ltr' {...props} />
            ),
          },
          {
            value: 'rtl',
            label: t('configDrawer.directionOptions.rtl'),
            icon: (props: SVGProps<SVGSVGElement>) => (
              <IconDir dir='rtl' {...props} />
            ),
          },
        ].map((item) => (
          <RadioGroupItem key={item.value} item={item} />
        ))}
      </Radio>
      <div id='direction-description' className='sr-only'>
        {t('configDrawer.directionDescription')}
      </div>
    </div>
  )
}
