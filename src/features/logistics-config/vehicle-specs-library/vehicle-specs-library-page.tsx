import { useMemo, useState } from 'react'
import { VehiclePhotoDialog } from '../vehicle-specs/components/vehicle-photo-dialog'
import { filterVehicleSpecsByKeyword } from '../vehicle-specs/data/vehicle-specs-search'
import { useVehiclePhotoDialogState } from '../vehicle-specs/hooks/use-vehicle-photo-dialog-state'
import { useVehicleSpecsQuery } from '../vehicle-specs/hooks/use-vehicle-specs-query'
import { VehicleSpecsLibraryContent } from './components/vehicle-specs-library-content'
import { VehicleSpecsLibraryHeader } from './components/vehicle-specs-library-header'
import {
  VehicleSpecsLibraryErrorState,
  VehicleSpecsLibraryLoadingState,
} from './components/vehicle-specs-library-state'
import { VehicleSpecsLibraryToolbar } from './components/vehicle-specs-library-toolbar'

export function VehicleSpecsLibraryPage() {
  const [search, setSearch] = useState('')
  const { vehicleSpecs, isLoadingSpecs, specsError, reload } =
    useVehicleSpecsQuery()
  const {
    photoDialogOpen,
    setPhotoDialogOpen,
    selectedVehicle,
    selectedPhotoEntry,
    openVehiclePhotos,
  } = useVehiclePhotoDialogState()
  const filteredVehicleSpecs = useMemo(() => {
    return filterVehicleSpecsByKeyword(vehicleSpecs, search)
  }, [search, vehicleSpecs])

  return (
    <>
      <div className='flex animate-in flex-col gap-5 duration-700 fade-in'>
        <VehicleSpecsLibraryHeader />

        <div className='space-y-3 rounded-[28px] border border-dashed border-border/70 bg-muted/10 p-3 md:p-4'>
          <VehicleSpecsLibraryToolbar
            search={search}
            onSearchChange={setSearch}
            onRefresh={() => void reload()}
            totalCount={filteredVehicleSpecs.length}
          />

          {specsError ? (
            <VehicleSpecsLibraryErrorState
              message={specsError.message}
              onRetry={() => void reload()}
            />
          ) : null}

          {!specsError && isLoadingSpecs ? (
            <VehicleSpecsLibraryLoadingState />
          ) : null}

          {!specsError && !isLoadingSpecs ? (
            <VehicleSpecsLibraryContent
              vehicleSpecs={filteredVehicleSpecs}
              search={search}
              onOpenPhotos={openVehiclePhotos}
            />
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
