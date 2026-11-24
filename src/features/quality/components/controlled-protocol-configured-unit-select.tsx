import { useLanguage } from '@/context/language-provider'
import { ConfiguredActiveUnitSelect } from '@/features/basic-settings/components/configured-active-unit-select'

export function ControlledProtocolConfiguredUnitSelect(
  props: Omit<React.ComponentProps<typeof ConfiguredActiveUnitSelect>, 'labels'>
) {
  const { t } = useLanguage()
  return (
    <ConfiguredActiveUnitSelect
      {...props}
      labels={{
        placeholder: t(
          'quality.standards.dialog.controlledProtocol.placeholders.unit'
        ),
        empty: t('quality.standards.dialog.controlledProtocol.empty.units'),
        loadFailed: t(
          'quality.standards.dialog.controlledProtocol.validation.unitsLoadFailed'
        ),
        unavailable: t(
          'quality.standards.dialog.controlledProtocol.validation.unitUnavailable'
        ),
      }}
    />
  )
}
