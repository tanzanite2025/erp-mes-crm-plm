import { PackagingProfileFormDialog } from '@/features/logistics-config/components/packaging-profile-form-dialog'
import type { usePackagingProfileFormController } from '@/features/logistics-config/hooks/use-packaging-profile-form-controller'

interface SalesOrderPackagingProfileDialogBridgeProps {
  formController: ReturnType<typeof usePackagingProfileFormController>
}

export function SalesOrderPackagingProfileDialogBridge({
  formController,
}: SalesOrderPackagingProfileDialogBridgeProps) {
  return (
    <PackagingProfileFormDialog
      open={formController.open}
      draft={formController.draft}
      products={formController.products}
      packagingMaterials={formController.packagingMaterials}
      packagingMaterialOptions={formController.packagingMaterialOptions}
      dimensionUnits={formController.dimensionUnits}
      weightUnits={formController.weightUnits}
      quantityUnits={formController.quantityUnits}
      resolvedDimensionUnitCode={formController.resolvedDimensionUnitCode}
      resolvedWeightUnitCode={formController.resolvedWeightUnitCode}
      resolvedCapacityUnitCode={formController.resolvedCapacityUnitCode}
      selectedPackagingMaterialId={formController.selectedPackagingMaterialId}
      selectedProduct={formController.selectedProduct}
      computedVolume={formController.computedVolume}
      computedGrossWeight={formController.computedGrossWeight}
      savePending={formController.savePending}
      packagingMaterialsLoading={formController.packagingMaterialsLoading}
      onOpenChange={formController.setOpen}
      onDraftChange={formController.setDraft}
      onPackagingMaterialChange={formController.updateSelectedPackagingMaterial}
      onProductChange={formController.updateSelectedProduct}
      onDimensionUnitChange={(value) =>
        formController.setDraft((current) => ({
          ...current,
          dimensionUnitCode: value,
        }))
      }
      onWeightUnitChange={(value) =>
        formController.setDraft((current) => ({
          ...current,
          weightUnitCode: value,
        }))
      }
      onCapacityUnitChange={(value) =>
        formController.setDraft((current) => ({
          ...current,
          capacityUnitCode: value,
        }))
      }
      onSave={formController.handleSave}
    />
  )
}
