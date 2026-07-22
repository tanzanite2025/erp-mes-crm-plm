import { useMemo, useState } from 'react'
import { ExternalLink, RefreshCw, Search } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { VehiclePhotoDialog } from '@/features/logistics-config/vehicle-specs/components/vehicle-photo-dialog'
import { VehicleSpecSummaryCard } from '@/features/logistics-config/vehicle-specs/components/vehicle-spec-summary-card'
import {
  VehicleSpecsEmptyState,
  VehicleSpecsLoadingState,
} from '@/features/logistics-config/vehicle-specs/components/vehicle-specs-query-states'
import { filterVehicleSpecsByKeyword } from '@/features/logistics-config/vehicle-specs/data/vehicle-specs-search'
import { useVehiclePhotoDialogState } from '@/features/logistics-config/vehicle-specs/hooks/use-vehicle-photo-dialog-state'
import { useVehicleSpecsQuery } from '@/features/logistics-config/vehicle-specs/hooks/use-vehicle-specs-query'
import { ConfigErrorPanel } from '@/features/logistics-config/vehicle-loading/components/config-error-panel'

const VEHICLE_SPECS_LIBRARY_PATH = '/logistics-config/vehicle-specs-library'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function openVehicleSpecsLibraryPage() {
  window.open(VEHICLE_SPECS_LIBRARY_PATH, '_blank', 'noopener,noreferrer')
}

export function ShippingVehicleSpecsCatalogDialog({
  open,
  onOpenChange,
}: Props) {
  const { t } = useLanguage()
  const [search, setSearch] = useState('')
  const { vehicleSpecs, isLoadingSpecs, specsError, reload } =
    useVehicleSpecsQuery({ enabled: open })
  const {
    photoDialogOpen,
    setPhotoDialogOpen,
    selectedVehicle,
    selectedPhotoEntry,
    openVehiclePhotos,
  } = useVehiclePhotoDialogState()

  const filteredVehicleSpecs = useMemo(
    () => filterVehicleSpecsByKeyword(vehicleSpecs, search),
    [search, vehicleSpecs]
  )

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className='flex h-[82vh] w-[96vw] max-w-[1280px] flex-col gap-0 overflow-hidden rounded-[28px] border-dashed border-border/60 bg-background p-0 shadow-2xl'>
          <DialogHeader className='border-b border-dashed border-border/60 px-5 py-4 text-left'>
            <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
              <div className='min-w-0'>
                <DialogTitle className='text-[18px] font-black tracking-tight'>
                  {t('trading.shippingManagement.vehicleMatch.catalog.title')}
                </DialogTitle>
                <DialogDescription className='mt-1 text-[12px] leading-5'>
                  {t(
                    'trading.shippingManagement.vehicleMatch.catalog.description'
                  )}
                </DialogDescription>
              </div>
              <div className='flex flex-wrap gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-9 gap-2 rounded-xl border-dashed px-3 text-[10px] font-black tracking-[0.16em] uppercase'
                  onClick={() => void reload()}
                >
                  <RefreshCw className='size-4' />
                  {t('common.actions.refresh')}
                </Button>
                <Button
                  type='button'
                  size='sm'
                  className='h-9 gap-2 rounded-xl px-3 text-[10px] font-black tracking-[0.16em] uppercase'
                  onClick={openVehicleSpecsLibraryPage}
                >
                  <ExternalLink className='size-4' />
                  {t(
                    'trading.shippingManagement.vehicleMatch.catalog.openFullLibrary'
                  )}
                </Button>
              </div>
            </div>

            <div className='mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <div className='relative w-full max-w-xl'>
                <Search className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t(
                    'trading.shippingManagement.vehicleMatch.catalog.searchPlaceholder'
                  )}
                  className='h-10 rounded-xl border-border/70 bg-background pl-9 text-[13px]'
                />
              </div>
              <div className='uds-chip text-[10px] whitespace-nowrap'>
                {t(
                  'trading.shippingManagement.vehicleMatch.catalog.visibleCount',
                  {
                    visible: filteredVehicleSpecs.length,
                    total: vehicleSpecs.length,
                  }
                )}
              </div>
            </div>
          </DialogHeader>

          <div className='min-h-0 flex-1 bg-muted/5 p-4'>
            {specsError ? (
              <ConfigErrorPanel
                title={t(
                  'trading.shippingManagement.vehicleMatch.catalog.loadFailed'
                )}
                error={specsError}
                retryLabel={t('common.actions.retry')}
                onRetry={() => void reload()}
              />
            ) : null}

            {!specsError && isLoadingSpecs ? (
              <VehicleSpecsLoadingState />
            ) : null}

            {!specsError && !isLoadingSpecs ? (
              <ScrollArea className='h-full rounded-[24px]'>
                {filteredVehicleSpecs.length === 0 ? (
                  <VehicleSpecsEmptyState search={search} />
                ) : (
                  <div className='grid grid-cols-1 gap-4 pb-2 xl:grid-cols-2'>
                    {filteredVehicleSpecs.map((spec) => (
                      <VehicleSpecSummaryCard
                        key={spec.id}
                        spec={spec}
                        onOpenPhotos={openVehiclePhotos}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            ) : null}
          </div>

          <DialogFooter className='border-t border-dashed border-border/60 px-5 py-4'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
            >
              {t('common.actions.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <VehiclePhotoDialog
        open={photoDialogOpen}
        onOpenChange={setPhotoDialogOpen}
        vehicle={selectedVehicle}
        photoEntry={selectedPhotoEntry}
      />
    </>
  )
}
