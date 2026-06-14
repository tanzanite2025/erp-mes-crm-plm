import { Link } from '@tanstack/react-router'
import type { TranslationKey } from '@/locales'
import { Blocks, Lock, Smartphone, Workflow } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { canOpenRouteEntryNonBlocking } from '@/features/authz/guards/route-entry-access'
import { getScanModuleCatalogItem } from '../registry/scan-module-catalog'
import { scanPluginRegistry } from '../registry/scan-plugin-registry'

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

function getModeLabel(t: TranslateFn, mode: 'submit' | 'view') {
  return mode === 'submit'
    ? t('scanPlatform.panel.modes.submit')
    : t('scanPlatform.panel.modes.view')
}

function getHostKindLabel(
  t: TranslateFn,
  hostKind: 'embedded-dialog' | 'standalone-page'
) {
  return hostKind === 'embedded-dialog'
    ? t('scanPlatform.panel.hostKinds.embeddedDialog')
    : t('scanPlatform.panel.hostKinds.standalonePage')
}

function getStatusClass(status: 'ready' | 'skeleton') {
  return status === 'ready'
    ? 'bg-emerald-500/10 text-emerald-700 border-none'
    : 'bg-amber-500/10 text-amber-700 border-none'
}

function getModuleCopy(t: TranslateFn, pluginCode: string) {
  switch (pluginCode) {
    case 'logistics-inbound':
      return {
        name: t('scanPlatform.modules.logisticsInbound.name'),
        description: t('scanPlatform.modules.logisticsInbound.description'),
        hostLabel: t('scanPlatform.modules.logisticsInbound.hostLabel'),
        statusLabel: t('scanPlatform.modules.logisticsInbound.statusLabel'),
        targetLabel: t('scanPlatform.modules.logisticsInbound.targetLabel'),
        openLabel: t('scanPlatform.modules.logisticsInbound.openLabel'),
        notes: [
          t('scanPlatform.modules.logisticsInbound.notes.0'),
          t('scanPlatform.modules.logisticsInbound.notes.1'),
        ],
      }
    case 'wheel-trace':
      return {
        name: t('scanPlatform.modules.wheelTrace.name'),
        description: t('scanPlatform.modules.wheelTrace.description'),
        hostLabel: t('scanPlatform.modules.wheelTrace.hostLabel'),
        statusLabel: t('scanPlatform.modules.wheelTrace.statusLabel'),
        targetLabel: t('scanPlatform.modules.wheelTrace.targetLabel'),
        openLabel: t('scanPlatform.modules.wheelTrace.openLabel'),
        addToHomeScreenLabel: t(
          'scanPlatform.modules.wheelTrace.addToHomeScreenLabel'
        ),
        notes: [
          t('scanPlatform.modules.wheelTrace.notes.0'),
          t('scanPlatform.modules.wheelTrace.notes.1'),
        ],
      }
    default:
      return null
  }
}

export function ScanPlatformModulePanel() {
  const { t } = useLanguage()
  const user = useAuthStore((state) => state.user)
  const modules = scanPluginRegistry
    .map((plugin) => {
      const catalog = getScanModuleCatalogItem(plugin.code)
      if (!catalog) return null

      return {
        plugin,
        catalog,
        canOpenPath: canOpenRouteEntryNonBlocking(user, catalog.openPath),
        canInstallPath: canOpenRouteEntryNonBlocking(user, catalog.installPath),
      }
    })
    .filter(
      (
        item
      ): item is {
        plugin: (typeof scanPluginRegistry)[number]
        catalog: NonNullable<ReturnType<typeof getScanModuleCatalogItem>>
        canOpenPath: boolean
        canInstallPath: boolean
      } => item !== null
    )

  return (
    <div className='rounded-[28px] border border-dashed border-primary/20 bg-primary/5 p-5 md:p-6'>
      <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
        <div className='space-y-1.5'>
          <div className='inline-flex items-center gap-2 text-primary'>
            <Blocks className='size-4' />
            <h3 className='text-sm font-black tracking-tight uppercase md:text-base'>
              {t('scanPlatform.panel.title')}
            </h3>
          </div>
          <p className='text-[11px] leading-relaxed text-muted-foreground/80'>
            {t('scanPlatform.panel.description')}
          </p>
        </div>

        <Badge className='self-start border-none bg-slate-900 text-white'>
          {t('scanPlatform.panel.moduleCount', { count: modules.length })}
        </Badge>
      </div>

      <div className='mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2'>
        {modules.map(({ plugin, catalog, canOpenPath, canInstallPath }) => {
          const ModuleIcon = catalog.icon
          const moduleCopy = getModuleCopy(t, plugin.code)

          return (
            <Card
              key={plugin.code}
              className='rounded-[24px] border-dashed border-muted/50 bg-background/90 shadow-inner'
            >
              <CardHeader className='pb-4'>
                <div className='flex items-start justify-between gap-3'>
                  <div className='space-y-1.5'>
                    <CardTitle className='flex items-center gap-2 text-sm font-black tracking-tight md:text-base'>
                      <ModuleIcon className='size-4 text-primary' />
                      {moduleCopy?.name ?? plugin.name}
                    </CardTitle>
                    <CardDescription className='text-[10px] font-medium text-muted-foreground/70 md:text-[11px]'>
                      {moduleCopy?.description ?? plugin.description}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusClass(catalog.status)}>
                    {moduleCopy?.statusLabel ?? catalog.statusLabel}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className='space-y-4'>
                <div className='grid grid-cols-1 gap-3 text-[11px] sm:grid-cols-2'>
                  <div className='rounded-2xl border border-dashed border-muted/50 bg-muted/10 p-3'>
                    <div className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                      {t('scanPlatform.panel.host')}
                    </div>
                    <div className='mt-1 font-black text-foreground'>
                      {moduleCopy?.hostLabel ?? catalog.hostLabel}
                    </div>
                    <div className='mt-1 text-muted-foreground/70'>
                      {getHostKindLabel(t, catalog.hostKind)}
                    </div>
                  </div>

                  <div className='rounded-2xl border border-dashed border-muted/50 bg-muted/10 p-3'>
                    <div className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                      {t('scanPlatform.panel.mode')}
                    </div>
                    <div className='mt-1 font-black text-foreground'>
                      {getModeLabel(t, plugin.mode)}
                    </div>
                    <div className='mt-1 text-muted-foreground/70'>
                      {moduleCopy?.targetLabel ?? catalog.targetLabel}
                    </div>
                  </div>
                </div>

                <div className='grid grid-cols-1 gap-3 text-[11px] sm:grid-cols-2'>
                  <div className='rounded-2xl border border-dashed border-muted/50 bg-muted/10 p-3'>
                    <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                      <Workflow className='size-3.5' />
                      {t('scanPlatform.panel.entryPath')}
                    </div>
                    <div className='mt-1 font-mono text-xs text-foreground'>
                      {plugin.entryPath}
                    </div>
                  </div>

                  <div className='rounded-2xl border border-dashed border-muted/50 bg-muted/10 p-3'>
                    <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                      <Lock className='size-3.5' />
                      {t('scanPlatform.panel.permission')}
                    </div>
                    <div className='mt-1 font-mono text-[10px] break-all text-foreground'>
                      {plugin.permissions.page}
                    </div>
                    <div className='mt-1 font-mono text-[10px] break-all text-muted-foreground/80'>
                      {plugin.permissions.action ||
                        t('scanPlatform.panel.viewOnly')}
                    </div>
                  </div>
                </div>

                <div className='flex flex-wrap gap-2'>
                  {catalog.openPath && canOpenPath ? (
                    <Button
                      asChild
                      size='sm'
                      className='gap-2 rounded-full text-[10px] font-black'
                    >
                      <Link to={catalog.openPath}>
                        <Workflow className='size-3.5' />
                        {moduleCopy?.openLabel ?? catalog.openLabel}
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      size='sm'
                      disabled
                      className='gap-2 rounded-full text-[10px] font-black'
                    >
                      <Workflow className='size-3.5' />
                      {moduleCopy?.openLabel ?? catalog.openLabel}
                    </Button>
                  )}

                  {catalog.supportsAddToHomeScreen ? (
                    catalog.installPath && canInstallPath ? (
                      <Button
                        asChild
                        size='sm'
                        variant='outline'
                        className='gap-2 rounded-full text-[10px] font-black'
                      >
                        <Link to={catalog.installPath}>
                          <Smartphone className='size-3.5' />
                          {moduleCopy?.addToHomeScreenLabel ??
                            catalog.addToHomeScreenLabel ??
                            t('scanPlatform.panel.addToHomeScreenFallback')}
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        size='sm'
                        variant='outline'
                        disabled
                        className='gap-2 rounded-full text-[10px] font-black'
                      >
                        <Smartphone className='size-3.5' />
                        {moduleCopy?.addToHomeScreenLabel ??
                          catalog.addToHomeScreenLabel ??
                          t('scanPlatform.panel.addToHomeScreenFallback')}
                      </Button>
                    )
                  ) : null}
                </div>

                <div className='space-y-2'>
                  {(moduleCopy?.notes ?? catalog.notes).map((note) => (
                    <div
                      key={note}
                      className='rounded-2xl border border-dashed border-primary/20 bg-primary/5 px-3 py-2 text-[11px] leading-relaxed text-primary/80'
                    >
                      {note}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
