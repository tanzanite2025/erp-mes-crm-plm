import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUnitsQuery } from '@/features/basic-settings/hooks/use-units-query'

interface ControlledProtocolConfiguredUnitSelectProps {
  id: string
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  enabled?: boolean
}

export function ControlledProtocolConfiguredUnitSelect({
  id,
  value,
  onValueChange,
  disabled = false,
  enabled = true,
}: ControlledProtocolConfiguredUnitSelectProps) {
  const { t } = useLanguage()
  const { units, isLoading, error, refetch } = useUnitsQuery({ enabled })
  const activeUnits = units.filter((unit) => unit.status === 'active')
  const selectedUnit = units.find((unit) => unit.code === value)
  const hasUnavailableSelectedUnit =
    !isLoading &&
    !error &&
    Boolean(value) &&
    !activeUnits.some((unit) => unit.code === value)

  return (
    <div className='space-y-1'>
      <Select
        value={value}
        onValueChange={onValueChange}
        disabled={disabled || isLoading || Boolean(error)}
      >
        <SelectTrigger
          id={id}
          aria-invalid={!disabled && hasUnavailableSelectedUnit}
          className='h-9 w-full rounded-xl bg-background text-[11px]'
        >
          <SelectValue
            placeholder={t(
              'quality.standards.dialog.controlledProtocol.placeholders.unit'
            )}
          >
            {selectedUnit
              ? `${selectedUnit.name} (${selectedUnit.code})`
              : value || undefined}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {activeUnits.map((unit) => (
            <SelectItem key={unit.id} value={unit.code} className='text-[11px]'>
              {unit.name} ({unit.code})
            </SelectItem>
          ))}
          {activeUnits.length === 0 ? (
            <p className='px-3 py-2 text-[11px] text-muted-foreground'>
              {t('quality.standards.dialog.controlledProtocol.empty.units')}
            </p>
          ) : null}
        </SelectContent>
      </Select>
      {isLoading ? (
        <p className='text-[10px] text-muted-foreground'>
          {t('common.actions.loading')}
        </p>
      ) : error ? (
        <div className='text-[10px] text-destructive'>
          {t(
            'quality.standards.dialog.controlledProtocol.validation.unitsLoadFailed'
          )}
          <Button
            type='button'
            variant='link'
            size='sm'
            onClick={() => void refetch()}
            disabled={disabled}
            className='h-auto px-1 text-[10px]'
          >
            {t('common.actions.retry')}
          </Button>
        </div>
      ) : null}
      {!disabled && hasUnavailableSelectedUnit ? (
        <p className='text-[10px] text-destructive'>
          {t(
            'quality.standards.dialog.controlledProtocol.validation.unitUnavailable'
          )}
        </p>
      ) : null}
    </div>
  )
}
