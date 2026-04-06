import { Info } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'

export function TeamMgmt() {
  return <Placeholder pageKey='teamMgmt' />
}

export function NumberingMgmt() {
  return <Placeholder pageKey='numberingMgmt' />
}

export function PrintTemplateMgmt() {
  return <Placeholder pageKey='printTemplateMgmt' />
}

export function TemplateVarMgmt() {
  return <Placeholder pageKey='templateVarMgmt' />
}

export function FactoryMgmt() {
  return <Placeholder pageKey='factoryMgmt' />
}

export function LineMgmt() {
  return <Placeholder pageKey='lineMgmt' />
}

export function SectionMgmt() {
  return <Placeholder pageKey='sectionMgmt' />
}

export function GroupMgmt() {
  return <Placeholder pageKey='groupMgmt' />
}


export function RoutingMgmt() {
  return <Placeholder pageKey='routingMgmt' />
}

export function SpecialRoutingMgmt() {
  return <Placeholder pageKey='specialRoutingMgmt' />
}

export function WarehouseMgmt() {
  return <Placeholder pageKey='warehouseMgmt' />
}

export function BinLocationMgmt() {
  return <Placeholder pageKey='binLocationMgmt' />
}

function Placeholder({
  pageKey,
}: {
  pageKey:
    | 'teamMgmt'
    | 'numberingMgmt'
    | 'printTemplateMgmt'
    | 'templateVarMgmt'
    | 'factoryMgmt'
    | 'lineMgmt'
    | 'sectionMgmt'
    | 'groupMgmt'
    | 'routingMgmt'
    | 'specialRoutingMgmt'
    | 'warehouseMgmt'
    | 'binLocationMgmt'
}) {
  const { t } = useLanguage()

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <div className='flex flex-col gap-1 rounded-[32px] border border-dashed bg-muted/5 p-6'>
        <div className='flex items-center gap-2 text-primary'>
          <Info className='h-4 w-4' />
          <h3 className='text-sm font-black tracking-tighter uppercase'>
            {t(`basicSettings.placeholders.pages.${pageKey}`)}
          </h3>
        </div>
        <p className='text-[9px] font-semibold uppercase tracking-widest text-muted-foreground opacity-60'>
          {t('basicSettings.placeholders.moduleInitialized')}
        </p>
      </div>

      <div className='flex h-[400px] flex-col items-center justify-center rounded-[32px] border border-dashed bg-muted/5 text-muted-foreground/20 italic'>
        <div className='pulse-animation mb-6 size-16 rounded-full border-4 border-dashed border-current opacity-10' />
        <p className='text-[11px] font-black uppercase tracking-widest'>
          {t('basicSettings.placeholders.dataEngineLinking')}
        </p>
      </div>
    </div>
  )
}
