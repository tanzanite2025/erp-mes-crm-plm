import { useState } from 'react'
import { VehiclePhotoDialog } from '../vehicle-loading/components/vehicle-photo-dialog'
import { useVehiclePhotoDialogState } from '../vehicle-loading/hooks/use-vehicle-photo-dialog-state'
import { useVehicleSpecsQuery } from '../vehicle-loading/hooks/use-vehicle-specs-query'
import { VehicleSpecsLibraryContent } from './components/vehicle-specs-library-content'
import { VehicleSpecsLibraryErrorState, VehicleSpecsLibraryLoadingState } from './components/vehicle-specs-library-state'
import { VehicleSpecsLibraryHeader } from './components/vehicle-specs-library-header'
import { VehicleSpecsLibraryToolbar } from './components/vehicle-specs-library-toolbar'

export function VehicleSpecsLibraryPage() {
  const [search, setSearch] = useState('')
  const { vehicleSpecs, isLoadingSpecs, specsError, reload } = useVehicleSpecsQuery()
  const {
    photoDialogOpen,
    setPhotoDialogOpen,
    selectedVehicle,
    selectedPhotoEntry,
    openVehiclePhotos,
  } = useVehiclePhotoDialogState()

  return (
    <>
      <div className='flex flex-col gap-5 animate-in fade-in duration-700'>
        <VehicleSpecsLibraryHeader />

        <div className='space-y-3 rounded-[28px] border border-dashed border-border/70 bg-muted/10 p-3 md:p-4'>
          <VehicleSpecsLibraryToolbar
            search={search}
            onSearchChange={setSearch}
            onRefresh={() => void reload()}
            totalCount={vehicleSpecs.length}
          />

          {specsError ? (
            <VehicleSpecsLibraryErrorState
              message={specsError.message}
              onRetry={() => void reload()}
            />
          ) : null}

          {!specsError && isLoadingSpecs ? <VehicleSpecsLibraryLoadingState /> : null}

          {!specsError && !isLoadingSpecs ? (
            <VehicleSpecsLibraryContent vehicleSpecs={vehicleSpecs} onOpenPhotos={openVehiclePhotos} />
          ) : null}
        </div>
      </div>

      <VehiclePhotoDialog
        open={photoDialogOpen}
        onOpenChange={setPhotoDialogOpen}
        vehicle={selectedVehicle}
        photoEntry={selectedPhotoEntry}
      />
    </>
  )
}
